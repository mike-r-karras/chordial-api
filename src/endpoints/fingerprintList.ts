import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Fingerprint } from "../types";

export class FingerprintList extends OpenAPIRoute {
	schema = {
		tags: ["Fingerprints"],
		summary: "List fingerprints",
		security: [{ APIKey: [] }],
		request: {
			query: z.object({
				song_id: z.coerce.number().optional(),
			}),
		},
		responses: {
			"200": {
				description: "Returns an array of fingerprints",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							fingerprints: z.array(Fingerprint),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { song_id } = data.query;

		let query = "SELECT id, hash, offset, song_id FROM fingerprints";
		let stmt;

		if (song_id) {
			query += " WHERE song_id = ?";
			stmt = c.env.DB.prepare(query).bind(song_id);
		} else {
			stmt = c.env.DB.prepare(query);
		}

		const { results } = await stmt.all();

		return c.json({
			success: true,
			fingerprints: results,
		});
	}
}
