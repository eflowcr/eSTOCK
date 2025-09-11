import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReceivingTask, ReceivingTaskItemRequest } from '@app/models/receiving-task.model';
import { User } from '@app/models/user.model';
import { UserService } from '@app/services/user.service';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
	selector: 'app-receiving-task-list',
	standalone: true,
	imports: [CommonModule, FormsModule],
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
	expandedItems: Set<number> = new Set(); 
	
	// Completion modal properties
	showCompletionModal = false;
	completionType: 'complete' | 'partial' | null = null;
	showAdjustmentDialog = false;
	editingQuantities: { [key: number]: any } = {};

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
		this.expandedItems.clear(); 
		this.closeCompletionModal();
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

	hasLots(item: any): boolean {
		return (
			(item.lotNumbers && item.lotNumbers.length > 0) ||
			(item.lot_numbers && item.lot_numbers.length > 0) ||
			(item.lots && item.lots.length > 0)
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

	// Completion modal methods
	openCompletionModal(): void {
		this.showCompletionModal = true;
		this.completionType = null;
	}

	closeCompletionModal(): void {
		this.showCompletionModal = false;
		this.completionType = null;
	}

	selectCompletionType(type: 'complete' | 'partial'): void {
		this.completionType = type;
		if (type === 'complete') {
			this.executeCompleteTask();
		} else {
			this.openAdjustmentDialog();
		}
	}


	openAdjustmentDialog(): void {
		this.showAdjustmentDialog = true;
		this.showCompletionModal = false;
		this.initializeEditingQuantities();
	}

	closeAdjustmentDialog(): void {
		this.showAdjustmentDialog = false;
		this.editingQuantities = {};
	}

	initializeEditingQuantities(): void {
		if (!this.selectedTask) return;
		
		this.selectedTask.items.forEach((item, index) => {
			// For items WITHOUT lots: we adjust the expected_qty directly
			// For items WITH lots: we adjust individual lot quantities
			this.editingQuantities[index] = {
				sku: item.sku,
				expected_qty: item.expected_qty,
				received_qty: this.hasLots(item) ? item.expected_qty : (item.received_qty || item.expected_qty),
				location: item.location,
				lots: item.lots ? [...item.lots.map(lot => ({
					...lot,
					received_quantity: (lot as any).received_quantity || lot.quantity
				}))] : [],
				serials: item.serials ? [...item.serials] : []
			};
		});
	}

	hasSerials(item: any): boolean {
		return item.serials && item.serials.length > 0;
	}

	updateQuantity(itemIndex: number, newQuantity: any): void {
		if (this.editingQuantities[itemIndex]) {
			// Allow any value including null/empty, but ensure it's within valid range
			if (newQuantity === null || newQuantity === undefined || newQuantity === '') {
				this.editingQuantities[itemIndex].received_qty = null;
			} else {
				const numValue = Number(newQuantity);
				this.editingQuantities[itemIndex].received_qty = isNaN(numValue) ? null : Math.max(0, numValue);
			}
		}
	}

	updateLotQuantity(itemIndex: number, lotIndex: number, newQuantity: any): void {
		if (this.editingQuantities[itemIndex] && this.editingQuantities[itemIndex].lots[lotIndex]) {
			// Allow any value including null/empty, but ensure it's within valid range
			if (newQuantity === null || newQuantity === undefined || newQuantity === '') {
				this.editingQuantities[itemIndex].lots[lotIndex].received_quantity = null;
			} else {
				const numValue = Number(newQuantity);
				this.editingQuantities[itemIndex].lots[lotIndex].received_quantity = isNaN(numValue) ? null : Math.max(0, numValue);
			}
		}
	}

	isValidAdjustment(): boolean {
		for (const itemIndex in this.editingQuantities) {
			const item = this.editingQuantities[itemIndex];
			const originalItem = this.selectedTask?.items[parseInt(itemIndex)];
			
			if (!originalItem) continue;
			
			// For items WITHOUT lots: validate received_qty doesn't exceed expected
			if (!this.hasLots(originalItem)) {
				if (item.received_qty < 0 || item.received_qty > originalItem.expected_qty) {
					return false;
				}
			} else {
				// For items WITH lots: validate individual lot quantities don't exceed expected
				if (item.lots && item.lots.length > 0) {
					for (const lot of item.lots) {
						if (lot.received_quantity < 0 || lot.received_quantity > lot.quantity) {
							return false;
						}
					}
				}
			}
		}
		return true;
	}

	async saveAdjustments(): Promise<void> {
		if (!this.selectedTask) return;

		// Validate adjustments before saving
		if (!this.isValidAdjustment()) {
			this.alertService.error(
				this.t('invalid_adjustments_cannot_save'),
				this.t('error')
			);
			return;
		}

		try {
			this.loadingService.show();
			const location = this.getTaskLocation();
			
			// Process each item with adjustments
			for (const [indexStr, editedItem] of Object.entries(this.editingQuantities)) {
				const index = parseInt(indexStr);
				const originalItem = this.selectedTask.items[index];
				const typedEditedItem = editedItem as any;
				
				let itemRequest: ReceivingTaskItemRequest;
				
				// Different logic based on whether item has lots or not
				if (this.hasLots(originalItem)) {
					// For items WITH lots: use lot quantities, calculate total received_qty from lots
					const totalReceivedFromLots = typedEditedItem.lots.reduce((sum: number, lot: any) => 
						sum + (lot.received_quantity || 0), 0);
					
					itemRequest = {
						sku: originalItem.sku,
						expected_qty: originalItem.expected_qty, 
						location: typedEditedItem.location,
						received_qty: totalReceivedFromLots, 
						status: 'completed',
						lots: typedEditedItem.lots.map((lot: any) => ({
							lot_number: lot.lot_number,
							sku: originalItem.sku,
							quantity: lot.received_quantity, 
							received_quantity: lot.received_quantity,
							expiration_date: lot.expiration_date,
							status: 'received'
						})),
						serials: typedEditedItem.serials.map((serial: any) => ({
							serial_number: serial.serial_number,
							sku: originalItem.sku,
							status: 'received'
						}))
					};
				} else {
					itemRequest = {
						sku: originalItem.sku,
						expected_qty: typedEditedItem.received_qty, 
						location: typedEditedItem.location,
						received_qty: typedEditedItem.received_qty,
						status: 'completed',
						lots: [],
						serials: typedEditedItem.serials.map((serial: any) => ({
							serial_number: serial.serial_number,
							sku: originalItem.sku,
							status: 'received'
						}))
					};
				}

				const response = await this.receivingTaskService.completeReceivingLine(
					this.selectedTask.id, 
					location, 
					itemRequest
				);

				if (!response.result.success) {
					this.alertService.error(
						response.result.message || this.t('failed_to_save_adjustments'),
						this.t('error')
					);
					return;
				}
			}

			this.alertService.success(
				this.t('adjustments_saved_successfully'),
				this.t('success')
			);
			this.closeAdjustmentDialog();
			this.closeDetails();
			this.refresh.emit();

		} catch (error) {
			this.alertService.error(
				this.t('failed_to_save_adjustments'),
				this.t('error')
			);
		} finally {
			this.loadingService.hide();
		}
	}

	async executeCompleteTask(): Promise<void> {
		if (!this.selectedTask) return;

		try {
			this.loadingService.show();
			const location = this.getTaskLocation();
			const response = await this.receivingTaskService.completeFullTask(this.selectedTask.id, location);
			
			if (response.result.success) {
				this.alertService.success(
					this.t('task_completed_successfully'),
					this.t('success')
				);
				this.closeDetails();
				this.refresh.emit();
			} else {
				this.alertService.error(
					response.result.message || this.t('failed_to_complete_task'),
					this.t('error')
				);
			}
		} catch (error) {
			this.alertService.error(
				this.t('failed_to_complete_task'),
				this.t('error')
			);
		} finally {
			this.loadingService.hide();
		}
	}

	getTaskLocation(): string {
		// Get the first item's location or a default location
		return this.selectedTask?.items[0]?.location || 'DEFAULT';
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

	async completeFullTask(taskId: number, location: string): Promise<void> {
		try {
			this.loadingService.show();
			const response = await this.receivingTaskService.completeFullTask(taskId, location);
			if (response.result.success) {
				this.alertService.success(
					this.t('full_task_completed_successfully'),
					this.t('success')
				);
				this.closeDetails();
				this.refresh.emit();
			} else {
				this.alertService.error(
					response.result.message || this.t('failed_to_complete_full_task'),
					this.t('error')
				);
			}
		} catch (error) {
			this.alertService.error(
				this.t('failed_to_complete_full_task'),
				this.t('error')
			);
		} finally {
			this.loadingService.hide();
		}
	}

	async completeReceivingLine(taskId: number, location: string, item: ReceivingTaskItemRequest): Promise<void> {
		try {
			this.loadingService.show();
			const response = await this.receivingTaskService.completeReceivingLine(taskId, location, item);
			if (response.result.success) {
				this.alertService.success(
					this.t('receiving_line_completed_successfully'),
					this.t('success')
				);
				this.closeDetails();
				this.refresh.emit();
			} else {
				this.alertService.error(
					response.result.message || this.t('failed_to_complete_receiving_line'),
					this.t('error')
				);
			}
		} catch (error) {
			this.alertService.error(
				this.t('failed_to_complete_receiving_line'),
				this.t('error')
			);
		} finally {
			this.loadingService.hide();
		}
	}
}
