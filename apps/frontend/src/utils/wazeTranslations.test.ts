import { describe, it, expect } from "vitest";
import {
  getIncidentDescription,
  getMainTypeTranslation,
  getJamLevelTranslation,
  getIncidentEmoji,
} from "./wazeTranslations";

describe("wazeTranslations", () => {
  describe("getMainTypeTranslation", () => {
    it("traduce tipos Waze conocidos", () => {
      expect(getMainTypeTranslation("ACCIDENT")).toBe("Siniestro vial");
      expect(getMainTypeTranslation("jam")).toBe("Congestión");
    });

    it("retorna fallback para tipo vacío", () => {
      expect(getMainTypeTranslation("")).toBe("Alerta");
    });
  });

  describe("getIncidentDescription", () => {
    it("prioriza subtipo traducido", () => {
      expect(getIncidentDescription("accident", "ACCIDENT_MAJOR")).toBe(
        "Colisión múltiple",
      );
    });

    it("usa tipo principal si no hay subtipo", () => {
      expect(getIncidentDescription("JAM")).toBe("Congestión");
    });
  });

  describe("getJamLevelTranslation", () => {
    it("traduce niveles de congestión", () => {
      expect(getJamLevelTranslation(0)).toBe("Sin demoras");
      expect(getJamLevelTranslation(4)).toBe("Detenido");
    });
  });

  describe("getIncidentEmoji", () => {
    it("asigna emoji por tipo", () => {
      expect(getIncidentEmoji("accident")).toBe("💥");
      expect(getIncidentEmoji("construction")).toBe("🚧");
    });
  });
});
