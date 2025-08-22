export interface UserStat {
	id: number;
	user_id: string;
	receiving_tasks_completed: number;
	picking_tasks_completed: number;
	avg_pick_time: number;
	pick_accuracy: number;
	total_picking_time: number;
	correct_picks: number;
	total_picks: number;
	created_at: string;
	updated_at: string;
}

export interface BadgeCriteria {
	pickingTasks?: number;
	receivingTasks?: number;
	accuracy?: number;
	avgTime?: number;
	totalTasks?: number;
}

export interface Badge {
	id: number;
	name: string;
	description: string;
	emoji: string;
	rule_type: string;
	criteria: BadgeCriteria;
	created_at: string;
}

export interface UserBadge {
	id: number;
	user_id: string;
	badge_id: number;
	awarded_at: string;
}

export interface CompleteTasks {
	task_type: 'picking' | 'receiving';
	completion_time: number;
	accuracy?: number;
}

export interface GamificationStats {
	user_stats: UserStat;
	badges: Badge[];
	total_tasks: number;
	rank: number;
}

export interface OperatorStats extends UserStat {
	user: {
		id: string;
		email: string;
		first_name: string;
		last_name: string;
		role: string;
	};
	badges: {
		id: number;
		user_id: string;
		badge_id: number;
		awarded_at: string;
		badge: Badge;
	}[];
}
