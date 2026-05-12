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
	name: z.string().nullable().openapi({ example: "Song Name" }),
	artist: z.string().nullable().openapi({ example: "Artist Name" }),
	album: z.string().nullable().openapi({ example: "Album Name" }),
	year: z.number().nullable().openapi({ example: 2024 }),
	file_path: z.string().nullable().openapi({ example: "/path/to/song.wav" }),
	duration: z.number().nullable().openapi({ example: 180.5 }),
	sample_rate: z.number().nullable().openapi({ example: 22050 }),
});

export const Fingerprint = z.object({
	id: z.number().openapi({ example: 1 }),
	hash: z.string().openapi({ example: "deadbeef" }),
	offset: z.number().openapi({ example: 100 }),
	song_id: z.number().openapi({ example: 1 }),
});

export const Task = z.object({
	name: z.string().openapi({ example: "lorem" }),
	slug: z.string(),
	description: z.string().optional(),
	completed: z.boolean().default(false),
	due_date: z.string().openapi({ example: "2024-05-07" }),
});
