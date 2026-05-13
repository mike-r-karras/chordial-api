import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Song } from "../types";

export class SongList extends OpenAPIRoute {
	schema = {
		tags: ["Songs"],
		summary: "List songs",
		security: [{ APIKey: [] }],
		request: {
			query: z.object({
				name: z.string().optional(),
				artist: z.string().optional(),
				album: z.string().optional(),
				year: z.coerce.number().optional(),
			}),
		},
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
		const data = await this.getValidatedData<typeof this.schema>();
		const { name, artist, album, year } = data.query;

		let query = "SELECT id, name, artist, album, year, file_path, duration, sample_rate FROM songs";
		const params = [];
		const where = [];

		if (name) {
			where.push("name = ?");
			params.push(name);
		}
		if (artist) {
			where.push("artist = ?");
			params.push(artist);
		}
		if (album) {
			where.push("album = ?");
			params.push(album);
		}
		if (year) {
			where.push("year = ?");
			params.push(year);
		}

		if (where.length > 0) {
			query += " WHERE " + where.join(" AND ");
		}

		const { results } = await c.env.DB.prepare(query).bind(...params).all();

		return c.json({
			success: true,
			songs: results,
		});
	}
}
