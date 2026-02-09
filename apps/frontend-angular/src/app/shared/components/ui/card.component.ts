import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
      [class]="customClass"
    >
      <ng-content />
    </div>
  `,
})
export class CardComponent {
  @Input() customClass = '';
}

@Component({
  selector: 'ui-card-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col space-y-1.5 p-6" [class]="customClass">
      <ng-content />
    </div>
  `,
})
export class CardHeaderComponent {
  @Input() customClass = '';
}

@Component({
  selector: 'ui-card-title',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h3 class="text-2xl font-black leading-none tracking-tight" [class]="customClass">
      <ng-content />
    </h3>
  `,
})
export class CardTitleComponent {
  @Input() customClass = '';
}

@Component({
  selector: 'ui-card-description',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p class="text-sm text-gray-500 dark:text-gray-400" [class]="customClass">
      <ng-content />
    </p>
  `,
})
export class CardDescriptionComponent {
  @Input() customClass = '';
}

@Component({
  selector: 'ui-card-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 pt-0" [class]="customClass">
      <ng-content />
    </div>
  `,
})
export class CardContentComponent {
  @Input() customClass = '';
}

@Component({
  selector: 'ui-card-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center p-6 pt-0" [class]="customClass">
      <ng-content />
    </div>
  `,
})
export class CardFooterComponent {
  @Input() customClass = '';
}

// Export all card components
export const CARD_COMPONENTS = [
  CardComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardDescriptionComponent,
  CardContentComponent,
  CardFooterComponent,
];
