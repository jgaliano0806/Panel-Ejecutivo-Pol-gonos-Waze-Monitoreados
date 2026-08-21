import { describe, it, expect, beforeEach } from "vitest";
import {
  HEATMAP_RETURN_VIEW_KEY,
  saveHeatmapReturnView,
  readHeatmapReturnView,
  clearHeatmapReturnView,
  hasHeatmapReturnView,
  type HeatmapReturnView,
} from "./heatmapReturnView";

function installSessionStorageMock() {
  const store = new Map<string, string>();
  const mock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "sessionStorage", {
    value: mock,
    configurable: true,
  });
}

const sample: HeatmapReturnView = {
  lng: -64.1811,
  lat: -31.4135,
  zoom: 14.5,
  bearing: 12,
  pitch: 0,
  dateFrom: "2025-01-01T03:00:00.000Z",
  dateTo: "2026-01-01T02:59:59.999Z",
  activeBuckets: ["grave", "moderado"],
  accidentId: "acc-42",
  savedAt: 1_700_000_000_000,
};

describe("heatmapReturnView", () => {
  beforeEach(() => {
    installSessionStorageMock();
    sessionStorage.clear();
  });

  it("persiste y lee la vista completa", () => {
    saveHeatmapReturnView(sample);
    expect(hasHeatmapReturnView()).toBe(true);
    expect(readHeatmapReturnView()).toEqual(sample);
    expect(sessionStorage.getItem(HEATMAP_RETURN_VIEW_KEY)).toBeTruthy();
  });

  it("limpia la vista guardada", () => {
    saveHeatmapReturnView(sample);
    clearHeatmapReturnView();
    expect(hasHeatmapReturnView()).toBe(false);
    expect(readHeatmapReturnView()).toBeNull();
  });

  it("rechaza payloads inválidos", () => {
    sessionStorage.setItem(HEATMAP_RETURN_VIEW_KEY, JSON.stringify({ zoom: 10 }));
    expect(readHeatmapReturnView()).toBeNull();
    sessionStorage.setItem(HEATMAP_RETURN_VIEW_KEY, "not-json");
    expect(readHeatmapReturnView()).toBeNull();
  });
});
