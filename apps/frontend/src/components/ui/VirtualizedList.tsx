import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * Props genéricas para lista virtualizada
 */
interface VirtualizedListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    estimateSize?: number;
    overscan?: number;
    className?: string;
    itemClassName?: string;
    emptyMessage?: string;
    emptyIcon?: React.ReactNode;
}

/**
 * Componente de lista virtualizada genérico
 * Renderiza solo los items visibles para mejor performance
 */
export function VirtualizedList<T>({
    items,
    renderItem,
    estimateSize = 120,
    overscan = 5,
    className = '',
    itemClassName = '',
    emptyMessage = 'No hay elementos para mostrar',
    emptyIcon,
}: VirtualizedListProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => estimateSize,
        overscan,
    });

    // Función para scroll a un índice específico
    const scrollToIndex = useCallback((index: number) => {
        virtualizer.scrollToIndex(index, {
            align: 'center',
            behavior: 'smooth',
        });
    }, [virtualizer]);

    // Si no hay items, mostrar mensaje vacío
    if (items.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                {emptyIcon}
                <p className="text-gray-600 text-lg mt-4">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div
            ref={parentRef}
            className={`h-[calc(100vh-350px)] overflow-auto ${className}`}
            style={{ contain: 'strict' }}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    const item = items[virtualRow.index];
                    if (!item) return null;

                    return (
                        <div
                            key={virtualRow.key}
                            className={itemClassName}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            {renderItem(item, virtualRow.index)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Hook para obtener funciones de scroll en lista virtualizada
 */
export function useVirtualizedScroll<T>(
    items: T[],
    findFn: (item: T) => boolean
) {
    const scrollToItem = useCallback((findItem: (item: T) => boolean) => {
        const index = items.findIndex(findItem);
        if (index !== -1) {
            // Esto se usará con el ref del virtualizer
            return index;
        }
        return -1;
    }, [items]);

    return { scrollToItem };
}

export default VirtualizedList;
