import { describe, it, expect, afterEach } from "vitest";
import Fastify from "fastify";
import healthRoutes from "./health.routes";

describe("health.routes", () => {
  let app: ReturnType<typeof Fastify>;

  afterEach(async () => {
    if (app) await app.close();
  });

  it("GET /health/live responde 200 sin depender de PostgreSQL", async () => {
    app = Fastify();
    await app.register(healthRoutes);
    const res = await app.inject({ method: "GET", url: "/health/live" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string; uptime: number };
    expect(body.status).toBe("alive");
    expect(typeof body.uptime).toBe("number");
  });
});
