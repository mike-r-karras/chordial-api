import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Song } from "../types";

export class SongUpdate extends OpenAPIRoute {
	schema = {
		tags: ["Songs"],
		summary: "Update a song",
		security: [{ AdminKey: [] }],
		request: {
			params: z.object({
				id: z.coerce.number(),
			}),
			body: {
				content: {
					"application/json": {
						schema: Song.omit({ id: true }),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns the updated song",
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
		const { name, artist, album, year, file_path, duration, sample_rate } = data.body;

		const result = await c.env.DB.prepare(
			"UPDATE songs SET name = ?, artist = ?, album = ?, year = ?, file_path = ?, duration = ?, sample_rate = ? WHERE id = ? RETURNING *"
		)
			.bind(name, artist, album, year, file_path, duration, sample_rate, id)
			.first();

		if (!result) {
			return c.json({ success: false, error: "Song not found" }, 404);
		}

		return c.json({
			success: true,
			song: result,
		});
	}
}
