/**
 * Sidebar Store - Estado del sidebar (expandido/colapsado)
 * Equivalente a: apps/frontend/src/stores/useSidebarStore.ts
 */
import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarStore {
  private _isExpanded = signal(true);

  readonly isExpanded = computed(() => this._isExpanded());

  toggle(): void {
    this._isExpanded.update((v) => !v);
  }

  setExpanded(value: boolean): void {
    this._isExpanded.set(value);
  }

  collapse(): void {
    this._isExpanded.set(false);
  }

  expand(): void {
    this._isExpanded.set(true);
  }
}
