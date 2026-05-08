import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../types";

export class FeatureDelete extends OpenAPIRoute {
	schema = {
		tags: ["Features"],
		summary: "Delete a feature",
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

		await c.env.DB.prepare("DELETE FROM features WHERE id = ?").bind(id).run();

		return c.json({
			success: true,
		});
	}
}
