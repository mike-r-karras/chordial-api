import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Song } from "../types";

export class SongList extends OpenAPIRoute {
	schema = {
		tags: ["Songs"],
		summary: "List songs",
		security: [{ APIKey: [] }],
		responses: {
			"200": {
				description: "Returns an array of songs",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							songs: z.array(Song),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const { results } = await c.env.DB.prepare(
			"SELECT id, name, artist, album, year, file_path, duration, sample_rate FROM songs"
		).all();

		return c.json({
			success: true,
			songs: results,
		});
	}
}
