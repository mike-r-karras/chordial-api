import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../types";
import { hexToBytes } from "../utils/hex";

export class SongLookup extends OpenAPIRoute {
	schema = {
		tags: ["Songs"],
		summary: "Lookup songs by features",
		security: [{ APIKey: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							features: z.array(z.string().regex(/^[0-9a-fA-F]+$/).refine(s => s.length % 2 === 0, "Must be valid hex")),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns matching songs",
				content: {
					"application/json": {
						schema: z.object({
							songs: z.array(z.object({
								id: z.number(),
								title: z.string(),
								artist: z.string(),
								album: z.string().nullable(),
								year: z.number().nullable(),
							})),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { features } = data.body;

		const placeholders = features.map(() => "?").join(", ");

		const stmt = c.env.DB.prepare(
			`SELECT DISTINCT s.id, s.title, s.artist, s.album, s.year
			 FROM songs s
			 INNER JOIN features f ON f.song_id = s.id
			 WHERE f.feature IN (${placeholders})`
		);

		const bindings = features.map((f) => hexToBytes(f));

		const { results } = await stmt.bind(...bindings).run();

		return c.json({ songs: results });
	}
}
