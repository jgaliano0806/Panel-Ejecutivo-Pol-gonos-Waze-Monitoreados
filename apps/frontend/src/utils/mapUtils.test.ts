import { expandAndJitterIncidents } from "./mapUtils";
import { describe, it, expect } from "vitest";

// Mock helper
const mockGetDescription = (type: string, subtype?: string) =>
  `${type}${subtype ? `-${subtype}` : ""}`;

describe("expandAndJitterIncidents", () => {
  it("should return empty array for empty input", () => {
    const result = expandAndJitterIncidents(
      [],
      "Zone",
      null,
      mockGetDescription,
    );
    expect(result).toEqual([]);
  });

  it("should filter by zone name (case insensitive, partial match)", () => {
    const input = [
      {
        incident: {
          id: "1",
          street: "Av. Colon",
          location: { lat: 0, lng: 0 },
          type: "J",
        },
        reportCount: 1,
      },
      {
        incident: {
          id: "2",
          street: "Colectora",
          location: { lat: 0, lng: 0 },
          type: "J",
        },
        reportCount: 1,
      },
    ];

    // Testing "Colectora" vs "Colectora (N)" matches
    const result = expandAndJitterIncidents(
      input,
      "Colectora (N)",
      null,
      mockGetDescription,
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toContain("2");
  });

  it("should expand single incident with reportCount > 1 into multiple markers", () => {
    const input = [
      {
        incident: {
          id: "1",
          street: "Test St",
          location: { lat: 10, lng: 10 },
          type: "J",
        },
        reportCount: 5,
      },
    ];

    const result = expandAndJitterIncidents(
      input,
      "Test St",
      null,
      mockGetDescription,
    );
    expect(result).toHaveLength(5);

    const ids = new Set(result.map((r) => r.id));
    expect(ids.size).toBe(5);

    // Al menos un marcador debe desplazarse (jitter circular; idx=0 puede mantener lat)
    const uniqueCoords = new Set(
      result.map((r) => `${r.location.lat},${r.location.lng}`),
    );
    expect(uniqueCoords.size).toBeGreaterThan(1);
  });

  it("should apply deterministic jitter to overlapping distinct incidents", () => {
    // Two different incidents at EXACT same location
    const input = [
      {
        incident: {
          id: "A",
          street: "X",
          location: { lat: 5, lng: 5 },
          type: "J",
        },
        reportCount: 1,
      },
      {
        incident: {
          id: "B",
          street: "X",
          location: { lat: 5, lng: 5 },
          type: "J",
        },
        reportCount: 1,
      },
    ];

    const result = expandAndJitterIncidents(
      input,
      "X",
      null,
      mockGetDescription,
    );
    expect(result).toHaveLength(2);

    // Sus coordenadas deben ser diferentes
    expect(result[0].location.lat).not.toEqual(result[1].location.lat);

    // Y deben ser consistentes si corremos de nuevo
    const result2 = expandAndJitterIncidents(
      input,
      "X",
      null,
      mockGetDescription,
    );
    expect(result[0].location.lat).toEqual(result2[0].location.lat);
  });
});
