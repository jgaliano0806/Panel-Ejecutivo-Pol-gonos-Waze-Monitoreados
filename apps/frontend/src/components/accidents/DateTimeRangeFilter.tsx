/**
 * Filtro de rango con calendario moderno + hora.
 * Sin dependencias extra: grilla mensual propia + selects de hora/minuto.
 */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";

export interface DateTimeRangeFilterProps {
  fromIso: string;
  toIso: string;
  onChange: (fromIso: string, toIso: string) => void;
  className?: string;
}

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"] as const;
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const MINUTES = ["00", "15", "30", "45", "59"] as const;

type Draft = {
  from: Date;
  to: Date;
  picking: "from" | "to";
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function clampRange(from: Date, to: Date): { from: Date; to: Date } {
  if (from.getTime() <= to.getTime()) return { from, to };
  return { from: to, to: from };
}

function withTime(day: Date, hours: number, minutes: number, ms = 0): Date {
  const d = new Date(day);
  d.setHours(hours, minutes, minutes === 59 ? 59 : 0, ms);
  return d;
}

function formatChip(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Lunes = 0 … Domingo = 6 */
function mondayIndex(year: number, month: number): number {
  const dow = new Date(year, month, 1).getDay(); // 0=Dom
  return (dow + 6) % 7;
}

function presetRange(
  key: "24h" | "7d" | "30d" | "90d" | "1y",
): { from: Date; to: Date } {
  const to = new Date();
  to.setSeconds(59, 999);
  const from = new Date(to);
  switch (key) {
    case "24h":
      from.setTime(to.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      from.setHours(0, 0, 0, 0);
      break;
    case "1y":
      from.setFullYear(from.getFullYear() - 1);
      from.setHours(0, 0, 0, 0);
      break;
  }
  return { from, to };
}

const PRESETS: Array<{ key: "24h" | "7d" | "30d" | "90d" | "1y"; label: string }> =
  [
    { key: "24h", label: "24 h" },
    { key: "7d", label: "7 días" },
    { key: "30d", label: "30 días" },
    { key: "90d", label: "90 días" },
    { key: "1y", label: "1 año" },
  ];

export function DateTimeRangeFilter({
  fromIso,
  toIso,
  onChange,
  className = "",
}: DateTimeRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 360 });

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(toIso);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  });

  const [draft, setDraft] = useState<Draft>(() => ({
    from: new Date(fromIso),
    to: new Date(toIso),
    picking: "from",
  }));

  const openPanel = () => {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    setDraft({
      from: Number.isNaN(from.getTime()) ? new Date() : from,
      to: Number.isNaN(to.getTime()) ? new Date() : to,
      picking: "from",
    });
    setViewMonth(Number.isNaN(to.getTime()) ? new Date() : to);
    setOpen(true);
  };

  const positionPanel = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(380, Math.max(320, window.innerWidth - 24));
    let left = rect.right - width;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    let top = rect.bottom + 8;
    const approxHeight = 520;
    if (top + approxHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - approxHeight - 8);
    }
    setPanelPos({ top, left, width });
  }, []);

  useEffect(() => {
    if (!open) return;
    positionPanel();
    const onResize = () => positionPanel();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        panelRef.current?.contains(t) ||
        triggerRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open, positionPanel]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const cells = useMemo(() => {
    const total = daysInMonth(year, month);
    const offset = mondayIndex(year, month);
    const list: Array<Date | null> = [];
    for (let i = 0; i < offset; i++) list.push(null);
    for (let day = 1; day <= total; day++) {
      list.push(new Date(year, month, day));
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [year, month]);

  const selectDay = (day: Date) => {
    setDraft((prev) => {
      if (prev.picking === "from") {
        const nextFrom = withTime(
          day,
          prev.from.getHours(),
          prev.from.getMinutes(),
        );
        return { ...prev, from: nextFrom, picking: "to" };
      }
      const nextTo = withTime(
        day,
        prev.to.getHours(),
        prev.to.getMinutes() === 0 && prev.to.getHours() === 0
          ? 59
          : prev.to.getMinutes(),
        999,
      );
      // Si eligen un día anterior al desde, invertimos
      const clamped = clampRange(prev.from, nextTo);
      // conservar horas en cada extremo según cuál quedó dónde
      if (clamped.from === nextTo && clamped.to === prev.from) {
        return {
          from: withTime(day, prev.from.getHours(), prev.from.getMinutes()),
          to: withTime(
            prev.from,
            prev.to.getHours(),
            prev.to.getMinutes(),
            999,
          ),
          picking: "from",
        };
      }
      return { from: clamped.from, to: nextTo, picking: "from" };
    });
  };

  const setFromTime = (h: number, m: number) => {
    setDraft((prev) => {
      const from = withTime(prev.from, h, m);
      const { from: f, to: t } = clampRange(from, prev.to);
      return { ...prev, from: f, to: t };
    });
  };

  const setToTime = (h: number, m: number) => {
    setDraft((prev) => {
      const to = withTime(prev.to, h, m, 999);
      const { from: f, to: t } = clampRange(prev.from, to);
      return { ...prev, from: f, to: t };
    });
  };

  const applyPreset = (key: "24h" | "7d" | "30d" | "90d" | "1y") => {
    const { from, to } = presetRange(key);
    setDraft({ from, to, picking: "from" });
    setViewMonth(to);
  };

  const apply = () => {
    const { from, to } = clampRange(draft.from, draft.to);
    onChange(from.toISOString(), to.toISOString());
    setOpen(false);
  };

  const inRange = (day: Date) => {
    const t = startOfDay(day).getTime();
    const a = startOfDay(draft.from).getTime();
    const b = startOfDay(draft.to).getTime();
    return t >= Math.min(a, b) && t <= Math.max(a, b);
  };

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="group inline-flex h-9 max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/90 px-2.5 text-left text-xs text-slate-700 transition-colors hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
      >
        <Calendar
          className="h-3.5 w-3.5 shrink-0 text-red-500"
          aria-hidden="true"
        />
        <span className="hidden tabular-nums sm:inline">
          {formatChip(fromIso)}
        </span>
        <span className="hidden text-slate-400 sm:inline" aria-hidden="true">
          →
        </span>
        <span className="hidden tabular-nums sm:inline">{formatChip(toIso)}</span>
        <span className="truncate tabular-nums sm:hidden">
          {formatChip(fromIso).slice(0, 10)} – {formatChip(toIso).slice(0, 10)}
        </span>
        <ChevronRight
          className={`ml-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-90" : "rotate-0"
          }`}
          aria-hidden="true"
        />
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              style={{
                position: "fixed",
                top: panelPos.top,
                left: panelPos.left,
                width: panelPos.width,
                zIndex: 80,
              }}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/50"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div>
                  <p
                    id={titleId}
                    className="text-sm font-semibold text-slate-900 dark:text-slate-50"
                  >
                    Período
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Elegí fechas y hora ·{" "}
                    {draft.picking === "from"
                      ? "seleccioná el inicio"
                      : "seleccioná el fin"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="px-3 pt-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <button
                    type="button"
                    aria-label="Mes anterior"
                    onClick={() =>
                      setViewMonth(new Date(year, month - 1, 1))
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {MONTHS[month]} {year}
                  </p>
                  <button
                    type="button"
                    aria-label="Mes siguiente"
                    onClick={() =>
                      setViewMonth(new Date(year, month + 1, 1))
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-0.5 px-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {WEEKDAYS.map((d) => (
                    <span key={d} className="py-1">
                      {d}
                    </span>
                  ))}
                </div>

                <div className="mt-0.5 grid grid-cols-7 gap-0.5 pb-2">
                  {cells.map((day, idx) => {
                    if (!day) {
                      return <span key={`e-${idx}`} className="h-9" />;
                    }
                    const isStart = sameDay(day, draft.from);
                    const isEnd = sameDay(day, draft.to);
                    const isEdge = isStart || isEnd;
                    const mid = inRange(day) && !isEdge;
                    const isToday = sameDay(day, new Date());
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => selectDay(day)}
                        className={`relative h-9 rounded-lg text-xs font-medium transition-colors ${
                          isEdge
                            ? "bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-sm shadow-red-500/25"
                            : mid
                              ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                              : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        } ${isToday && !isEdge ? "ring-1 ring-inset ring-red-300/70 dark:ring-red-500/40" : ""}`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                <TimeBlock
                  label="Desde"
                  active={draft.picking === "from"}
                  date={draft.from}
                  onFocusPick={() =>
                    setDraft((p) => ({ ...p, picking: "from" }))
                  }
                  onHour={(h) => setFromTime(h, draft.from.getMinutes())}
                  onMinute={(m) => setFromTime(draft.from.getHours(), m)}
                />
                <TimeBlock
                  label="Hasta"
                  active={draft.picking === "to"}
                  date={draft.to}
                  onFocusPick={() =>
                    setDraft((p) => ({ ...p, picking: "to" }))
                  }
                  onHour={(h) => setToTime(h, draft.to.getMinutes())}
                  onMinute={(m) => setToTime(draft.to.getHours(), m)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-9 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={apply}
                  className="h-9 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-4 text-xs font-semibold text-white shadow-sm shadow-red-500/25 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                >
                  Aplicar
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function TimeBlock({
  label,
  active,
  date,
  onFocusPick,
  onHour,
  onMinute,
}: {
  label: string;
  active: boolean;
  date: Date;
  onFocusPick: () => void;
  onHour: (h: number) => void;
  onMinute: (m: number) => void;
}) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minuteRaw = date.getMinutes();
  const minute =
    MINUTES.includes(String(minuteRaw).padStart(2, "0") as (typeof MINUTES)[number])
      ? String(minuteRaw).padStart(2, "0")
      : String(minuteRaw).padStart(2, "0");

  return (
    <button
      type="button"
      onClick={onFocusPick}
      className={`rounded-xl border p-2.5 text-left transition-colors ${
        active
          ? "border-red-300 bg-red-50/70 ring-1 ring-red-200 dark:border-red-500/40 dark:bg-red-500/10 dark:ring-red-500/20"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      }`}
    >
      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Clock className="h-3 w-3" aria-hidden="true" />
        {label}
      </p>
      <p className="mb-2 text-xs font-medium tabular-nums text-slate-800 dark:text-slate-100">
        {date.toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      </p>
      <div className="flex items-center gap-1">
        <select
          aria-label={`${label} hora`}
          value={hour}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onHour(Number(e.target.value))}
          className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-1 text-xs tabular-nums dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-xs font-semibold text-slate-400">:</span>
        <select
          aria-label={`${label} minutos`}
          value={minute}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onMinute(Number(e.target.value))}
          className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-1 text-xs tabular-nums dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          {/* incluir el minuto actual si no está en la grilla de 15' */}
          {!MINUTES.includes(minute as (typeof MINUTES)[number]) ? (
            <option value={minute}>{minute}</option>
          ) : null}
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </button>
  );
}

export default DateTimeRangeFilter;
