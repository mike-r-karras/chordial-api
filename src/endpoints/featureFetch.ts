import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Feature } from "../types";
import { bytesToHex } from "../utils/hex";

export class FeatureFetch extends OpenAPIRoute {
	schema = {
		tags: ["Features"],
		summary: "Get a feature by ID",
		security: [{ APIKey: [] }],
		request: {
			params: z.object({
				id: z.coerce.number(),
			}),
		},
		responses: {
			"200": {
				description: "Returns the feature",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							feature: Feature,
						}),
					},
				},
			},
			"404": {
				description: "Feature not found",
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

		const result: any = await c.env.DB.prepare(
			"SELECT id, feature, song_id FROM features WHERE id = ?"
		)
			.bind(id)
			.first();

		if (!result) {
			return c.json({ success: false, error: "Feature not found" }, 404);
		}

		return c.json({
			success: true,
			feature: {
				...result,
				feature: bytesToHex(new Uint8Array(result.feature as ArrayBuffer)),
			},
		});
	}
}
