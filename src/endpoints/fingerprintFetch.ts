import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Fingerprint } from "../types";

export class FingerprintFetch extends OpenAPIRoute {
	schema = {
		tags: ["Fingerprints"],
		summary: "Get a fingerprint by ID",
		security: [{ APIKey: [] }],
		request: {
			params: z.object({
				id: z.coerce.number(),
			}),
		},
		responses: {
			"200": {
				description: "Returns the fingerprint",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							fingerprint: Fingerprint,
						}),
					},
				},
			},
			"404": {
				description: "Fingerprint not found",
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

		const result = await c.env.DB.prepare(
			"SELECT id, hash, offset, song_id FROM fingerprints WHERE id = ?"
		)
			.bind(id)
			.first();

		if (!result) {
			return c.json({ success: false, error: "Fingerprint not found" }, 404);
		}

		return c.json({
			success: true,
			fingerprint: result,
		});
	}
}
