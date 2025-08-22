import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { GamificationService } from '../../../services/gamification.service';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { DataExportComponent, DataExportConfig } from '../../shared/data-export/data-export.component';
import { GamificationPanelComponent } from '../gamification-panel/gamification-panel.component';
import { UserStat, Badge } from '../../../models/gamification.model';

@Component({
  selector: 'app-gamification-management',
  standalone: true,
  imports: [
    CommonModule, 
    GamificationPanelComponent,
    DataExportComponent,
    MainLayoutComponent
  ],
  templateUrl: './gamification-management.component.html',
  styleUrls: ['./gamification-management.component.css']
})
export class GamificationManagementComponent implements OnInit {
  @ViewChild(GamificationPanelComponent) gamificationPanel!: GamificationPanelComponent;
  
  isLoading = false;
  isExportDialogOpen = false;

  // Export configuration
  exportConfig: DataExportConfig = {
    title: 'Export My Badges & Progress',
    endpoint: '',
    data: [],
    filename: 'my_gamification_data'
  };

  constructor(
    private gamificationService: GamificationService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private authService: AuthorizationService
  ) {}

  ngOnInit(): void {
    // Component initialization - data is loaded by child component
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  private async prepareExportData(): Promise<any[]> {
    if (!this.gamificationPanel) {
      return [];
    }

    const stats = this.gamificationPanel.stats();
    const userBadges = this.gamificationPanel.userBadges();
    const allBadges = this.gamificationPanel.allBadges();
    
    if (!stats && userBadges.length === 0) {
      return [];
    }

    const exportData = [];

    // Add user statistics
    if (stats) {
      exportData.push({
        type: 'Statistics',
        level: this.gamificationPanel.level(),
        receiving_tasks: stats.receiving_tasks_completed || 0,
        picking_tasks: stats.picking_tasks_completed || 0,
        pick_accuracy: stats.pick_accuracy || 100,
        avg_pick_time: stats.avg_pick_time || 0,
        created_at: stats.created_at,
        updated_at: stats.updated_at
      });
    }

    // Add earned badges
    userBadges.forEach(userBadge => {
      exportData.push({
        type: 'Earned Badge',
        badge_name: userBadge.badge.name,
        badge_description: userBadge.badge.description,
        badge_emoji: userBadge.badge.emoji,
        earned_date: userBadge.awarded_at,
        rule_type: userBadge.badge.rule_type,
        criteria: userBadge.badge.criteria
      });
    });

    // Add badge progress for unearned badges
    const unlockedIds = this.gamificationPanel.unlockedBadgeIds();
    allBadges.forEach(badge => {
      if (!unlockedIds.has(badge.id)) {
        const progress = this.gamificationPanel.getBadgeProgress(badge);
        exportData.push({
          type: 'Badge Progress',
          badge_name: badge.name,
          badge_description: badge.description,
          badge_emoji: badge.emoji,
          progress_percentage: Math.round(progress),
          rule_type: badge.rule_type,
          criteria: badge.criteria,
          status: 'In Progress'
        });
      }
    });

    return exportData;
  }

  async openExportDialog(): Promise<void> {
    const exportData = await this.prepareExportData();
    
    if (exportData.length === 0) {
      this.alertService.warning(
        this.t('gamification.export_warning'),
        this.t('gamification.no_data_to_export')
      );
      return;
    }

    this.exportConfig.data = exportData;
    this.isExportDialogOpen = true;
  }

  closeExportDialog(): void {
    this.isExportDialogOpen = false;
  }

  onExportSuccess(): void {
    this.closeExportDialog();
  }

  onRefresh(): void {
    if (this.gamificationPanel) {
      this.gamificationPanel.loadGamificationData();
    }
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}
