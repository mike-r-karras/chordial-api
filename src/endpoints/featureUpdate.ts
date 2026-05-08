import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Feature } from "../types";
import { hexToBytes, bytesToHex } from "../utils/hex";

export class FeatureUpdate extends OpenAPIRoute {
	schema = {
		tags: ["Features"],
		summary: "Update a feature",
		security: [{ AdminKey: [] }],
		request: {
			params: z.object({
				id: z.coerce.number(),
			}),
			body: {
				content: {
					"application/json": {
						schema: Feature.omit({ id: true }),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns the updated feature",
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
		const { feature, song_id } = data.body;

		const result: any = await c.env.DB.prepare(
			"UPDATE features SET feature = ?, song_id = ? WHERE id = ? RETURNING *"
		)
			.bind(hexToBytes(feature), song_id, id)
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
