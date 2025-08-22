import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge, OperatorStats, UserBadge } from '../../models/gamification.model';
import { AlertService } from '../../services/extras/alert.service';
import { LanguageService } from '../../services/extras/language.service';
import { GamificationService } from '../../services/gamification.service';
import { MainLayoutComponent } from "../layout/main-layout.component";
import { DataExportComponent, DataExportConfig } from '../shared/data-export/data-export.component';

// Extended interface to match API response
interface ExtendedOperatorStats extends OperatorStats {
  username: string;
  email: string;
  badges: (UserBadge & { badge: Badge })[];
}

@Component({
  selector: 'app-admin-control-center-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DataExportComponent, MainLayoutComponent],
  templateUrl: './admin-control-center-list.component.html',
  styleUrls: ['./admin-control-center-list.component.css']
})
export class AdminControlCenterListComponent implements OnInit {
  private gamificationService = inject(GamificationService);
  private alertService = inject(AlertService);
  private languageService = inject(LanguageService);

  operatorStats = signal<ExtendedOperatorStats[]>([]);
  isLoading = signal<boolean>(false);
  isExportDialogOpen = signal<boolean>(false);

  // Computed values for summary cards - matching React logic
  totalOperators = computed(() => this.operatorStats().length);
  
  totalTasksCompleted = computed(() => 
    this.operatorStats().reduce((sum, op) => 
      sum + (op.receiving_tasks_completed || 0) + (op.picking_tasks_completed || 0), 0
    )
  );
  
  // Calculate average accuracy only for operators with completed tasks
  averageAccuracy = computed(() => {
    const operatorsWithTasks = this.operatorStats().filter(op => (op.picking_tasks_completed || 0) > 0);
    if (operatorsWithTasks.length === 0) return 0;
    const totalAccuracy = operatorsWithTasks.reduce((sum, op) => sum + (op.pick_accuracy || 0), 0);
    return totalAccuracy / operatorsWithTasks.length;
  });
  
  totalBadgesEarned = computed(() => 
    this.operatorStats().reduce((sum, op) => sum + (op.badges?.length || 0), 0)
  );

  // Sort operators by performance score (combination of tasks completed and accuracy) - matching React logic
  sortedOperators = computed(() => {
    return [...this.operatorStats()].sort((a, b) => {
      const tasksA = (a.receiving_tasks_completed || 0) + (a.picking_tasks_completed || 0);
      const tasksB = (b.receiving_tasks_completed || 0) + (b.picking_tasks_completed || 0);
      
      // If no tasks completed, accuracy should be 0 for scoring
      const accuracyA = (a.picking_tasks_completed || 0) > 0 ? (a.pick_accuracy || 0) : 0;
      const accuracyB = (b.picking_tasks_completed || 0) > 0 ? (b.pick_accuracy || 0) : 0;
      
      const scoreA = tasksA * (accuracyA / 100);
      const scoreB = tasksB * (accuracyB / 100);
      
      return scoreB - scoreA;
    });
  });

  // Export data
  exportData = computed(() => 
    this.sortedOperators().map((operator, index) => {
      const totalTasks = (operator.receiving_tasks_completed || 0) + (operator.picking_tasks_completed || 0);
      const performanceScore = totalTasks * ((operator.picking_tasks_completed || 0) > 0 ? (operator.pick_accuracy || 0) : 0) / 100;
      const accuracyDisplay = this.getAccuracyDisplay(operator);
      
      return {
        rank: index + 1,
        username: operator.username || this.t('admin.unknown'),
        email: operator.email,
        totalTasks: totalTasks,
        receivingTasks: operator.receiving_tasks_completed || 0,
        pickingTasks: operator.picking_tasks_completed || 0,
        accuracy: accuracyDisplay.display,
        avgPickTimeMinutes: ((operator.avg_pick_time || 0) / 60).toFixed(1),
        totalPickTimeMinutes: ((operator.total_picking_time || 0) / 60).toFixed(1),
        badges: operator.badges.length,
        badgeNames: operator.badges.map(b => b.badge.name).join(', '),
        performanceScore: performanceScore.toFixed(1)
      };
    })
  );

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  get exportConfig(): DataExportConfig {
    return {
      title: this.t('admin.operator_performance'),
      endpoint: '/gamification/operator-stats/export',
      data: this.exportData(),
      filename: 'operator_performance_report'
    };
  }

  async ngOnInit() {
    await this.loadOperatorStats();
  }

  async loadOperatorStats() {
    this.isLoading.set(true);
    try {
      const statsResponse = await this.gamificationService.getOperatorStats();
      
      if (statsResponse.result.success) {
        // Use username and email directly from API response
        const extendedStats: ExtendedOperatorStats[] = statsResponse.data.map((stat: any) => {
          return {
            ...stat,
            badges: [] // Will be populated when badges endpoint is available
          };
        });
        
        this.operatorStats.set(extendedStats);
      } else {
        this.alertService.error(
          this.t('error'),
          this.t('admin.failed_to_load_operator_stats')
        );
      }
    } catch (error) {
      console.error('Error loading operator stats:', error);
      this.alertService.error(
        this.t('error'),
        this.t('admin.failed_to_load_operator_stats')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  getRankBadgeClass(rank: number): string {
    switch (rank) {
      case 1:
        return 'bg-amber-100 text-amber-800';
      case 2:
        return 'bg-gray-100 text-gray-800';
      case 3:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  }
  
  getTrophyClass(rank: number): string {
    switch (rank) {
      case 1:
        return 'text-amber-500';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-orange-400';
      default:
        return 'text-blue-500';
    }
  }

  trackByOperatorId(index: number, operator: ExtendedOperatorStats): string {
    return operator.user_id;
  }

  openExportDialog(): void {
    this.isExportDialogOpen.set(true);
  }

  closeExportDialog(): void {
    this.isExportDialogOpen.set(false);
  }

  // Helper function to get accurate precision display - matching React logic
  getAccuracyDisplay(operator: ExtendedOperatorStats): { display: string; value: number } {
    const pickingTasks = operator.picking_tasks_completed || 0;
    if (pickingTasks === 0) {
      return { value: 0, display: this.t('admin.not_available') };
    }
    const accuracy = operator.pick_accuracy || 0;
    return { value: accuracy, display: `${accuracy.toFixed(1)}%` };
  }
}
