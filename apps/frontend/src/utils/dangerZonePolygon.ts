import { kinks, polygon } from "@turf/turf";

/**
 * Anillo cerrado (último = primero implícito) sin autointersección.
 * Con menos de 3 vértices abiertos se considera válido (dibujo incompleto).
 */
export function isClosedRingSimple(pts: [number, number][]): boolean {
  if (pts.length < 3) return true;
  try {
    return kinks(polygon([[...pts, pts[0]]])).features.length === 0;
  } catch {
    return false;
  }
}

/** Copia con punto insertado tras el segmento `segmentStart` → siguiente (o cierre último→primero). */
export function insertAfterSegmentCopy(
  pts: [number, number][],
  segmentStart: number,
  point: [number, number],
): [number, number][] | null {
  const n = pts.length;
  if (n < 2) return null;
  const next = [...pts];
  let insertAt: number;
  if (segmentStart === n - 1) insertAt = n;
  else if (segmentStart >= 0 && segmentStart < n - 1) insertAt = segmentStart + 1;
  else return null;
  next.splice(insertAt, 0, point);
  return next;
}
