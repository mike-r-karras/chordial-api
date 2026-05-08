import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Feature } from "../types";
import { bytesToHex } from "../utils/hex";

export class FeatureList extends OpenAPIRoute {
	schema = {
		tags: ["Features"],
		summary: "List features",
		security: [{ APIKey: [] }],
		request: {
			query: z.object({
				song_id: z.coerce.number().optional(),
			}),
		},
		responses: {
			"200": {
				description: "Returns an array of features",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							features: z.array(Feature),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { song_id } = data.query;

		let query = "SELECT id, feature, song_id FROM features";
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
			features: results.map((r: any) => ({
				...r,
				feature: bytesToHex(new Uint8Array(r.feature)),
			})),
		});
	}
}
