import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Feature } from "../types";
import { hexToBytes, bytesToHex } from "../utils/hex";

export class FeatureCreate extends OpenAPIRoute {
	schema = {
		tags: ["Features"],
		summary: "Create a new feature",
		security: [{ AdminKey: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: Feature.omit({ id: true }),
					},
				},
			},
		},
		responses: {
			"201": {
				description: "Returns the created feature",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							feature: Feature,
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { feature, song_id } = data.body;

		const result: any = await c.env.DB.prepare(
			"INSERT INTO features (feature, song_id) VALUES (?, ?) RETURNING *"
		)
			.bind(hexToBytes(feature), song_id)
			.first();

		if (!result) {
			return c.json({ success: false, error: "Failed to create feature" }, 500);
		}

		return c.json({
			success: true,
			feature: {
				...result,
				feature: bytesToHex(new Uint8Array(result.feature as ArrayBuffer)),
			},
		}, 201);
	}
}
