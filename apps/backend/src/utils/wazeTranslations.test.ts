import { describe, it, expect } from "vitest";
import {
  getWazeTypeLabel,
  getWazeSubtypeLabel,
  getWazeIcon,
} from "./wazeTranslations";

describe("wazeTranslations (backend)", () => {
  describe("getWazeTypeLabel", () => {
    it("traduce tipos conocidos", () => {
      expect(getWazeTypeLabel("ACCIDENT")).toBe("Accidente");
      expect(getWazeTypeLabel("jam")).toBe("Embotellamiento");
    });

    it("devuelve el tipo original si no hay traducción", () => {
      expect(getWazeTypeLabel("CUSTOM_X")).toBe("CUSTOM_X");
    });
  });

  describe("getWazeSubtypeLabel", () => {
    it("traduce subtipos conocidos", () => {
      expect(getWazeSubtypeLabel("ACCIDENT_MAJOR")).toBe("Accidente grave");
      expect(getWazeSubtypeLabel("HAZARD_ON_ROAD_POT_HOLE")).toBe("Bache");
    });
  });

  describe("getWazeIcon", () => {
    it("devuelve emoji por tipo", () => {
      expect(getWazeIcon("ACCIDENT")).toBe("💥");
      expect(getWazeIcon("CONSTRUCTION")).toBe("🚧");
    });

    it("usa fallback para tipo desconocido", () => {
      expect(getWazeIcon("UNKNOWN")).toBe("📍");
    });
  });
});
