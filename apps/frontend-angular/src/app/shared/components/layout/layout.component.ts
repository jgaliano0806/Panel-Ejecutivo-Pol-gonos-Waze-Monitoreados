/**
 * LayoutComponent - Layout principal con sidebar y header
 * Equivalente a: apps/frontend/src/components/layout/AppLayout.tsx
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="flex h-screen bg-[var(--background)]">
      <!-- Sidebar -->
      <app-sidebar />

      <!-- Main content area -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Header -->
        <app-header />

        <!-- Content -->
        <main class="flex-1 overflow-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }
    `,
  ],
})
export class LayoutComponent {}
