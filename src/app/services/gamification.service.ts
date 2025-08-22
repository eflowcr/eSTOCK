import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { 
	UserStat, 
	Badge, 
	UserBadge, 
	CompleteTasks, 
	GamificationStats, 
	OperatorStats 
} from '@app/models/gamification.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/gamification';
export const GAMIFICATION_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class GamificationService {
	constructor(private fetchService: FetchService) {}

	/**
	 * @description Get user gamification stats
	 * @returns Promise<ApiResponse<UserStat>>
	 */
	async getStats(): Promise<ApiResponse<UserStat>> {
		return await this.fetchService.get<ApiResponse<UserStat>>({
			API_Gateway: `${GAMIFICATION_URL}/stats`,
		});
	}

	/**
	 * @description Get user badges
	 * @returns Promise<ApiResponse<Badge[]>>
	 */
	async getBadges(): Promise<ApiResponse<Badge[]>> {
		return await this.fetchService.get<ApiResponse<Badge[]>>({
			API_Gateway: `${GAMIFICATION_URL}/badges`,
		});
	}

	/**
	 * @description Get all available badges
	 * @returns Promise<ApiResponse<Badge[]>>
	 */
	async getAllBadges(): Promise<ApiResponse<Badge[]>> {
		return await this.fetchService.get<ApiResponse<Badge[]>>({
			API_Gateway: `${GAMIFICATION_URL}/all-badges`,
		});
	}

	/**
	 * @description Complete a task and update stats
	 * @param taskData Task completion data
	 * @returns Promise<ApiResponse<UserBadge[]>>
	 */
	async completeTasks(taskData: CompleteTasks): Promise<ApiResponse<UserBadge[]>> {
		return await this.fetchService.post<ApiResponse<UserBadge[]>>({
			API_Gateway: `${GAMIFICATION_URL}/complete-tasks`,
			values: taskData,
		});
	}

	/**
	 * @description Get all operators stats (admin only)
	 * @returns Promise<ApiResponse<OperatorStats[]>>
	 */
	async getOperatorStats(): Promise<ApiResponse<OperatorStats[]>> {
		return await this.fetchService.get<ApiResponse<OperatorStats[]>>({
			API_Gateway: `${GAMIFICATION_URL}/operator-stats`,
		});
	}


	/**
	 * @description Get badge progress for a specific badge type
	 * @param badgeType Badge rule type
	 * @param stats User stats
	 * @param badge Badge criteria
	 * @returns Progress percentage (0-100)
	 */
	getBadgeProgress(badgeType: string, stats: UserStat, badge: Badge): number {
		const criteria = badge.criteria;
		
		switch (badgeType) {
			case 'perfect_picker':
				if (criteria.pickingTasks && criteria.accuracy) {
					const taskProgress = (stats.picking_tasks_completed / criteria.pickingTasks) * 100;
					const accuracyProgress = (stats.pick_accuracy / criteria.accuracy) * 100;
					return Math.min(100, Math.min(taskProgress, accuracyProgress));
				}
				break;
			
			case 'quick_receiver':
				if (criteria.receivingTasks) {
					return Math.min(100, (stats.receiving_tasks_completed / criteria.receivingTasks) * 100);
				}
				break;
			
			case 'speed_demon':
				if (criteria.pickingTasks) {
					return Math.min(100, (stats.picking_tasks_completed / criteria.pickingTasks) * 100);
				}
				break;
			
			case 'accuracy_master':
				if (criteria.totalTasks && criteria.accuracy) {
					const totalTasks = stats.picking_tasks_completed + stats.receiving_tasks_completed;
					const taskProgress = (totalTasks / criteria.totalTasks) * 100;
					const accuracyProgress = (stats.pick_accuracy / criteria.accuracy) * 100;
					return Math.min(100, Math.min(taskProgress, accuracyProgress));
				}
				break;
			
			case 'task_champion':
				if (criteria.totalTasks) {
					const totalTasks = stats.picking_tasks_completed + stats.receiving_tasks_completed;
					return Math.min(100, (totalTasks / criteria.totalTasks) * 100);
				}
				break;
		}
		
		return 0;
	}
}
