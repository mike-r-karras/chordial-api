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
						schema: z.union([
							Fingerprint.omit({ id: true }),
							z.array(Fingerprint.omit({ id: true })),
						]),
					},
				},
			},
		},
		responses: {
			"201": {
				description: "Returns the created fingerprint(s)",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							fingerprint: Fingerprint.optional(),
							fingerprints: z.array(Fingerprint).optional(),
							count: z.number().optional(),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body;

		const isArray = Array.isArray(body);
		const fingerprints = isArray ? body : [body];

		if (fingerprints.length === 0) {
			return c.json(
				{
					success: true,
					count: 0,
					fingerprints: [],
				},
				201
			);
		}

		const placeholders = fingerprints.map(() => "(?, ?, ?)").join(", ");
		const values = fingerprints.flatMap((f) => [f.hash, f.offset, f.song_id]);

		const result = await c.env.DB.prepare(
			`INSERT OR IGNORE INTO fingerprints (hash, offset, song_id) VALUES ${placeholders} RETURNING *`
		)
			.bind(...values)
			.all();

		if (isArray) {
			return c.json(
				{
					success: true,
					count: result.results.length,
					fingerprints: result.results,
				},
				201
			);
		}

		return c.json(
			{
				success: true,
				fingerprint: result.results[0] || null,
			},
			201
		);
	}
}
