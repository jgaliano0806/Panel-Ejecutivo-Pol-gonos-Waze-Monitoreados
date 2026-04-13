import React from "react";
import { PlusCircle, Trash2, X } from "lucide-react";

interface MapContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCreateZone: () => void;
  onClearMap?: () => void;
}

export const MapContextMenu: React.FC<MapContextMenuProps> = ({
  x,
  y,
  onClose,
  onCreateZone,
  onClearMap,
}) => {
  return (
    <>
      <div
        className="fixed inset-0 z-[10000]"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-[10001] w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 py-1 animate-in fade-in zoom-in duration-100"
        style={{ top: y, left: x }}
      >
        <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700 mb-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Acciones de Mapa
          </p>
        </div>

        <button
          onClick={() => {
            onCreateZone();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Crear zona peligrosa aquí</span>
        </button>

        {onClearMap && (
          <button
            onClick={() => {
              onClearMap();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Limpiar incidentes</span>
          </button>
        )}

        <div className="h-px bg-gray-100 dark:bg-slate-700 my-1" />
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <X className="h-4 w-4" />
          <span>Cerrar</span>
        </button>
      </div>
    </>
  );
};
