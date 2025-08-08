import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CardContainerComponent } from './card-container.component';
import { DashboardService } from '@app/services/dashboard.service';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
  selector: 'app-dashboard-activity-feed',
  standalone: true,
  imports: [CommonModule, CardContainerComponent],
  template: `
    <app-dashboard-card [title]="t('recent_activity')">
      <div class="flow-root">
        <ul class="-mb-8">
          <li *ngFor="let activity of activities; let i = index">
            <div class="relative pb-8">
              <span *ngIf="i !== activities.length - 1" class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
              <div class="relative flex space-x-3">
                <div class="h-8 w-8 bg-primary rounded-full flex items-center justify-center ring-8 ring-white">
                  <span class="text-white text-xs" [innerHTML]="getIcon(activity.type)"></span>
                </div>
                <div class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p class="text-sm text-[var(--foreground)]">{{ activity.message }}</p>
                  </div>
                  <div class="text-right text-sm whitespace-nowrap text-primary">
                    {{ activity.time }}
                  </div>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </app-dashboard-card>
  `,
})
export class ActivityFeedComponent implements OnInit {
  activities: { id: number; type: string; message: string; time: string }[] = [];

  constructor(private dashboardService: DashboardService, private languageService: LanguageService, private sanitizer: DomSanitizer) {}

  async ngOnInit() {
    this.activities = await this.dashboardService.getRecentActivity();
  }

  getIcon(type: string): SafeHtml {
    switch (type) {
      case 'completed': return this.sanitizer.bypassSecurityTrustHtml(`
        <svg width='16' height='16' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M9 12l2 2 4-4'></path>
          <circle cx='12' cy='12' r='9' stroke-width='2' stroke='currentColor' fill='none'></circle>
        </svg>`);
      case 'created': return this.sanitizer.bypassSecurityTrustHtml(`
        <svg width='16' height='16' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 4v16m8-8H4'></path>
        </svg>`);
      case 'adjustment': return this.sanitizer.bypassSecurityTrustHtml(`
        <svg width='16' height='16' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'></path>
        </svg>`);
      default: return this.sanitizer.bypassSecurityTrustHtml(`
        <svg width='16' height='16' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <circle cx='12' cy='12' r='2' stroke-width='2'></circle>
        </svg>`);
    }
  }

  t(key: string): string { return this.languageService.t(key); }
}


