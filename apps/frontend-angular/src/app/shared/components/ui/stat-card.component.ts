import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent } from './badge.component';

type StatCardStatus = 'default' | 'primary' | 'critical' | 'warning' | 'success' | 'info' | 'danger';

@Component({
  selector: 'ui-stat-card',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  template: `
    <div
      [class]="cardClasses"
      [class.cursor-pointer]="interactive"
      (click)="interactive ? onClick.emit() : null"
      [attr.role]="interactive ? 'button' : 'article'"
      [attr.aria-label]="label + ': ' + value"
    >
      <div class="flex justify-between items-start mb-4">
        <div class="flex gap-4 items-center">
          <!-- Icon -->
          <div class="stat-card-icon" [class]="iconBgClass">
            <span class="text-2xl">{{ icon }}</span>
          </div>
          
          <!-- Label & Value -->
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-0.5">
              {{ label }}
            </div>
            <div class="text-2xl font-bold font-mono tracking-tight">
              {{ value }}
            </div>
          </div>
        </div>

        <!-- Trend Badge -->
        @if (trend !== undefined && trend !== 0) {
          <ui-badge
            [variant]="trend > 0 ? 'success' : 'danger'"
            size="sm"
            customClass="ml-auto"
          >
            {{ trend > 0 ? '+' : '' }}{{ trend }}%
          </ui-badge>
        }
      </div>

      <!-- Subtext -->
      @if (subtext) {
        <div class="mt-auto border-t border-current/10 pt-3">
          <div class="text-xs font-medium opacity-75 truncate">
            {{ subtext }}
          </div>
        </div>
      }

      <!-- Active glow effect -->
      @if (interactive && active) {
        <div class="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      }
    </div>
  `,
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() subtext?: string;
  @Input() icon = '📊';
  @Input() trend?: number;
  @Input() status: StatCardStatus = 'default';
  @Input() interactive = false;
  @Input() active = false;
  @Output() onClick = new EventEmitter<void>();

  get cardClasses(): string {
    const base = 'stat-card relative overflow-hidden rounded-2xl border-2 p-5 transition-all duration-300';
    
    const statusStyles: Record<StatCardStatus, string> = {
      default: 'bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white',
      primary: 'bg-green-600 border-green-500 text-white',
      critical: 'bg-red-500 border-red-400 text-white',
      warning: 'bg-amber-500 border-amber-400 text-white',
      success: 'bg-emerald-500 border-emerald-400 text-white',
      info: 'bg-blue-500 border-blue-400 text-white',
      danger: 'bg-red-600 border-red-500 text-white',
    };

    const interactiveClass = this.interactive ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : '';
    const activeClass = this.active ? 'ring-2 ring-green-500 ring-offset-2' : '';

    return `${base} ${statusStyles[this.status]} ${interactiveClass} ${activeClass}`;
  }

  get iconBgClass(): string {
    return this.status === 'default' 
      ? 'bg-gray-100 dark:bg-slate-700' 
      : 'bg-white/20';
  }
}
