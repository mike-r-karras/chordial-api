import type { Context } from "hono";
import { z } from "zod";

export interface Env {
	DB: D1Database;
	API_KEY: string;
	ADMIN_KEY: string;
}

export type AppContext = Context<{ Bindings: Env }>;

export const Song = z.object({
	id: z.number().openapi({ example: 1 }),
	title: z.string().openapi({ example: "Song Title" }),
	artist: z.string().openapi({ example: "Artist Name" }),
	album: z.string().nullable().openapi({ example: "Album Name" }),
	year: z.number().nullable().openapi({ example: 2024 }),
	created_at: z.string().optional(),
});

export const Feature = z.object({
	id: z.number().openapi({ example: 1 }),
	feature: z.string().regex(/^[0-9a-fA-F]+$/).refine(s => s.length % 2 === 0, "Must be valid hex").openapi({ example: "deadbeef" }),
	song_id: z.number().openapi({ example: 1 }),
});

export const Task = z.object({
	name: z.string().openapi({ example: "lorem" }),
	slug: z.string(),
	description: z.string().optional(),
	completed: z.boolean().default(false),
	due_date: z.string().openapi({ example: "2024-05-07" }),
});
