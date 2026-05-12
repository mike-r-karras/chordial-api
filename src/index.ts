import { fromHono } from "chanfana";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { SongLookup } from "./endpoints/songLookup";
import { SongCreate } from "./endpoints/songCreate";
import { SongDelete } from "./endpoints/songDelete";
import { SongFetch } from "./endpoints/songFetch";
import { SongList } from "./endpoints/songList";
import { SongUpdate } from "./endpoints/songUpdate";
import { FingerprintCreate } from "./endpoints/fingerprintCreate";
import { FingerprintDelete } from "./endpoints/fingerprintDelete";
import { FingerprintFetch } from "./endpoints/fingerprintFetch";
import { FingerprintList } from "./endpoints/fingerprintList";
import { FingerprintUpdate } from "./endpoints/fingerprintUpdate";
import { TaskCreate } from "./endpoints/taskCreate";
import { TaskDelete } from "./endpoints/taskDelete";
import { TaskFetch } from "./endpoints/taskFetch";
import { TaskList } from "./endpoints/taskList";
import { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// Security middleware
app.use("*", async (c, next) => {
	// Exclude documentation from authentication
	if (c.req.path === "/" || c.req.path === "/openapi.json") {
		return next();
	}

	const method = c.req.method;
	const path = c.req.path;

	// Determine if this is an administrative action
	const isWriteAction = (method === "POST" || method === "PUT" || method === "DELETE") && path !== "/lookup";

	const requiredToken = isWriteAction ? c.env.ADMIN_KEY : c.env.API_KEY;

	return bearerAuth({ token: requiredToken })(c, next);
});

const openapi = fromHono(app, {
	docs_url: "/",
});

// Register Security Schemes for OpenAPI
openapi.registry.registerComponent("securitySchemes", "APIKey", {
	type: "http",
	scheme: "bearer",
	description: "General API Key for read-only access and lookup",
});

openapi.registry.registerComponent("securitySchemes", "AdminKey", {
	type: "http",
	scheme: "bearer",
	description: "Admin Key for create, update, and delete operations",
});

openapi.post("/lookup", SongLookup);

openapi.get("/songs", SongList);
openapi.post("/songs", SongCreate);
openapi.get("/songs/:id", SongFetch);
openapi.put("/songs/:id", SongUpdate);
openapi.delete("/songs/:id", SongDelete);

openapi.get("/fingerprints", FingerprintList);
openapi.post("/fingerprints", FingerprintCreate);
openapi.get("/fingerprints/:id", FingerprintFetch);
openapi.put("/fingerprints/:id", FingerprintUpdate);
openapi.delete("/fingerprints/:id", FingerprintDelete);

openapi.get("/tasks", TaskList);
openapi.post("/tasks", TaskCreate);
openapi.get("/tasks/:taskSlug", TaskFetch);
openapi.delete("/tasks/:taskSlug", TaskDelete);

export default app;
