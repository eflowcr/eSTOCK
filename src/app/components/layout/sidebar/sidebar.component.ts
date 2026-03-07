import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { NavigationItem, NavigationItems } from '../../../models/navigation.model';
import { LanguageService } from '../../../services/extras/language.service';
import { NavigationService } from '../../../services/extras/navigation.service';
import { SidebarService } from '@app/services';

interface SidebarSection {
  titleKey: string;
  items: NavigationItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div
      class="fixed bottom-3 left-3 top-3 z-40 hidden w-64 flex-col rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-transform duration-200 ease-in-out md:flex md:translate-x-0"
      [class.-translate-x-full]="collapsed"
      [class.md:translate-x-0]="!collapsed"
    >
      <div class="flex h-full w-full flex-col">
        <div class="flex flex-col gap-2 p-2" data-sidebar="header">
          <a routerLink="/dashboard" class="flex h-12 items-center gap-2 rounded-md px-2 font-semibold text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            </div>
            <span class="text-base">eSTOCK</span>
          </a>
        </div>
        <div class="flex min-h-0 flex-1 flex-col overflow-auto p-2">
          <nav class="flex w-full flex-col gap-4">
            <section *ngFor="let section of sections" class="flex flex-col gap-1">
              <h3 class="px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {{ t(section.titleKey) }}
              </h3>
              <a
                *ngFor="let item of section.items"
                [routerLink]="item.href"
                routerLinkActive="bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                [routerLinkActiveOptions]="{ exact: item.href === '/' }"
                class="flex items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-[15px] outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
              <svg *ngIf="item.icon === 'LayoutDashboard'" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"></path>
              </svg>
              
              <!-- Package Open Icon -->
              <svg *ngIf="item.icon === 'PackageOpen'" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
              
              <!-- Package Icon -->
              <svg *ngIf="item.icon === 'Package'" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
              
              <!-- Download Icon -->
              <svg *ngIf="item.icon === 'Download'" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              
              <!-- Upload Icon -->
              <svg *ngIf="item.icon === 'Upload'" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v6m0 0l3-3m-3 3L9 7m11 4h-4.586a1 1 0 00-.707.293L9 17H5a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2z"></path>
              </svg>
              
              <!-- Edit Icon -->
              <svg *ngIf="item.icon === 'Edit'" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              
              <!-- Alert Triangle Icon -->
              <svg *ngIf="item.icon === 'AlertTriangle'" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              
              <!-- QR Code Icon -->
              <svg *ngIf="item.icon === 'QrCode'" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
              
              <!-- Trophy Icon -->
              <svg *ngIf="item.icon === 'Trophy'" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
              </svg>
              
              <!-- Monitor Icon -->
              <svg *ngIf="item.icon === 'Monitor'" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              
              <!-- Map Pin Icon -->
              <svg *ngIf="item.icon === 'MapPin'" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              
              <!-- Users Icon -->
              <svg *ngIf="item.icon === 'Users'" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
              
              {{ t(item.name) }}
              </a>
            </section>
          </nav>
        </div>
        <div class="flex flex-col gap-2 border-t border-sidebar-border p-2" data-sidebar="footer">
          <div class="flex flex-col items-center gap-1 pt-2">
            <img src="assets/ePRAC-Blanco.png" alt="ePRAC" class="h-10 w-auto opacity-90 dark:invert-0 invert" style="background: transparent; object-fit: contain;" />
            <span class="text-xs text-muted-foreground">{{ appVersion }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class SidebarComponent implements OnInit, OnDestroy {
  navigation: NavigationItems = [];
  sections: SidebarSection[] = [];
  appVersion = 'v1.0.0';
  collapsed = false;
  private sub?: Subscription;

  constructor(
    private languageService: LanguageService,
    private router: Router,
    private navigationService: NavigationService,
    private sidebarService: SidebarService,
  ) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {});
  }

  ngOnInit(): void {
    this.navigation = this.navigationService.getItems();
    this.sections = this.buildSections(this.navigation);
    this.sub = this.sidebarService.collapsed$.subscribe((c) => (this.collapsed = c));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  private buildSections(items: NavigationItems): SidebarSection[] {
    const sectionConfig: Array<{ titleKey: string; hrefs: string[] }> = [
      { titleKey: 'sidebar.section.overview', hrefs: ['/'] },
      {
        titleKey: 'sidebar.section.quick_actions',
        hrefs: ['/receiving-tasks', '/picking-tasks', '/stock-adjustments', '/stock-alerts'],
      },
      {
        titleKey: 'sidebar.section.general_management',
        hrefs: ['/articles', '/inventory', '/locations', '/barcode-generator'],
      },
      {
        titleKey: 'sidebar.section.administration',
        hrefs: ['/gamification', '/admin-control-center', '/users'],
      },
    ];

    const itemByHref = new Map(items.map((item) => [item.href, item]));
    const assigned = new Set<string>();

    const sections = sectionConfig
      .map((section) => {
        const sectionItems = section.hrefs
          .map((href) => itemByHref.get(href))
          .filter((item): item is NavigationItem => Boolean(item));
        sectionItems.forEach((item) => assigned.add(item.href));
        return { titleKey: section.titleKey, items: sectionItems };
      })
      .filter((section) => section.items.length > 0);

    const remainingItems = items.filter((item) => !assigned.has(item.href));
    if (remainingItems.length) {
      sections.push({
        titleKey: 'sidebar.section.more',
        items: [...remainingItems],
      });
    }

    return sections;
  }
}
