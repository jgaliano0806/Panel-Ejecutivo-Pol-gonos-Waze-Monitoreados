---
description: frontend-component Crear componente React con TypeScript + Tailwind
---

tsximport { memo } from 'react';
import { LucideIcon } from 'lucide-react';

interface NombreProps {
  data: Tipo;
  onAction?: () => void;
  className?: string;
}

export const Nombre = memo<NombreProps>(({ data, onAction, className }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LucideIcon className="w-5 h-5 text-blue-500" />
      <span className="text-sm font-medium">{data.value}</span>
      {onAction && (
        <button
          onClick={onAction}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Action
        </button>
      )}
    </div>
  );
});

Nombre.displayName = 'Nombre';
Reglas:

TypeScript strict
Tailwind para estilos (NO CSS modules)
Lucide React para iconos
React.memo solo si performance issue
Props interface documentada
