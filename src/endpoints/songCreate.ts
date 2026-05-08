import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Song } from "../types";

export class SongCreate extends OpenAPIRoute {
	schema = {
		tags: ["Songs"],
		summary: "Create a new song",
		security: [{ AdminKey: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: Song.omit({ id: true, created_at: true }),
					},
				},
			},
		},
		responses: {
			"201": {
				description: "Returns the created song",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							song: Song,
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { title, artist, album, year } = data.body;

		const result = await c.env.DB.prepare(
			"INSERT INTO songs (title, artist, album, year) VALUES (?, ?, ?, ?) RETURNING *"
		)
			.bind(title, artist, album, year)
			.first();

		return c.json({
			success: true,
			song: result,
		}, 201);
	}
}
