import { Component, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamificationService } from '../../../services/gamification.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { UserStat, Badge, UserBadge, CompleteTasks } from '../../../models/gamification.model';
import { Subject } from 'rxjs';

interface UserBadgeWithBadge extends UserBadge {
  badge: Badge;
}

@Component({
  selector: 'app-gamification-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gamification-panel.component.html',
  styleUrls: ['./gamification-panel.component.css']
})
export class GamificationPanelComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Expose Math object for template usage
  Math = Math;
  
  // Signals for reactive state management
  stats = signal<UserStat | null>(null);
  userBadges = signal<UserBadgeWithBadge[]>([]);
  allBadges = signal<Badge[]>([]);
  isLoading = signal(false);
  isCompletingTask = signal(false);

  // Computed values
  level = computed(() => {
    const currentStats = this.stats();
    if (!currentStats) return 1;
    const totalTasks = currentStats.picking_tasks_completed + currentStats.receiving_tasks_completed;
    return Math.floor(totalTasks / 10) + 1;
  });

  unlockedBadgeIds = computed(() => 
    new Set(this.userBadges().map(ub => ub.badge_id))
  );

  constructor(
    private gamificationService: GamificationService,
    private alertService: AlertService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.loadGamificationData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  async loadGamificationData(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      const [statsResponse, badgesResponse, allBadgesResponse] = await Promise.all([
        this.gamificationService.getStats(),
        this.gamificationService.getBadges(),
        this.gamificationService.getAllBadges()
      ]);

      if (statsResponse.result.success && statsResponse.data) {
        this.stats.set(statsResponse.data);
      }

      if (badgesResponse.result.success && badgesResponse.data) {
        // Transform badges to include badge details
        const userBadgesWithDetails = await this.transformUserBadges(badgesResponse.data);
        this.userBadges.set(userBadgesWithDetails);
      }

      if (allBadgesResponse.result.success && allBadgesResponse.data) {
        this.allBadges.set(allBadgesResponse.data);
      }
    } catch (error: any) {
      console.error('Error loading gamification data:', error);
      this.alertService.error(
        this.t('gamification.errorLoading'),
        error.message || this.t('gamification.loadError')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private async transformUserBadges(userBadges: Badge[]): Promise<UserBadgeWithBadge[]> {
    return userBadges.map(badge => ({
      id: badge.id,
      user_id: '',
      badge_id: badge.id,
      awarded_at: badge.created_at,
      badge: badge
    }));
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  getBadgeProgress(badge: Badge): number {
    const currentStats = this.stats();
    if (!currentStats) return 0;
    
    return this.gamificationService.getBadgeProgress(badge.rule_type, currentStats, badge);
  }

  async completeTask(taskType: 'picking' | 'receiving'): Promise<void> {
    this.isCompletingTask.set(true);
    
    try {
      const taskData: CompleteTasks = {
        task_type: taskType,
        completion_time: Math.floor(Math.random() * 120) + 30, // 30-150 seconds
      };

      if (taskType === 'picking') {
        taskData.accuracy = Math.random() > 0.2 ? 100 : Math.floor(Math.random() * 20) + 80; // 80-100% accuracy
      }

      const response = await this.gamificationService.completeTasks(taskData);
      
      if (response.result.success) {
        // Show success message
        this.alertService.success(
          this.t('gamification.taskCompleted'),
          this.t('gamification.statsUpdated')
        );

        // Check for new badges
        if (response.data && response.data.length > 0) {
          response.data.forEach((userBadge) => {
            const badgeInfo = this.allBadges().find(b => b.id === userBadge.badge_id);
            if (badgeInfo) {
              this.alertService.success(
                `${badgeInfo.emoji} ${badgeInfo.name}`,
                this.t('gamification.badgeEarned')
              );
            }
          });
        }

        // Reload data to reflect changes
        await this.loadGamificationData();
      } else {
        throw new Error(response.result.message || 'Task completion failed');
      }
    } catch (error: any) {
      console.error('Error completing task:', error);
      this.alertService.error(
        this.t('gamification.taskError'),
        error.message || this.t('common.error.title')
      );
    } finally {
      this.isCompletingTask.set(false);
    }
  }

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }
}
