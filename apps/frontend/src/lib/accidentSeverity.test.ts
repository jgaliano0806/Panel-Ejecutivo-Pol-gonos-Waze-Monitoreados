import { describe, it, expect } from "vitest";
import { classifyAccident } from "../lib/accidentSeverity";

describe("classifyAccident", () => {
  it("clasifica por severidad numérica Waze", () => {
    expect(classifyAccident(1, null)).toBe("leve");
    expect(classifyAccident(2, null)).toBe("leve");
    expect(classifyAccident(3, null)).toBe("moderado");
    expect(classifyAccident(4, null)).toBe("grave");
    expect(classifyAccident(5, null)).toBe("grave");
  });

  it("usa subtipo cuando no hay severidad", () => {
    expect(classifyAccident(null, "ACCIDENT_MAJOR")).toBe("grave");
    expect(classifyAccident(null, "ACCIDENT_MINOR")).toBe("leve");
    expect(classifyAccident(null, "NO_SUBTYPE")).toBe("moderado");
    expect(classifyAccident(null, "ROAD_CLOSED_EVENT")).toBe("moderado");
  });

  it("prioriza severidad numérica sobre subtipo", () => {
    expect(classifyAccident(5, "ACCIDENT_MINOR")).toBe("grave");
    expect(classifyAccident(1, "ACCIDENT_MAJOR")).toBe("leve");
  });

  it("devuelve desconocido sin datos útiles", () => {
    expect(classifyAccident(null, null)).toBe("desconocido");
    expect(classifyAccident(undefined, "")).toBe("desconocido");
    expect(classifyAccident(NaN, "OTRO")).toBe("desconocido");
  });
});
