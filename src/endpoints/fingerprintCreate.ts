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

		// D1 limit is 100 parameters. Each fingerprint has 3 parameters (hash, offset, song_id).
		// 100 / 3 = 33.33, so max 33 fingerprints per statement.
		const CHUNK_SIZE = 33;
		const statements = [];

		for (let i = 0; i < fingerprints.length; i += CHUNK_SIZE) {
			const chunk = fingerprints.slice(i, i + CHUNK_SIZE);
			const placeholders = chunk.map(() => "(?, ?, ?)").join(", ");
			const values = chunk.flatMap((f) => [f.hash, f.offset, f.song_id]);

			statements.push(
				c.env.DB.prepare(
					`INSERT OR IGNORE INTO fingerprints (hash, offset, song_id) VALUES ${placeholders} RETURNING *`
				).bind(...values)
			);
		}

		const batchResults = await c.env.DB.batch(statements);
		const allInserted = batchResults.flatMap((r) => r.results);

		if (isArray) {
			return c.json(
				{
					success: true,
					count: allInserted.length,
					fingerprints: allInserted,
				},
				201
			);
		}

		return c.json(
			{
				success: true,
				fingerprint: allInserted[0] || null,
			},
			201
		);
	}
}
