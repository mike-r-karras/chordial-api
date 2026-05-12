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

		// Build a query that calculates the delta (offset - query_offset)
		// and groups by song_id and delta to find the best match.
		// We use a temp table approach or just many unions if D1/SQLite allows.
		// For D1, we'll build the query with a lot of UNION ALL for the input fingerprints.
		
		const queryFingerprints = fingerprints.map(() => "SELECT ? AS q_hash, ? AS q_offset").join(" UNION ALL ");
		
		const sql = `
			WITH query_data AS (
				${queryFingerprints}
			),
			matches AS (
				SELECT 
					f.song_id, 
					(f.offset - q.q_offset) as delta,
					COUNT(*) as match_count
				FROM fingerprints f
				JOIN query_data q ON f.hash = q.q_hash
				GROUP BY f.song_id, delta
			),
			best_matches AS (
				SELECT song_id, MAX(match_count) as confidence
				FROM matches
				GROUP BY song_id
			)
			SELECT s.*, b.confidence
			FROM songs s
			JOIN best_matches b ON s.id = b.song_id
			ORDER BY b.confidence DESC
			LIMIT 10
		`;

		const bindings: any[] = [];
		fingerprints.forEach(f => {
			bindings.push(f.hash, f.offset);
		});

		const { results } = await c.env.DB.prepare(sql).bind(...bindings).all();

		return c.json({
			success: true,
			results: results.map((r: any) => {
				const { confidence, ...song } = r;
				return {
					song: song,
					confidence: confidence,
				};
			}),
		});
	}
}
