import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Song } from "../types";

export class SongLookup extends OpenAPIRoute {
	schema = {
		tags: ["Songs"],
		summary: "Lookup songs by fingerprints",
		security: [{ APIKey: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							fingerprints: z.array(z.object({
								hash: z.string(),
								offset: z.number(),
							})),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns matching songs sorted by confidence",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							results: z.array(z.object({
								song: Song,
								confidence: z.number(),
							})),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { fingerprints } = data.body;

		if (fingerprints.length === 0) {
			return c.json({ success: true, results: [] });
		}

		// Map hashes to their input offsets for later delta calculation
		const inputMap = new Map<string, number[]>();
		for (const f of fingerprints) {
			if (!inputMap.has(f.hash)) {
				inputMap.set(f.hash, []);
			}
			inputMap.get(f.hash)!.push(f.offset);
		}

		const uniqueHashes = Array.from(inputMap.keys());
		const CHUNK_SIZE = 100; // D1 limit for parameters
		const statements = [];

		for (let i = 0; i < uniqueHashes.length; i += CHUNK_SIZE) {
			const chunk = uniqueHashes.slice(i, i + CHUNK_SIZE);
			const placeholders = chunk.map(() => "?").join(", ");
			statements.push(
				c.env.DB.prepare(
					`SELECT song_id, hash, offset FROM fingerprints WHERE hash IN (${placeholders})`
				).bind(...chunk)
			);
		}

		const batchResults = await c.env.DB.batch(statements);
		const dbMatches = batchResults.flatMap((r) => r.results as unknown as { song_id: number; hash: string; offset: number }[]);

		// confidenceMap: song_id -> delta -> count
		const confidenceMap = new Map<number, Map<number, number>>();

		for (const match of dbMatches) {
			const queryOffsets = inputMap.get(match.hash);
			if (!queryOffsets) continue;

			if (!confidenceMap.has(match.song_id)) {
				confidenceMap.set(match.song_id, new Map());
			}
			const songDeltas = confidenceMap.get(match.song_id)!;

			for (const qOffset of queryOffsets) {
				const delta = match.offset - qOffset;
				songDeltas.set(delta, (songDeltas.get(delta) || 0) + 1);
			}
		}

		// Get the best confidence (max cluster size) for each song
		const songResults: { song_id: number; confidence: number }[] = [];
		for (const [songId, deltas] of confidenceMap.entries()) {
			let maxConfidence = 0;
			for (const count of deltas.values()) {
				if (count > maxConfidence) {
					maxConfidence = count;
				}
			}
			songResults.push({ song_id: songId, confidence: maxConfidence });
		}

		// Sort and take top 10
		songResults.sort((a, b) => b.confidence - a.confidence);
		const topMatches = songResults.slice(0, 10);

		if (topMatches.length === 0) {
			return c.json({ success: true, results: [] });
		}

		// Fetch song details for the top matches
		const songIds = topMatches.map((m) => m.song_id);
		const { results: songs } = await c.env.DB.prepare(
			`SELECT * FROM songs WHERE id IN (${songIds.map(() => "?").join(", ")})`
		)
			.bind(...songIds)
			.all();

		const songMap = new Map(songs.map((s: any) => [s.id, s]));

		return c.json({
			success: true,
			results: topMatches
				.map((m) => ({
					song: songMap.get(m.song_id),
					confidence: m.confidence,
				}))
				.filter((r) => r.song !== undefined),
		});
	}
}
