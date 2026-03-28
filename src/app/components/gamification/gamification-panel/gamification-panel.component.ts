import { Component, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamificationService } from '../../../services/gamification.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { UserStat, Badge, UserBadge } from '../../../models/gamification.model';
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
      // Do not show error toast when data is empty; UI shows "No data" state.
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

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }
}
