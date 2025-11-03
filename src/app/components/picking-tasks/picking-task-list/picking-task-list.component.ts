import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickingTask } from '@app/models/picking-task.model';
import { Inventory } from '@app/models/inventory.model';
import { PickingTaskService } from '@app/services/picking-task.service';
import { InventoryService } from '@app/services/inventory.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
	selector: 'app-picking-task-list',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './picking-task-list.component.html',
	styleUrls: ['./picking-task-list.component.css']
})
export class PickingTaskListComponent {
	@Input() tasks: PickingTask[] = [];
	@Input() isLoading = false;
	@Output() refresh = new EventEmitter<void>();
	@Output() edit = new EventEmitter<PickingTask>();

	selectedTask: PickingTask | null = null;
	expandedItems: Set<number> = new Set();
	
	showAdjustmentDialog = false;
	showCloseConfirmation = false;

	editingQuantities: { [key: number]: any } = {};
	newLotData: { [key: number]: { lot_number: string; quantity: number; expiration_date?: string } } = {};
	newSerialData: { [key: number]: { serial_number: string } } = {};
	showAddLotForm: { [key: number]: boolean } = {};
	showAddSerialForm: { [key: number]: boolean } = {};

	availableInventory: Inventory[] = [];
	availableLotsPerItem: { [key: number]: any[] } = {};
	availableSerialsPerItem: { [key: number]: any[] } = {};
	selectedLotPerItem: { [key: number]: any } = {};
	selectedSerialPerItem: { [key: number]: any } = {};
	quantityToAddPerItem: { [key: number]: number } = {};

	constructor(
		private pickingTaskService: PickingTaskService,
		private inventoryService: InventoryService,
		private alertService: AlertService,
		private loadingService: LoadingService,
		private languageService: LanguageService
	) {}

	get t() {
		return this.languageService.t.bind(this.languageService);
	}

	private isErrorResponse(response: any): boolean {
		if (!response.result.success) {
			return true;
		}
		
		if (response.result.message) {
			const message = response.result.message.toLowerCase();
			return message.includes('not enough') ||
				   message.includes('insufficient') ||
				   message.includes('error') ||
				   message.includes('failed') ||
				   message.includes('cannot') ||
				   message.includes('unable') ||
				   message.includes('invalid') ||
				   message.includes('denied') ||
				   message.includes('exceeded');
		}
		
		return false;
	}

	getUserDisplayName(task: PickingTask): string {
		return task.user_assignee_name || this.t('unassigned');
	}

	getCreatorDisplayName(task: PickingTask): string {
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

	onEdit(task: PickingTask): void {
		this.edit.emit(task);
	}

	onViewDetails(task: PickingTask): void {
		this.selectedTask = task;
	}

	closeDetails(): void {
		this.selectedTask = null;
		this.expandedItems.clear();
		this.closeAdjustmentDialog();
		this.closeConfirmationModal();
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
			const response = await this.pickingTaskService.update(taskId, { status });
			
			if (this.isErrorResponse(response)) {
				this.alertService.error(
					response.result.message || this.t('failed_to_update_task_status'),
					this.t('error')
				);
			} else {
				this.alertService.success(
					response.result.message || this.t('task_status_updated_successfully'),
					this.t('success')
				);
				this.closeDetails();
				this.refresh.emit();
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

	hasSerials(item: any): boolean {
		return (
			(item.serialNumbers && item.serialNumbers.length > 0) ||
			(item.serial_numbers && item.serial_numbers.length > 0) ||
			(item.serials && item.serials.length > 0)
		);
	}

	getLotsForItem(item: any): any[] {
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

	isTaskCompletelyPicked(): boolean {
		if (!this.selectedTask?.items) return false;
		
		for (const item of this.selectedTask.items) {
			const hasTrackingData = this.hasLots(item) || this.hasSerials(item);
			
			if (hasTrackingData) {
				if (this.hasLots(item)) {
					const lots = this.getLotsForItem(item);
					const totalPickedFromLots = lots.reduce((sum, lot) => {
						return sum + ((lot as any).delivered_quantity || lot.quantity || 0);
					}, 0);
					
					if (totalPickedFromLots < (item.required_qty || 0)) {
						return false;
					}
				}
				
				if (this.hasSerials(item)) {
					const serials = this.getSerialsForItem(item);
					if (serials.length < (item.required_qty || 0)) {
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
			const response = await this.pickingTaskService.completeFullTask(this.selectedTask.id, location);
			
			if (this.isErrorResponse(response)) {
				this.alertService.error(
					response.result.message || this.t('failed_to_complete_task'),
					this.t('error')
				);
			} else {
				this.alertService.success(
					response.result.message || this.t('task_completed_successfully'),
					this.t('success')
				);
				this.closeDetails();
				this.refresh.emit();
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

	async openAdjustmentDialog(): Promise<void> {
		if (!this.selectedTask) return;
		
		this.closeAllDialogs();
		
		this.editingQuantities = {};
		this.selectedTask.items?.forEach((item, index) => {
			this.ensureEditingQuantity(index);
		});
		
		await this.loadAvailableInventoryForTask();
		
		this.showAdjustmentDialog = true;
	}

	closeAllDialogs(): void {
		this.showAdjustmentDialog = false;
		this.showCloseConfirmation = false;
	}

	closeAdjustmentDialog(): void {
		this.showAdjustmentDialog = false;
		this.editingQuantities = {};
		this.newLotData = {};
		this.newSerialData = {};
		this.showAddLotForm = {};
		this.showAddSerialForm = {};
		this.availableLotsPerItem = {};
		this.availableSerialsPerItem = {};
		this.selectedLotPerItem = {};
		this.selectedSerialPerItem = {};
		this.quantityToAddPerItem = {};
	}

	async loadAvailableInventoryForTask(): Promise<void> {
		if (!this.selectedTask?.items) return;

		try {
			const response = await this.inventoryService.getAll();
			if (response.result.success && response.data) {
				this.availableInventory = response.data;

				this.selectedTask.items.forEach((item, index) => {
					this.loadAvailableLotsAndSerialsForItem(index, item);
				});
			}
		} catch (error) {
			console.error('Error loading available inventory:', error);
		}
	}

	loadAvailableLotsAndSerialsForItem(itemIndex: number, item: any): void {
		if (!item.sku) return;

		const inventoryForSku = this.availableInventory.filter(inv => inv.sku === item.sku);

		const availableLots: any[] = [];
		const availableSerials: any[] = [];

		inventoryForSku.forEach(inv => {
			if (inv.lots && inv.lots.length > 0) {
				inv.lots.forEach(lot => {
					const alreadyUsedQty = this.getUsedQuantityForLot(itemIndex, lot.lot_number);
					const availableQty = lot.quantity - alreadyUsedQty;
					
					if (availableQty > 0) {
						availableLots.push({
							...lot,
							available_quantity: availableQty,
							inventory_id: inv.id,
							location: inv.location
						});
					}
				});
			}

			if (inv.serials && inv.serials.length > 0) {
				inv.serials.forEach(serial => {
					const isAlreadyUsed = this.isSerialAlreadyUsed(itemIndex, serial.serial_number);
					
					if (!isAlreadyUsed && serial.status === 'available') {
						availableSerials.push({
							...serial,
							inventory_id: inv.id,
							location: inv.location
						});
					}
				});
			}
		});

		this.availableLotsPerItem[itemIndex] = availableLots;
		this.availableSerialsPerItem[itemIndex] = availableSerials;
	}

	getUsedQuantityForLot(itemIndex: number, lotNumber: string): number {
		const editingLots = this.editingQuantities[itemIndex]?.lots || [];
		const usedLot = editingLots.find((lot: any) => lot.lot_number === lotNumber);
		return usedLot ? (usedLot.delivered_quantity || 0) : 0;
	}

	isSerialAlreadyUsed(itemIndex: number, serialNumber: string): boolean {
		const editingSerials = this.editingQuantities[itemIndex]?.serials || [];
		return editingSerials.some((serial: any) => serial.serial_number === serialNumber);
	}

	getMaxQuantityForLot(itemIndex: number, lot: any): number {
		if (!lot || !this.selectedTask?.items[itemIndex]) return 0;
		
		const originalItem = this.selectedTask.items[itemIndex];
		const currentTotalDelivered = this.editingQuantities[itemIndex]?.lots?.reduce(
			(sum: number, lotItem: any) => sum + (lotItem.delivered_quantity || 0), 0
		) || 0;
		
		const remainingNeeded = (originalItem.required_qty || 0) - currentTotalDelivered;
		
		return Math.min(lot.available_quantity, remainingNeeded);
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
			if ((item as any).status === 'open') {
				return true;
			}
			
			if ((item as any).delivered_qty < (item.required_qty || 0)) {
				return true;
			}
			
			if (this.hasLots(item)) {
				const lots = this.getLotsForItem(item);
				for (const lot of lots) {
					const pickedQty = (lot as any).delivered_quantity || lot.quantity || 0;
					const expectedQty = lot.quantity || 0;
					if (pickedQty < expectedQty) {
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
			const response = await this.pickingTaskService.update(this.selectedTask.id, { status: 'closed' });
			
			if (this.isErrorResponse(response)) {
				this.alertService.error(
					response.result.message || this.t('failed_to_close_document'),
					this.t('error')
				);
			} else {
				this.alertService.success(
					response.result.message || this.t('document_closed_successfully'),
					this.t('success')
				);
				this.closeDetails();
				this.refresh.emit();
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

	ensureEditingQuantity(itemIndex: number): void {
		if (!this.editingQuantities[itemIndex]) {
			const item = this.selectedTask?.items?.[itemIndex];
			if (item) {
				this.editingQuantities[itemIndex] = {
					delivered_qty: (item as any).delivered_qty || item.required_qty,
					lots: this.getLotsForItem(item).map(lot => ({
						...lot,
						delivered_quantity: (lot as any).delivered_quantity || lot.quantity || 0
					})),
					serials: this.getSerialsForItem(item)
				};
			}
		}
	}

	updateEditingQuantity(itemIndex: number, field: string, value: any): void {
		this.ensureEditingQuantity(itemIndex);
		this.editingQuantities[itemIndex][field] = value;
	}

	updateLotQuantity(itemIndex: number, lotIndex: number, quantity: number): void {
		if (this.editingQuantities[itemIndex]?.lots?.[lotIndex]) {
			this.editingQuantities[itemIndex].lots[lotIndex].delivered_quantity = quantity;
		}
	}

	validateAdjustments(): string | null {
		if (!this.selectedTask?.items) return null;

		for (const [itemIndex, adjustments] of Object.entries(this.editingQuantities)) {
			const item = this.selectedTask.items[parseInt(itemIndex)];
			if (!item) continue;

			if ((item as any).status !== 'open') {
				return `El artículo ${item.sku} no puede ser editado.`;
			}

			if (adjustments.delivered_qty > (item.required_qty || 0)) {
				return `La cantidad para ${item.sku} (${adjustments.delivered_qty}) no puede ser mayor a la requerida (${item.required_qty || 0})`;
			}

			if (adjustments.lots && adjustments.lots.length > 0) {
				for (const lot of adjustments.lots) {
					if (lot.delivered_quantity > lot.quantity) {
						return `La cantidad del lote ${lot.lot_number} (${lot.delivered_quantity}) no puede ser mayor a la disponible (${lot.quantity})`;
					}
				}
			}
		}

		return null;
	}

	canEditItem(item: any): boolean {
		return (item as any).status === 'open';
	}

	getDisplayQuantityForLot(item: any, lot: any): number {
		if (this.canEditItem(item)) {
			return lot.delivered_quantity || lot.quantity || 0;
		} else {
			return lot.received_quantity || lot.delivered_quantity || lot.quantity || 0;
		}
	}

	getReadOnlyQuantityForLot(item: any, lot: any): number {
		if (this.canEditItem(item)) {
			return lot.quantity || 0;
		} else {
			return lot.received_quantity || lot.quantity || 0;
		}
	}

	getCollectedQuantityForItem(itemIndex: number): number {
		const item = this.selectedTask?.items[itemIndex];
		if (!item) return 0;

		if (this.hasSerials(item)) {
			return this.editingQuantities[itemIndex]?.serials?.length || 0;
		} else if (this.hasLots(item)) {
			return this.editingQuantities[itemIndex]?.lots?.reduce(
				(sum: number, lot: any) => sum + (lot.delivered_quantity || 0), 0
			) || 0;
		} else {
			return this.editingQuantities[itemIndex]?.delivered_qty || 0;
		}
	}

	showAddLotFormForItem(itemIndex: number): void {
		this.showAddLotForm[itemIndex] = true;
		this.selectedLotPerItem[itemIndex] = null;
		this.quantityToAddPerItem[itemIndex] = 1;
	}

	hideAddLotFormForItem(itemIndex: number): void {
		this.showAddLotForm[itemIndex] = false;
		delete this.selectedLotPerItem[itemIndex];
		delete this.quantityToAddPerItem[itemIndex];
	}


	showAddSerialFormForItem(itemIndex: number): void {
		this.showAddSerialForm[itemIndex] = true;
		this.selectedSerialPerItem[itemIndex] = null;
	}

	hideAddSerialFormForItem(itemIndex: number): void {
		this.showAddSerialForm[itemIndex] = false;
		delete this.selectedSerialPerItem[itemIndex];
	}

	addLotFromInventory(itemIndex: number): void {
		const originalItem = this.selectedTask?.items[itemIndex];
		if (!originalItem) return;

		if (!this.canEditItem(originalItem)) {
			this.alertService.error(
				this.t('cannot_edit_item_not_open'),
				this.t('error')
			);
			return;
		}

		const selectedLot = this.selectedLotPerItem[itemIndex];
		const quantityToAdd = this.quantityToAddPerItem[itemIndex];

		if (!selectedLot) {
			this.alertService.error(
				this.t('please_select_lot'),
				this.t('error')
			);
			return;
		}

		if (!quantityToAdd || quantityToAdd <= 0) {
			this.alertService.error(
				this.t('quantity_must_be_positive'),
				this.t('error')
			);
			return;
		}

		const currentTotalDelivered = this.editingQuantities[itemIndex]?.lots?.reduce(
			(sum: number, lot: any) => sum + (lot.delivered_quantity || 0), 0
		) || 0;
		
		const remainingNeeded = (originalItem.required_qty || 0) - currentTotalDelivered;
		
		const maxCanAdd = Math.min(selectedLot.available_quantity, remainingNeeded);
		
		if (quantityToAdd > maxCanAdd) {
			this.alertService.error(
				`${this.t('quantity_exceeds_maximum')}. ${this.t('maximum_allowed')}: ${maxCanAdd}`,
				this.t('error')
			);
			return;
		}
		
		if (remainingNeeded <= 0) {
			this.alertService.error(
				`${this.t('item_already_complete')}. ${this.t('required_qty')}: ${originalItem.required_qty}`,
				this.t('error')
			);
			return;
		}

		const existingLotIndex = this.editingQuantities[itemIndex]?.lots?.findIndex(
			(lot: any) => lot.lot_number === selectedLot.lot_number
		);

		if (existingLotIndex >= 0) {
			this.editingQuantities[itemIndex].lots[existingLotIndex].delivered_quantity += quantityToAdd;
			this.editingQuantities[itemIndex].lots[existingLotIndex].quantity = this.editingQuantities[itemIndex].lots[existingLotIndex].delivered_quantity;
		} else {
			const newLot = {
				lot_number: selectedLot.lot_number,
				sku: originalItem.sku,
				quantity: quantityToAdd,
				delivered_quantity: quantityToAdd,
				expiration_date: selectedLot.expiration_date,
				status: 'delivered'
			};

			if (!this.editingQuantities[itemIndex].lots) {
				this.editingQuantities[itemIndex].lots = [];
			}
			this.editingQuantities[itemIndex].lots.push(newLot);
		}

		selectedLot.available_quantity -= quantityToAdd;

		this.alertService.success(
			this.t('lot_quantity_added_successfully'),
			this.t('success')
		);

		this.hideAddLotFormForItem(itemIndex);
	}

	addSerialFromInventory(itemIndex: number): void {
		const originalItem = this.selectedTask?.items[itemIndex];
		if (!originalItem) return;

		if (!this.canEditItem(originalItem)) {
			this.alertService.error(
				this.t('cannot_edit_item_not_open'),
				this.t('error')
			);
			return;
		}

		const selectedSerial = this.selectedSerialPerItem[itemIndex];

		if (!selectedSerial) {
			this.alertService.error(
				this.t('please_select_serial'),
				this.t('error')
			);
			return;
		}

		const currentSerialCount = this.editingQuantities[itemIndex]?.serials?.length || 0;
		
		if (currentSerialCount >= (originalItem.required_qty || 0)) {
			this.alertService.error(
				`${this.t('serial_quantity_exceeds_total')}. ${this.t('remaining_serials_needed')}: 0`,
				this.t('error')
			);
			return;
		}

		const newSerial = {
			serial_number: selectedSerial.serial_number,
			sku: originalItem.sku,
			status: 'delivered'
		};

		if (!this.editingQuantities[itemIndex].serials) {
			this.editingQuantities[itemIndex].serials = [];
		}
		this.editingQuantities[itemIndex].serials.push(newSerial);

		const availableSerials = this.availableSerialsPerItem[itemIndex] || [];
		const serialIndex = availableSerials.findIndex(s => s.serial_number === selectedSerial.serial_number);
		if (serialIndex >= 0) {
			availableSerials.splice(serialIndex, 1);
		}

		this.alertService.success(this.t('serial_added_successfully'), this.t('success'));
		this.hideAddSerialFormForItem(itemIndex);
	}

	removeSerial(itemIndex: number, serialIndex: number): void {
		if (this.editingQuantities[itemIndex]?.serials) {
			this.editingQuantities[itemIndex].serials.splice(serialIndex, 1);
		}
	}

	getRemainingQuantityForItem(itemIndex: number): number {
		const originalItem = this.selectedTask?.items[itemIndex];
		if (!originalItem) return 0;

		if (this.hasSerials(originalItem)) {
			const serialCount = this.editingQuantities[itemIndex]?.serials?.length || 0;
			return Math.max(0, (originalItem.required_qty || 0) - serialCount);
		} else if (this.hasLots(originalItem)) {
			const totalDelivered = this.editingQuantities[itemIndex]?.lots?.reduce(
				(sum: number, lot: any) => sum + (lot.delivered_quantity || 0), 0
			) || 0;
			return Math.max(0, (originalItem.required_qty || 0) - totalDelivered);
		} else {
			const delivered = this.editingQuantities[itemIndex]?.delivered_qty || 0;
			return Math.max(0, (originalItem.required_qty || 0) - delivered);
		}
	}

	needsMoreQuantity(itemIndex: number): boolean {
		return this.getRemainingQuantityForItem(itemIndex) > 0;
	}

	hasAvailableSerialsToAdd(itemIndex: number): boolean {
		const item = this.selectedTask?.items[itemIndex];
		if (!item || !this.hasSerials(item)) return false;
		
		const availableSerials = this.availableSerialsPerItem[itemIndex] || [];
		return availableSerials.length > 0;
	}

	isValidAdjustment(): boolean {
		for (const itemIndex in this.editingQuantities) {
			const item = this.editingQuantities[itemIndex];
			const originalItem = this.selectedTask?.items[parseInt(itemIndex)];
			
			if (!originalItem) continue;
			
			if (!this.hasLots(originalItem)) {
				if (item.delivered_qty < 0 || item.delivered_qty > (originalItem.required_qty || 0)) {
					return false;
				}
			} else {
				if (item.lots && item.lots.length > 0) {
					for (const lot of item.lots) {
						if (lot.delivered_quantity < 0 || lot.delivered_quantity > lot.quantity) {
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

		const validationError = this.validateAdjustments();
		if (validationError) {
			this.alertService.error(validationError, this.t('error'));
			return;
		}

		try {
			this.loadingService.show();
			
			for (const [itemIndex, adjustments] of Object.entries(this.editingQuantities)) {
				const item = this.selectedTask.items?.[parseInt(itemIndex)];
				if (!item) continue;

				const location = item.location || '';
				const adjustmentData = {
					sku: item.sku,
					status: 'open',
					location: item.location,
					required_qty: Number(item.required_qty) || 0,
					lots: (adjustments.lots || []).map((lot: any) => ({
						sku: item.sku,
						status: 'open',
						quantity: lot.delivered_quantity,
						lot_number: lot.lot_number,
						expiration_date: lot.expiration_date,
						received_quantity: lot.quantity
					})),
					serials: adjustments.serials || []
				};

				const response = await this.pickingTaskService.completePickingLine(this.selectedTask.id, location, adjustmentData);
				
				if (this.isErrorResponse(response)) {
					this.alertService.error(
						response.result.message || this.t('failed_to_save_adjustments'),
						this.t('error')
					);
					return;
				}
			}

			const successMessage = this.t('adjustments_saved_successfully');
			this.alertService.success(successMessage, this.t('success'));
			
			this.closeAdjustmentDialog();
			this.refresh.emit();
		} catch (error: any) {
			console.error('Unexpected error in saveAdjustments:', error);
			this.alertService.error(
				this.t('failed_to_save_adjustments'),
				this.t('error')
			);
		} finally {
			this.loadingService.hide();
		}
	}
}
