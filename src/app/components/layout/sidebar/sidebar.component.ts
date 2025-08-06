import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LanguageService } from '../../../services/extras/language.service';
import { environment } from '@environment';

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="fixed inset-y-0 left-0 z-50 w-64 bg-[#00113f] transform transition-transform duration-300 ease-in-out lg:translate-x-0 rounded-r-3xl shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-center h-16 px-4 bg-[#00113f] border-b border-[#3e66ea]/20">
        <div class="flex items-center">
          <div class="h-8 w-8 bg-[#3e66ea] rounded-lg flex items-center justify-center">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
          </div>
          <span class="ml-2 text-white font-semibold text-lg">eSTOCK</span>
        </div>
      </div>
      
      <!-- Navigation -->
      <nav class="flex-1 mt-4">
        <div class="px-4 space-y-1">
          <div *ngFor="let item of navigation" class="group">
            <a [routerLink]="item.href" 
               [class]="getItemClasses(item.href)"
               class="flex items-center px-4 py-2 text-sm font-medium rounded-xl group transition-all duration-200 cursor-pointer">
              
              <!-- Dashboard Icon -->
              <svg *ngIf="item.icon === 'LayoutDashboard'" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"></path>
              </svg>
              
              <!-- Package Open Icon -->
              <svg *ngIf="item.icon === 'PackageOpen'" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
              
              <!-- Package Icon -->
              <svg *ngIf="item.icon === 'Package'" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
              
              <!-- Download Icon -->
              <svg *ngIf="item.icon === 'Download'" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              
              <!-- Upload Icon -->
              <svg *ngIf="item.icon === 'Upload'" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v6m0 0l3-3m-3 3L9 7m11 4h-4.586a1 1 0 00-.707.293L9 17H5a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2z"></path>
              </svg>
              
              <!-- Edit Icon -->
              <svg *ngIf="item.icon === 'Edit'" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              
              <!-- Alert Triangle Icon -->
              <svg *ngIf="item.icon === 'AlertTriangle'" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              
              <!-- QR Code Icon -->
              <svg *ngIf="item.icon === 'QrCode'" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
              
              <!-- Trophy Icon -->
              <svg *ngIf="item.icon === 'Trophy'" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
              </svg>
              
              <!-- Monitor Icon -->
              <svg *ngIf="item.icon === 'Monitor'" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              
              <!-- Map Pin Icon -->
              <svg *ngIf="item.icon === 'MapPin'" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              
              <!-- Users Icon -->
              <svg *ngIf="item.icon === 'Users'" class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
              
              {{ t(item.name) }}
            </a>
          </div>
        </div>
      </nav>

      <!-- Footer with Logo and Version -->
      <div class="absolute bottom-0 left-0 right-0 p-4">
        <div class="flex flex-col items-center">
          <!-- Logo ePRAC -->
          <div class="flex items-center justify-center">
            <img 
              src="assets/ePRAC-Blanco.png" 
              alt="ePRAC Logo" 
              class="h-16 w-auto hover:opacity-80 transition-opacity duration-200"
              style="background: transparent; object-fit: contain;"
            />
          </div>
          
          <!-- Version -->
          <span class="text-white text-xs font-medium tracking-wide">
            {{ appVersion }}
          </span>
          
          <!-- Divider line -->
          <div class="w-full h-px bg-gradient-to-r from-transparent via-[#3e66ea]/30 to-transparent"></div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class SidebarComponent implements OnInit {
  navigation: NavigationItem[] = [
    { name: 'dashboard', href: '/', icon: 'LayoutDashboard' },
    { name: 'articles', href: '/articles', icon: 'PackageOpen' },
    { name: 'inventory', href: '/inventory', icon: 'Package' },
    { name: 'receiving_tasks', href: '/receiving-tasks', icon: 'Download' },
    { name: 'picking_tasks', href: '/picking-tasks', icon: 'Upload' },
    { name: 'stock_adjustments', href: '/stock-adjustments', icon: 'Edit' },
    { name: 'stock_alerts', href: '/stock-alerts', icon: 'AlertTriangle' },
    { name: 'barcode_generator', href: '/barcode-generator', icon: 'QrCode' },
    { name: 'performance', href: '/gamification', icon: 'Trophy' },
    { name: 'control_center', href: '/admin-control-center', icon: 'Monitor' },
    { name: 'locations', href: '/locations', icon: 'MapPin' },
    { name: 'user_management', href: '/users', icon: 'Users' },
  ];

  appVersion = 'v1.0.0';
  currentLocation: string = '/';

  constructor(
    private languageService: LanguageService,
    private router: Router
  ) {
    // Subscribe to router events to track current location
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentLocation = event.url;
      });
  }

  ngOnInit(): void {
    this.currentLocation = this.router.url;
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  getItemClasses(href: string): string {
    const isActive = this.currentLocation === href;
    return isActive
      ? 'bg-[#3e66ea] text-white shadow-lg transform scale-105'
      : 'text-white hover:text-white hover:bg-[#3e66ea]/30 hover:rounded-xl hover:transform hover:scale-105';
  }


}
