import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../types";

export class FingerprintDelete extends OpenAPIRoute {
	schema = {
		tags: ["Fingerprints"],
		summary: "Delete a fingerprint",
		security: [{ AdminKey: [] }],
		request: {
			params: z.object({
				id: z.coerce.number(),
			}),
		},
		responses: {
			"200": {
				description: "Returns success status",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params;

		await c.env.DB.prepare("DELETE FROM fingerprints WHERE id = ?").bind(id).run();

		return c.json({
			success: true,
		});
	}
}
