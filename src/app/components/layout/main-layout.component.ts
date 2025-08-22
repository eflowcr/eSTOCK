import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { AlertComponent } from '../shared/extras/alert/alert.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent, AlertComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Alert Component -->
      <app-alert></app-alert>
      
      <!-- Sidebar -->
      <app-sidebar></app-sidebar>
      
      <!-- Main Content Area -->
      <div class="lg:pl-64">
        <!-- Topbar -->
        <app-topbar></app-topbar>
        
        <!-- Main Content -->
        <main class="flex-1 pb-8">
          <div class="py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <ng-content></ng-content>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: []
})
export class MainLayoutComponent {
  constructor() {}
}
