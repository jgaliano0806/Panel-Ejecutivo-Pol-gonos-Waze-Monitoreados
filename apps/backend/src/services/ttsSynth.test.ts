import { describe, expect, it, vi } from "vitest";
import { createSynthesizer } from "./ttsSynth";

const noSleep = async () => {};

describe("createSynthesizer", () => {
  it("procesa de a un pedido por vez", async () => {
    let active = 0;
    let maxActive = 0;
    const synth = vi.fn(async (text: string) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return Buffer.from(text);
    });
    const speak = createSynthesizer({ synth, sleep: noSleep });
    const out = await Promise.all(["a", "b", "c", "d"].map((t) => speak(t, "v")));
    expect(out.map(String)).toEqual(["a", "b", "c", "d"]);
    expect(maxActive).toBe(1);
  });

  it("espera el intervalo mínimo entre síntesis reales y no en cache", async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const synth = vi.fn(async (t: string) => Buffer.from(t));
    const speak = createSynthesizer({ synth, sleep, minIntervalMs: 700 });
    await speak("a", "v");
    await speak("a", "v"); // cache: sin pausa extra
    await speak("b", "v");
    await new Promise((r) => setTimeout(r, 0));
    expect(sleep.mock.calls.filter(([ms]) => ms === 700)).toHaveLength(2);
  });

  it("reintenta y termina bien", async () => {
    const synth = vi
      .fn<(t: string, v: string) => Promise<Buffer>>()
      .mockRejectedValueOnce(new Error("429"))
      .mockResolvedValueOnce(Buffer.from("ok"));
    const speak = createSynthesizer({ synth, sleep: noSleep });
    expect((await speak("hola", "v")).toString()).toBe("ok");
    expect(synth).toHaveBeenCalledTimes(2);
  });

  it("falla tras agotar reintentos y no deja trabada la cola", async () => {
    const synth = vi
      .fn<(t: string, v: string) => Promise<Buffer>>()
      .mockRejectedValue(new Error("caido"));
    const speak = createSynthesizer({ synth, maxRetries: 1, sleep: noSleep });
    await expect(speak("x", "v")).rejects.toThrow("caido");
    expect(synth).toHaveBeenCalledTimes(2);

    synth.mockReset();
    synth.mockResolvedValue(Buffer.from("y"));
    expect((await speak("y", "v")).toString()).toBe("y");
  });

  it("cachea por voz+texto y deduplica pedidos en curso", async () => {
    const synth = vi.fn(async (t: string) => Buffer.from(t));
    const speak = createSynthesizer({ synth, sleep: noSleep });
    await Promise.all([speak("igual", "v"), speak("igual", "v")]);
    await speak("igual", "v");
    expect(synth).toHaveBeenCalledTimes(1);
    await speak("igual", "otra");
    expect(synth).toHaveBeenCalledTimes(2);
  });

  it("respeta el máximo de cache (LRU)", async () => {
    const synth = vi.fn(async (t: string) => Buffer.from(t));
    const speak = createSynthesizer({ synth, cacheMax: 2, sleep: noSleep });
    await speak("a", "v");
    await speak("b", "v");
    await speak("c", "v"); // expulsa "a"
    await speak("b", "v"); // cache
    await speak("a", "v"); // vuelve a sintetizar
    expect(synth).toHaveBeenCalledTimes(4);
  });
});
