import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceivingTask } from '@app/models/receiving-task.model';
import { User } from '@app/models/user.model';
import { UserService } from '@app/services/user.service';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
	selector: 'app-receiving-task-list',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './receiving-task-list.component.html',
	styleUrls: ['./receiving-task-list.component.css']
})
export class ReceivingTaskListComponent {
	@Input() tasks: ReceivingTask[] = [];
	@Input() isLoading = false;
	@Output() refresh = new EventEmitter<void>();
	@Output() edit = new EventEmitter<ReceivingTask>();

	users: User[] = [];
	selectedTask: ReceivingTask | null = null;
	expandedItems: Set<number> = new Set(); // Track which items are expanded

	constructor(
		private userService: UserService,
		private receivingTaskService: ReceivingTaskService,
		private alertService: AlertService,
		private loadingService: LoadingService,
		private languageService: LanguageService
	) {
		this.loadUsers();
	}

	get t() {
		return this.languageService.t.bind(this.languageService);
	}

	async loadUsers(): Promise<void> {
		try {
			const response = await this.userService.getAll();
			if (response.result.success) {
				this.users = response.data;
			}
		} catch (error) {
			console.error('Error loading users:', error);
		}
	}

	getUserDisplayName(userId: string | null | undefined): string {
		if (!userId) return this.t('unassigned');
		const user = this.users.find(u => u.id === userId);
		if (!user) return userId;
		return user.first_name + ' ' + user.last_name || user.email;
	}

	getStatusBadge(status: string): { variant: string; className: string; text: string } {
		const statusConfig: { [key: string]: { variant: string; className: string; text: string } } = {
			open: { 
				variant: 'secondary', 
				className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
				text: this.t('open')
			},
			in_progress: { 
				variant: 'default', 
				className: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
				text: this.t('in_progress')
			},
			completed: { 
				variant: 'outline', 
				className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
				text: this.t('completed')
			},
			cancelled: { 
				variant: 'destructive', 
				className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
				text: this.t('cancelled')
			},
		};

		return statusConfig[status] || statusConfig['open'];
	}

	getPriorityBadge(priority: string): { variant: string; className: string; text: string } {
		const priorityConfig: { [key: string]: { variant: string; className: string; text: string } } = {
			normal: { 
				variant: 'outline', 
				className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
				text: this.t('normal')
			},
			high: { 
				variant: 'secondary', 
				className: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700',
				text: this.t('high')
			},
			urgent: { 
				variant: 'destructive', 
				className: 'bg-red-100 text-red-800 border-red-300 font-semibold dark:bg-red-900 dark:text-red-200 dark:border-red-700',
				text: this.t('urgent')
			},
		};

		return priorityConfig[priority] || priorityConfig['normal'];
	}

	onEdit(task: ReceivingTask): void {
		this.edit.emit(task);
	}

	onViewDetails(task: ReceivingTask): void {
		this.selectedTask = task;
	}

	closeDetails(): void {
		this.selectedTask = null;
		this.expandedItems.clear(); // Clear expanded items when closing modal
	}

	toggleItemExpansion(itemIndex: number): void {
		if (this.expandedItems.has(itemIndex)) {
			this.expandedItems.delete(itemIndex);
		} else {
			this.expandedItems.add(itemIndex);
		}
	}

	isItemExpanded(itemIndex: number): boolean {
		return this.expandedItems.has(itemIndex);
	}

	hasLotsOrSerials(item: any): boolean {
		return (
			(item.lotNumbers && item.lotNumbers.length > 0) ||
			(item.serialNumbers && item.serialNumbers.length > 0) ||
			(item.lot_numbers && item.lot_numbers.length > 0) ||
			(item.serial_numbers && item.serial_numbers.length > 0) ||
			(item.lots && item.lots.length > 0) ||
			(item.serials && item.serials.length > 0)
		);
	}

	getLotsForItem(item: any): any[] {
		// Support multiple data formats for lots
		if (item.lots && item.lots.length > 0) {
			return item.lots;
		}
		if (item.lotNumbers && item.lotNumbers.length > 0) {
			return item.lotNumbers.map((lot: string) => ({ lot_number: lot }));
		}
		if (item.lot_numbers && item.lot_numbers.length > 0) {
			return item.lot_numbers.map((lot: string) => ({ lot_number: lot }));
		}
		return [];
	}

	getSerialsForItem(item: any): any[] {
		// Support multiple data formats for serials
		if (item.serials && item.serials.length > 0) {
			return item.serials;
		}
		if (item.serialNumbers && item.serialNumbers.length > 0) {
			return item.serialNumbers.map((serial: string) => ({ serial_number: serial }));
		}
		if (item.serial_numbers && item.serial_numbers.length > 0) {
			return item.serial_numbers.map((serial: string) => ({ serial_number: serial }));
		}
		return [];
	}

	async updateTaskStatus(taskId: number, status: string): Promise<void> {
		// Validar que el estado sea uno de los permitidos
		const allowedStatuses = ['in_progress', 'completed', 'cancelled'];
		if (!allowedStatuses.includes(status)) {
			this.alertService.error(
				this.t('invalid_status'),
				this.t('error')
			);
			return;
		}

		try {
			this.loadingService.show();
			const response = await this.receivingTaskService.update(taskId, { status });
			if (response.result.success) {
				this.alertService.success(
					this.t('task_status_updated_successfully'),
					this.t('success')
				);
				this.closeDetails();
				// Emit event to refresh parent
				this.refresh.emit();
			} else {
				this.alertService.error(
					response.result.message || this.t('failed_to_update_task_status'),
					this.t('error')
				);
			}
		} catch (error) {
			this.alertService.error(
				this.t('failed_to_update_task_status'),
				this.t('error')
			);
		} finally {
			this.loadingService.hide();
		}
	}

	formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	formatDateTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
}
