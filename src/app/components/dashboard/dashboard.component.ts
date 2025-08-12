import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MainLayoutComponent } from '../layout/main-layout.component';
import { User } from '../../models/auth.model';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardStats } from '../../models/dashboard.model';
import { LanguageService } from '../../services/extras/language.service';
import { KpiCardsComponent } from './kpi-cards/kpi-cards.component';
import { ActivityFeedComponent } from './widgets/activity-feed.component';
import { MovementChartComponent } from './widgets/movement-chart.component';
import { StockAlertsWidgetComponent } from './widgets/stock-alerts-widget.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MainLayoutComponent,
    KpiCardsComponent,
    ActivityFeedComponent,
    MovementChartComponent,
    StockAlertsWidgetComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  stats: DashboardStats | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dashboardService: DashboardService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadStats();
  }

  async onLogout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, we'll be redirected to login
    }
  }

  async loadStats(): Promise<void> {
    try {
      const response = await this.dashboardService.getStats();
      if (response?.result?.success && response.data) {
        this.stats = response.data;
      }
    } catch (error) {
      console.error('Error loading dashboard stats', error);
    }
  }

  t(key: string): string { return this.languageService.t(key); }
}
