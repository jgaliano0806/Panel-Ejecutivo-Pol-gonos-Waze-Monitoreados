---
description: virtualized-list Virtualización para listas largas
---

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function PolygonList({ polygons }: { polygons: Polygon[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: polygons.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[calc(100vh-200px)] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const polygon = polygons[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <PolygonCard polygon={polygon} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
Cuándo usar:

Listas >100 items
Scrolling performance crítico

NO usar:

Listas pequeñas (<50)
Grids complejos
