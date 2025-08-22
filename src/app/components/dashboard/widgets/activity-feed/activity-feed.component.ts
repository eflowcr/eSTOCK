import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DashboardService } from '@app/services/dashboard.service';
import { LanguageService } from '@app/services/extras/language.service';
import { CardContainerComponent } from '../card-container/card-container.component';

@Component({
  selector: 'app-dashboard-activity-feed',
  standalone: true,
  imports: [CommonModule, CardContainerComponent],
  templateUrl: './activity-feed.component.html'
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


