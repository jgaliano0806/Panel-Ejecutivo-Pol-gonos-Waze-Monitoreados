import { describe, it, expect } from "vitest";
import {
  mapIncidentType,
  calculateAlertSeverity,
  mapJamSeverity,
} from "./wazeUtils";
import { IncidentType, Severity } from "../types";

describe("wazeUtils", () => {
  describe("mapIncidentType", () => {
    it("mapea tipos Waze al dominio interno", () => {
      expect(mapIncidentType("ACCIDENT")).toBe(IncidentType.ACCIDENT);
      expect(mapIncidentType("JAM")).toBe(IncidentType.JAM);
      expect(mapIncidentType("ROAD_CLOSED")).toBe(IncidentType.ROADCLOSED);
    });

    it("usa HAZARD como fallback", () => {
      expect(mapIncidentType("UNKNOWN_TYPE")).toBe(IncidentType.HAZARD);
      expect(mapIncidentType("MISC")).toBe(IncidentType.HAZARD);
    });
  });

  describe("calculateAlertSeverity", () => {
    it("asigna severidad base por tipo", () => {
      const baseInput = { reliability: 5, confidence: 5, nThumbsUp: 3 };
      expect(
        calculateAlertSeverity({ type: "ROAD_CLOSED", ...baseInput }),
      ).toBe(Severity.CRITICAL);
      expect(
        calculateAlertSeverity({ type: "ACCIDENT", ...baseInput }),
      ).toBe(Severity.HIGH);
      expect(calculateAlertSeverity({ type: "JAM", ...baseInput })).toBe(
        Severity.MEDIUM,
      );
      expect(
        calculateAlertSeverity({ type: "HAZARD", ...baseInput }),
      ).toBe(Severity.LOW);
    });

    it("eleva severidad con alta confianza y confirmaciones", () => {
      expect(
        calculateAlertSeverity({
          type: "JAM",
          confidence: 8,
          nThumbsUp: 6,
        }),
      ).toBe(Severity.HIGH);
    });

    it("reduce severidad con baja confianza", () => {
      expect(
        calculateAlertSeverity({
          type: "ACCIDENT",
          confidence: 1,
          nThumbsUp: 0,
        }),
      ).toBe(Severity.MEDIUM);
    });

    it("marca ACCIDENT como CRITICAL con métricas altas", () => {
      expect(
        calculateAlertSeverity({
          type: "ACCIDENT",
          confidence: 9,
          nThumbsUp: 10,
        }),
      ).toBe(Severity.CRITICAL);
    });
  });

  describe("mapJamSeverity", () => {
    it("mapea nivel Waze a Severity", () => {
      expect(mapJamSeverity(1)).toBe(Severity.LOW);
      expect(mapJamSeverity(2)).toBe(Severity.MEDIUM);
      expect(mapJamSeverity(3)).toBe(Severity.HIGH);
      expect(mapJamSeverity(4)).toBe(Severity.CRITICAL);
      expect(mapJamSeverity(5)).toBe(Severity.CRITICAL);
    });
  });
});
