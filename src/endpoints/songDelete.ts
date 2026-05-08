import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../types";

export class SongDelete extends OpenAPIRoute {
	schema = {
		tags: ["Songs"],
		summary: "Delete a song",
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

		await c.env.DB.prepare("DELETE FROM songs WHERE id = ?").bind(id).run();

		return c.json({
			success: true,
		});
	}
}
