import { describe, it, expect } from "vitest";
import {
  serializeDate,
  serializeObject,
  serializeAlerts,
} from "./serialization";

describe("serialization", () => {
  describe("serializeDate", () => {
    it("convierte Date a ISO string", () => {
      const d = new Date("2024-06-01T12:00:00.000Z");
      expect(serializeDate(d)).toBe("2024-06-01T12:00:00.000Z");
    });

    it("retorna null para valores nulos", () => {
      expect(serializeDate(null)).toBeNull();
      expect(serializeDate(undefined)).toBeNull();
    });
  });

  describe("serializeObject", () => {
    it("serializa fechas anidadas recursivamente", () => {
      const input = {
        id: "1",
        nested: { at: new Date("2024-01-15T10:00:00.000Z") },
        tags: [new Date("2024-01-16T10:00:00.000Z")],
      };
      const out = serializeObject(input);
      expect(out.nested.at).toBe("2024-01-15T10:00:00.000Z");
      expect(out.tags[0]).toBe("2024-01-16T10:00:00.000Z");
    });

    it("preserva primitivos", () => {
      expect(serializeObject(42)).toBe(42);
      expect(serializeObject("text")).toBe("text");
    });
  });

  describe("serializeAlerts", () => {
    it("serializa array de alertas", () => {
      const alerts = [{ id: "a1", timestamp: new Date("2024-03-01T00:00:00.000Z") }];
      const out = serializeAlerts(alerts);
      expect(out[0].timestamp).toBe("2024-03-01T00:00:00.000Z");
    });
  });
});
