import { createServer } from "node:http";
import { Readable } from "node:stream";
import worker from "./worker.js";
import { createPostgresBindings } from "./runtime/postgres-d1-compat.mjs";

const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";
const env = { ...process.env };
let postgresPool;

if (env.DATABASE_URL) {
  const bindings = createPostgresBindings(env.DATABASE_URL);
  postgresPool = bindings.pool;
  // Existing application modules keep their D1-shaped API while SQL is executed
  // by PostgreSQL. The three former D1 bindings point to the same new database.
  env.XKISS_AUTH_DB = bindings.db;
  env.XKISS_DB = bindings.db;
  env.XKISS_ADMIN_AUDIT = bindings.db;
  await postgresPool.query("SELECT 1");
  console.log("X4Kiss PostgreSQL bindings connected.");
} else {
  console.warn("DATABASE_URL is missing; database-backed routes will fail closed.");
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        for (const item of value) headers.append(key, item);
      } else if (value !== undefined) {
        headers.set(key, value);
      }
    }

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(url, {
      method: req.method,
      headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? "half" : undefined
    });

    const response = await worker.fetch(request, env);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (!response.body) {
      res.end();
      return;
    }
    Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    // Do not log SQL parameters, credentials, or provider responses.
    console.error("X4Kiss server error:", error?.message || "unknown error");
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=UTF-8");
    }
    res.end(JSON.stringify({
      ok: false,
      service: "X4Kiss Node Server",
      message: "Internal server error."
    }));
  }
});

server.listen(port, host, () => {
  console.log(`X4Kiss server running on http://${host}:${port}`);
});

async function shutdown() {
  server.close();
  if (postgresPool) await postgresPool.end();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
