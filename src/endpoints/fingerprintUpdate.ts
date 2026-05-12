import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Fingerprint } from "../types";

export class FingerprintUpdate extends OpenAPIRoute {
	schema = {
		tags: ["Fingerprints"],
		summary: "Update a fingerprint",
		security: [{ AdminKey: [] }],
		request: {
			params: z.object({
				id: z.coerce.number(),
			}),
			body: {
				content: {
					"application/json": {
						schema: Fingerprint.omit({ id: true }),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns the updated fingerprint",
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
		const { hash, offset, song_id } = data.body;

		const result = await c.env.DB.prepare(
			"UPDATE fingerprints SET hash = ?, offset = ?, song_id = ? WHERE id = ? RETURNING *"
		)
			.bind(hash, offset, song_id, id)
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
