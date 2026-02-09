import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="buttonClasses"
      (click)="onClick.emit($event)"
    >
      @if (loading) {
        <span class="animate-spin mr-2">⏳</span>
      }
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() customClass = '';
  @Output() onClick = new EventEmitter<MouseEvent>();

  get buttonClasses(): string {
    const base = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-lg hover:shadow-xl',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600',
      danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-lg hover:shadow-xl',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800',
      outline: 'border-2 border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-gray-300 dark:border-slate-600 dark:text-gray-300',
      success: 'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500 shadow-lg',
      warning: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 shadow-lg',
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
      icon: 'p-2 w-10 h-10',
    };

    const disabledClass = this.disabled ? 'opacity-50 cursor-not-allowed' : '';

    return `${base} ${variants[this.variant]} ${sizes[this.size]} ${disabledClass} ${this.customClass}`;
  }
}
