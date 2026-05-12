import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Fingerprint } from "../types";

export class FingerprintCreate extends OpenAPIRoute {
	schema = {
		tags: ["Fingerprints"],
		summary: "Create a new fingerprint",
		security: [{ AdminKey: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: Fingerprint.omit({ id: true }),
					},
				},
			},
		},
		responses: {
			"201": {
				description: "Returns the created fingerprint",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							fingerprint: Fingerprint,
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { hash, offset, song_id } = data.body;

		const result = await c.env.DB.prepare(
			"INSERT INTO fingerprints (hash, offset, song_id) VALUES (?, ?, ?) RETURNING *"
		)
			.bind(hash, offset, song_id)
			.first();

		if (!result) {
			return c.json({ success: false, error: "Failed to create fingerprint" }, 500);
		}

		return c.json({
			success: true,
			fingerprint: result,
		}, 201);
	}
}
