import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, NgIcon],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          (click)="closeOnBackdrop && close.emit()"
        ></div>

        <!-- Modal Content -->
        <div
          class="relative bg-veltrix-card rounded-2xl shadow-2xl border border-veltrix-border max-h-[90vh] overflow-hidden flex flex-col"
          [style.width]="width"
          [style.max-width]="maxWidth"
        >
          <!-- Header -->
          @if (title) {
            <div class="flex items-center justify-between p-6 border-b border-veltrix-border">
              <h2 class="text-xl font-bold text-veltrix-text">{{ title }}</h2>
              <button
                (click)="close.emit()"
                class="p-2 hover:bg-veltrix-bg rounded-lg transition-colors text-veltrix-muted hover:text-veltrix-text"
              >
                <ng-icon name="lucideX" size="20" />
              </button>
            </div>
          }

          <!-- Body -->
          <div class="p-6 overflow-y-auto flex-1">
            <ng-content></ng-content>
          </div>

          <!-- Footer (optional) -->
          @if (showFooter) {
            <div class="flex items-center justify-end gap-3 p-6 border-t border-veltrix-border bg-veltrix-bg/50">
              <ng-content select="[modal-footer]"></ng-content>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() width = '500px';
  @Input() maxWidth = '90vw';
  @Input() closeOnBackdrop = true;
  @Input() showFooter = true;
  @Output() close = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen) {
      this.close.emit();
    }
  }
}
