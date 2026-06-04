import { describe, it, expect } from "vitest";
import { toLegacyAlert, toLegacyJam } from "./legacyMapper";
import type { WazeAlert } from "../repositories/WazeAlertRepository";
import type { WazeJam } from "../repositories/WazeJamRepository";
import { IncidentType, Severity } from "../types";

describe("legacyMapper", () => {
  describe("toLegacyAlert", () => {
    it("mapea entidad WazeAlert al formato InternalAlert", () => {
      const entity: WazeAlert = {
        uuid: "alert-uuid-1",
        polygon_id: "poly-1",
        type: "ACCIDENT",
        subtype: "ACCIDENT_MAJOR",
        location: { x: -64.18, y: -31.41 },
        street: "Colectora",
        city: "Córdoba",
        pubMillis: 1_700_000_000_000,
        reliability: 8,
        confidence: 7,
        nThumbsUp: 5,
        reportDescription: "Choque múltiple",
      };

      const alert = toLegacyAlert(entity);

      expect(alert.id).toBe("alert-uuid-1");
      expect(alert.polygonId).toBe("poly-1");
      expect(alert.type).toBe(IncidentType.ACCIDENT);
      expect(alert.subtype).toBe("ACCIDENT_MAJOR");
      expect(alert.location).toEqual({ lat: -31.41, lng: -64.18 });
      expect(alert.street).toBe("Colectora");
      expect(alert.severity).toBeGreaterThanOrEqual(Severity.HIGH);
      expect(alert.timestamp).toEqual(new Date(1_700_000_000_000));
    });
  });

  describe("toLegacyJam", () => {
    it("parsea polyline JSON y calcula extremos", () => {
      const entity: WazeJam = {
        uuid: "jam-1",
        polygon_id: "poly-1",
        level: 3,
        speedKMH: 20,
        delay: 120,
        length: 500,
        street: "Ruta 9",
        pubMillis: 1_700_000_000_000,
        polyline: JSON.stringify([
          { x: -64.1, y: -31.4 },
          { x: -64.2, y: -31.5 },
        ]),
      };

      const jam = toLegacyJam(entity);

      expect(jam.id).toBe("jam-1");
      expect(jam.severity).toBe(Severity.HIGH);
      expect(jam.location).toEqual({ lat: -31.4, lng: -64.1 });
      expect(jam.endLocation).toEqual({ lat: -31.5, lng: -64.2 });
      expect(jam.line).toHaveLength(2);
    });

    it("tolera polyline vacía", () => {
      const entity: WazeJam = {
        uuid: "jam-2",
        polygon_id: "poly-1",
        level: 1,
        speedKMH: 40,
        delay: 0,
        length: 0,
        street: "Ruta",
        pubMillis: 1_700_000_000_000,
        polyline: [],
      };

      const jam = toLegacyJam(entity);
      expect(jam.location).toEqual({ lat: 0, lng: 0 });
      expect(jam.endLocation).toBeUndefined();
    });
  });
});
