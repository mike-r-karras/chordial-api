import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Song } from "../types";

export class SongFetch extends OpenAPIRoute {
	schema = {
		tags: ["Songs"],
		summary: "Get a song by ID",
		security: [{ APIKey: [] }],
		request: {
			params: z.object({
				id: z.coerce.number(),
			}),
		},
		responses: {
			"200": {
				description: "Returns the song",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							song: Song,
						}),
					},
				},
			},
			"404": {
				description: "Song not found",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							error: z.string(),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params;

		const song = await c.env.DB.prepare(
			"SELECT id, title, artist, album, year, created_at FROM songs WHERE id = ?"
		)
			.bind(id)
			.first();

		if (!song) {
			return c.json({ success: false, error: "Song not found" }, 404);
		}

		return c.json({
			success: true,
			song: song,
		});
	}
}
