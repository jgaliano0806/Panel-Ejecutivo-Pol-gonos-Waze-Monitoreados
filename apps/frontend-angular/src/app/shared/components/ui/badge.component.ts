import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'critical';
type BadgeSize = 'sm' | 'default' | 'lg';

@Component({
  selector: 'ui-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses">
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'default';
  @Input() size: BadgeSize = 'default';
  @Input() customClass = '';

  get badgeClasses(): string {
    const base = 'inline-flex items-center rounded-full border font-bold transition-all duration-200';
    
    const variants: Record<BadgeVariant, string> = {
      default: 'border-transparent bg-green-100 text-green-700 hover:bg-green-200',
      secondary: 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200',
      success: 'border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-sm',
      warning: 'border-transparent bg-yellow-100 text-yellow-700 hover:bg-yellow-200 shadow-sm',
      danger: 'border-transparent bg-red-100 text-red-700 hover:bg-red-200 shadow-sm',
      outline: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100',
      critical: 'border-2 border-red-400 bg-red-500 text-white font-black animate-pulse shadow-lg',
    };

    const sizes: Record<BadgeSize, string> = {
      sm: 'px-2 py-0.5 text-[10px]',
      default: 'px-3 py-1 text-xs',
      lg: 'px-4 py-1.5 text-sm',
    };

    return `${base} ${variants[this.variant]} ${sizes[this.size]} ${this.customClass}`;
  }
}
