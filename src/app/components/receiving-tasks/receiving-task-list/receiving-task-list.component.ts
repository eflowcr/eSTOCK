import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReceivingTask, ReceivingTaskItemRequest } from '@app/models/receiving-task.model';
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

	selectedTask: ReceivingTask | null = null;
	expandedItems: Set<number> = new Set(); 
	
	// Propiedades del modal de ajuste
	showAdjustmentDialog = false;
	showCloseConfirmation = false;
	editingQuantities: { [key: number]: any } = {};
	newLotData: { [key: number]: { lot_number: string; quantity: number; expiration_date?: string } } = {};
	newSerialData: { [key: number]: { serial_number: string } } = {};
	showAddLotForm: { [key: number]: boolean } = {};
	showAddSerialForm: { [key: number]: boolean } = {};

	constructor(
		private receivingTaskService: ReceivingTaskService,
		private alertService: AlertService,
		private loadingService: LoadingService,
		private languageService: LanguageService
	) {}

	get t() {
		return this.languageService.t.bind(this.languageService);
	}

	getUserDisplayName(task: ReceivingTask): string {
		return task.user_assignee_name || this.t('unassigned');
	}

	getCreatorDisplayName(task: ReceivingTask): string {
		return task.user_creator_name || task.created_by || this.t('unknown');
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
			closed: { 
				variant: 'outline', 
				className: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700',
				text: this.t('closed')
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
		this.closeAdjustmentDialog();
		this.closeConfirmationModal();
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

	isTaskCompletelyReceived(): boolean {
		if (!this.selectedTask?.items) return false;
		
		for (const item of this.selectedTask.items) {
			const hasTrackingData = this.hasLots(item) || this.hasSerials(item);
			
			if (hasTrackingData) {
				if (this.hasLots(item)) {
					const lots = this.getLotsForItem(item);
					const totalReceivedFromLots = lots.reduce((sum, lot) => {
						return sum + ((lot as any).received_quantity || lot.quantity || 0);
					}, 0);
					
					if (totalReceivedFromLots < item.expected_qty) {
						return false;
					}
				}
				
				if (this.hasSerials(item)) {
					const serials = this.getSerialsForItem(item);
					if (serials.length < item.expected_qty) {
						return false;
					}
				}
			} else {
				continue;
			}
		}
		
		return true;
	}

	async completeTask(): Promise<void> {
		if (!this.selectedTask) return;
		
		try {
			this.loadingService.show();
			const location = this.selectedTask.items?.[0]?.location || '';
			const response = await this.receivingTaskService.completeFullTask(this.selectedTask.id, location);
			if (response.result.success) {
				this.alertService.success(
					response.result.message || this.t('task_completed_successfully'),
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

	openAdjustmentDialog(): void {
		if (!this.selectedTask) return;
		
		this.editingQuantities = {};
		this.selectedTask.items?.forEach((item, index) => {
			this.editingQuantities[index] = {
				received_qty: item.received_qty || item.expected_qty,
				lots: this.getLotsForItem(item).map(lot => ({
					...lot,
					received_quantity: (lot as any).received_quantity || lot.quantity || 0
				})),
				serials: this.getSerialsForItem(item)
			};
		});
		
		this.showAdjustmentDialog = true;
	}

	closeDocument(): void {
		if (!this.selectedTask) return;
		
		const hasOpenItems = this.hasIncompleteItems();
		
		if (hasOpenItems) {
			this.showCloseConfirmation = true;
		} else {
			this.confirmCloseDocument();
		}
	}

	hasIncompleteItems(): boolean {
		if (!this.selectedTask?.items) return false;
		
		for (const item of this.selectedTask.items) {
			if (item.status === 'open') {
				return true;
			}
			
			if (item.received_qty < item.expected_qty) {
				return true;
			}
			
			if (this.hasLots(item)) {
				const lots = this.getLotsForItem(item);
				for (const lot of lots) {
					const receivedQty = (lot as any).received_quantity || lot.quantity || 0;
					const expectedQty = lot.quantity || 0;
					if (receivedQty < expectedQty) {
						return true;
					}
				}
			}
		}
		
		return false;
	}

	closeConfirmationModal(): void {
		this.showCloseConfirmation = false;
	}

	async confirmCloseDocument(): Promise<void> {
		if (!this.selectedTask) return;
		
		try {
			this.loadingService.show();
			const response = await this.receivingTaskService.update(this.selectedTask.id, { status: 'closed' });
			if (response.result.success) {
				this.alertService.success(
					response.result.message || this.t('document_closed_successfully'),
					this.t('success')
				);
				this.closeDetails();
				this.showCloseConfirmation = false;
				this.refresh.emit();
			} else {
				this.alertService.error(
					response.result.message || this.t('failed_to_close_document'),
					this.t('error')
				);
			}
		} catch (error) {
			this.alertService.error(
				this.t('failed_to_close_document'),
				this.t('error')
			);
		} finally {
			this.loadingService.hide();
		}
	}

	closeAdjustmentDialog(): void {
		this.showAdjustmentDialog = false;
		this.editingQuantities = {};
		this.newLotData = {};
		this.newSerialData = {};
		this.showAddLotForm = {};
		this.showAddSerialForm = {};
	}

	initializeEditingQuantities(): void {
		if (!this.selectedTask) return;
		
		this.selectedTask.items.forEach((item, index) => {
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

	// Gestión de lotes y series
	showAddLotFormForItem(itemIndex: number): void {
		this.showAddLotForm[itemIndex] = true;
		this.newLotData[itemIndex] = {
			lot_number: '',
			quantity: 1,
			expiration_date: undefined
		};
	}

	hideAddLotFormForItem(itemIndex: number): void {
		this.showAddLotForm[itemIndex] = false;
		delete this.newLotData[itemIndex];
	}

	removeLot(itemIndex: number, lotIndex: number): void {
		if (this.editingQuantities[itemIndex] && this.editingQuantities[itemIndex].lots) {
			this.editingQuantities[itemIndex].lots.splice(lotIndex, 1);
		}
	}

	showAddSerialFormForItem(itemIndex: number): void {
		this.showAddSerialForm[itemIndex] = true;
		this.newSerialData[itemIndex] = {
			serial_number: ''
		};
	}

	hideAddSerialFormForItem(itemIndex: number): void {
		this.showAddSerialForm[itemIndex] = false;
		delete this.newSerialData[itemIndex];
	}

	addNewLot(itemIndex: number): void {
		if (!this.newLotData[itemIndex] || !this.newLotData[itemIndex].lot_number.trim()) {
			this.alertService.error(
				this.t('lot_number_required'),
				this.t('error')
			);
			return;
		}

		if (this.newLotData[itemIndex].quantity <= 0) {
			this.alertService.error(
				this.t('quantity_must_be_positive'),
				this.t('error')
			);
			return;
		}

		const originalItem = this.selectedTask?.items[itemIndex];
		if (!originalItem) return;

		// Check if adding this quantity would exceed the expected quantity
		const currentTotalReceived = this.editingQuantities[itemIndex]?.lots?.reduce(
			(sum: number, lot: any) => sum + (lot.received_quantity || 0), 0
		) || 0;
		
		if (currentTotalReceived + this.newLotData[itemIndex].quantity > originalItem.expected_qty) {
			const remaining = originalItem.expected_qty - currentTotalReceived;
			this.alertService.error(
				`${this.t('lot_quantity_exceeds_total')}. ${this.t('remaining_quantity')}: ${remaining}`,
				this.t('error')
			);
			return;
		}

		// Check if lot already exists
		const existingLot = this.editingQuantities[itemIndex]?.lots?.find(
			(lot: any) => lot.lot_number === this.newLotData[itemIndex].lot_number.trim()
		);

		if (existingLot) {
			this.alertService.error(
				this.t('lot_already_exists'),
				this.t('error')
			);
			return;
		}

		// Create new lot
		const newLot = {
			lot_number: this.newLotData[itemIndex].lot_number.trim(),
			sku: originalItem.sku,
			quantity: this.newLotData[itemIndex].quantity,
			received_quantity: this.newLotData[itemIndex].quantity,
			expiration_date: this.newLotData[itemIndex].expiration_date,
			status: 'received'
		};

		// Add to editing quantities
		if (!this.editingQuantities[itemIndex].lots) {
			this.editingQuantities[itemIndex].lots = [];
		}
		this.editingQuantities[itemIndex].lots.push(newLot);

		this.alertService.success(
			this.t('lot_added_successfully'),
			this.t('success')
		);

		this.hideAddLotFormForItem(itemIndex);
	}

	addNewSerial(itemIndex: number): void {
		if (!this.newSerialData[itemIndex] || !this.newSerialData[itemIndex].serial_number.trim()) {
			this.alertService.error(
				this.t('serial_number_required'),
				this.t('error')
			);
			return;
		}

		const originalItem = this.selectedTask?.items[itemIndex];
		if (!originalItem) return;

		// Check if adding this serial would exceed the expected quantity
		const currentSerialCount = this.editingQuantities[itemIndex]?.serials?.length || 0;
		
		if (currentSerialCount >= originalItem.expected_qty) {
			this.alertService.error(
				`${this.t('serial_quantity_exceeds_total')}. ${this.t('remaining_serials_needed')}: 0`,
				this.t('error')
			);
			return;
		}

		// Check if serial already exists
		const existingSerial = this.editingQuantities[itemIndex]?.serials?.find(
			(serial: any) => serial.serial_number === this.newSerialData[itemIndex].serial_number.trim()
		);

		if (existingSerial) {
			this.alertService.error(
				this.t('serial_already_exists'),
				this.t('error')
			);
			return;
		}

		// Create new serial
		const newSerial = {
			serial_number: this.newSerialData[itemIndex].serial_number.trim(),
			sku: originalItem.sku,
			status: 'received'
		};

		// Add to editing quantities
		if (!this.editingQuantities[itemIndex].serials) {
			this.editingQuantities[itemIndex].serials = [];
		}
		this.editingQuantities[itemIndex].serials.push(newSerial);

		this.alertService.success(this.t('serial_added_successfully'), this.t('success'));
		this.hideAddSerialFormForItem(itemIndex);
	}

	removeSerial(itemIndex: number, serialIndex: number): void {
		if (this.editingQuantities[itemIndex]?.serials) {
			this.editingQuantities[itemIndex].serials.splice(serialIndex, 1);
		}
	}


	// Métodos auxiliares
	getRemainingQuantityForItem(itemIndex: number): number {
		const originalItem = this.selectedTask?.items[itemIndex];
		if (!originalItem) return 0;

		if (this.hasLots(originalItem)) {
			const totalReceived = this.editingQuantities[itemIndex]?.lots?.reduce(
				(sum: number, lot: any) => sum + (lot.received_quantity || 0), 0
			) || 0;
			return Math.max(0, originalItem.expected_qty - totalReceived);
		} else {
			const received = this.editingQuantities[itemIndex]?.received_qty || 0;
			return Math.max(0, originalItem.expected_qty - received);
		}
	}

	needsMoreQuantity(itemIndex: number): boolean {
		return this.getRemainingQuantityForItem(itemIndex) > 0;
	}

	isValidAdjustment(): boolean {
		for (const itemIndex in this.editingQuantities) {
			const item = this.editingQuantities[itemIndex];
			const originalItem = this.selectedTask?.items[parseInt(itemIndex)];
			
			if (!originalItem) continue;
			
			if (!this.hasLots(originalItem)) {
				if (item.received_qty < 0 || item.received_qty > originalItem.expected_qty) {
					return false;
				}
			} else {
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
			
			for (const [indexStr, editedItem] of Object.entries(this.editingQuantities)) {
				const index = parseInt(indexStr);
				const originalItem = this.selectedTask.items[index];
				const typedEditedItem = editedItem as any;
				
				let itemRequest: ReceivingTaskItemRequest;
				
				// Different logic based on whether item has lots or not
				if (this.hasLots(originalItem)) {
					// For items WITH lots: use lot quantities, calculate total received_qty from lots
					const totalReceivedFromLots = typedEditedItem.lots.reduce((sum: number, lot: any) => 
						sum + (lot.received_quantity || lot.quantity || 0), 0);
					
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
		return this.selectedTask?.items[0]?.location || 'DEFAULT';
	}

	async updateTaskStatus(taskId: number, status: string): Promise<void> {
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
					response.result.message || this.t('task_status_updated_successfully'),
					this.t('success')
				);
				this.closeDetails();
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
					response.result.message || this.t('full_task_completed_successfully'),
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
					response.result.message || this.t('receiving_line_completed_successfully'),
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
