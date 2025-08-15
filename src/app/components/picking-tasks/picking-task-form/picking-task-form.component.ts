import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { PickingTask, CreatePickingTaskRequest } from '@app/models/picking-task.model';
import { Location } from '@app/models/location.model';
import { User } from '@app/models/user.model';
import { Article } from '@app/models/article.model';
import { PickingTaskService } from '@app/services/picking-task.service';
import { LotService } from '@app/services/lot.service';
import { SerialService } from '@app/services/serial.service';
import { LocationService } from '@app/services/location.service';
import { UserService } from '@app/services/user.service';
import { ArticleService } from '@app/services/article.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
	selector: 'app-picking-task-form',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, FormsModule],
	templateUrl: './picking-task-form.component.html',
	styleUrls: ['./picking-task-form.component.css']
})
export class PickingTaskFormComponent implements OnInit {
	@Input() task: PickingTask | null = null;
	@Output() success = new EventEmitter<void>();
	@Output() cancel = new EventEmitter<void>();

	form: FormGroup;
	locations: Location[] = [];
	users: User[] = [];
	articles: Article[] = [];
	isLoading = false;
	isEditing = false;

	skuSearchTerms: string[] = [];
	locationSearchTerms: string[] = [];
	showSkuDropdown: boolean[] = [];
	showLocationDropdown: boolean[] = [];
	filteredArticlesPerItem: Article[][] = [];
	filteredLocationsPerItem: Location[][] = [];

	availableLotsPerItem: string[][] = [];
	availableSerialsPerItem: string[][] = [];
	filteredLotsPerItem: string[][] = [];
	filteredSerialsPerItem: string[][] = [];
	lotSearchTerms: string[] = [];
	serialSearchTerms: string[] = [];
	showLotDropdown: boolean[] = [];
	showSerialDropdown: boolean[] = [];
	requiredQuantities: number[] = [];

	constructor(
		private fb: FormBuilder,
		private pickingTaskService: PickingTaskService,
		private locationService: LocationService,
		private userService: UserService,
		private articleService: ArticleService,
		private lotService: LotService,
		private serialService: SerialService,
		private alertService: AlertService,
		private loadingService: LoadingService,
		private languageService: LanguageService,
		private cdr: ChangeDetectorRef
	) {
		this.form = this.fb.group({
			outbound_number: ['', [Validators.required]],
			assigned_to: [''],
			priority: ['normal', [Validators.required]],
			notes: [''],
			items: this.fb.array([])
		});
	}

	ngOnInit(): void {
		this.loadData();
		this.isEditing = !!this.task;
		if (this.task) {
			this.loadTaskForEdit();
		} else {
			this.addItem();
		}
	}

	get t() {
		return this.languageService.t.bind(this.languageService);
	}

	// Modal helpers
	close(): void {
		this.cancel.emit();
	}

	onCancel(): void {
		this.cancel.emit();
	}

	onBackdropClick(event: Event): void {
		if (event.target === event.currentTarget) {
			this.close();
		}
	}

	async loadData(): Promise<void> {
		try {
			this.isLoading = true;
			
			// Load data in parallel (locations, users, articles)
			const [locationResponse, userResponse, articleResponse] = await Promise.all([
				this.locationService.getAll(),
				this.userService.getAll(),
				this.articleService.getAll()
			]);

			if (locationResponse.result.success) {
				this.locations = locationResponse.data;
			}

			if (userResponse.result.success) {
				// Only operators
				this.users = (userResponse.data || []).filter((u: User) => u.role === 'operator');
			}

			if (articleResponse.result.success) {
				// Solo mostrar artículos activos
				this.articles = (articleResponse.data || []).filter(article => article.is_active !== false);
			}
		} catch (error) {
			this.alertService.error(
				this.t('error_loading_data'),
				this.t('error')
			);
		} finally {
			this.isLoading = false;
		}
	}

	loadTaskForEdit(): void {
		if (!this.task) return;

		this.form.patchValue({
			outbound_number: this.task.outbound_number,
			assigned_to: this.task.assigned_to || '',
			priority: this.task.priority,
			notes: this.task.notes || ''
		});

		while (this.itemsArray.length !== 0) {
			this.itemsArray.removeAt(0);
		}

		if (this.task.items && this.task.items.length > 0) {
			this.task.items.forEach((item, i) => {
				this.itemsArray.push(this.fb.group({
					sku: [item.sku, [Validators.required]],
					location: [item.location, [Validators.required]],
					lot_numbers: [item.lot_numbers?.join(', ') || ''],
					serial_numbers: [item.serial_numbers?.join(', ') || '']
				}));
				
				this.requiredQuantities[i] = item.required_qty;
				this.ensureComboboxState(i);
				const article = this.getArticleBySku(item.sku);
				this.skuSearchTerms[i] = article ? `${article.sku} - ${article.name}` : item.sku;
				const loc = this.locations.find(l => l.location_code === item.location);
				this.locationSearchTerms[i] = loc ? `${loc.location_code} - ${loc.description}` : item.location;
				this.loadTrackingOptionsForItem(i, item.sku);
			});
		} else {
			this.addItem();
		}
	}

	get itemsArray(): FormArray {
		return this.form.get('items') as FormArray;
	}

	canAddItem(): boolean {
		if (this.itemsArray.length === 0) {
			return true;
		}

		const lastItem = this.itemsArray.at(this.itemsArray.length - 1);
		if (!lastItem) return true;

		const lastIndex = this.itemsArray.length - 1;
		const sku = lastItem.get('sku')?.value;
		const requiredQty = this.requiredQuantities[lastIndex];
		const location = lastItem.get('location')?.value;

		return !!(sku && requiredQty && requiredQty > 0 && location);
	}

	addItem(): void {
		if (!this.canAddItem()) {
			this.alertService.warning(
				this.t('complete_current_item_before_adding_new'),
				this.t('warning')
			);
			return;
		}

		const itemGroup = this.fb.group({
			sku: ['', [Validators.required]],
			location: ['', [Validators.required]],
			lot_numbers: [''],
			serial_numbers: ['']
		});

		this.itemsArray.push(itemGroup);

		const index = this.itemsArray.length - 1;
		this.requiredQuantities[index] = 0;
		this.ensureComboboxState(index);
	}

	removeItem(index: number): void {
		if (this.itemsArray.length > 1) {
			this.itemsArray.removeAt(index);
			this.skuSearchTerms.splice(index, 1);
			this.locationSearchTerms.splice(index, 1);
			this.showSkuDropdown.splice(index, 1);
			this.showLocationDropdown.splice(index, 1);
			this.filteredArticlesPerItem.splice(index, 1);
			this.filteredLocationsPerItem.splice(index, 1);
			this.requiredQuantities.splice(index, 1);
			this.availableLotsPerItem.splice(index, 1);
			this.availableSerialsPerItem.splice(index, 1);
			this.filteredLotsPerItem.splice(index, 1);
			this.filteredSerialsPerItem.splice(index, 1);
			this.lotSearchTerms.splice(index, 1);
			this.serialSearchTerms.splice(index, 1);
			this.showLotDropdown.splice(index, 1);
			this.showSerialDropdown.splice(index, 1);
		}
	}

	async onSubmit(): Promise<void> {
		if (this.form.invalid || !this.isFormComplete()) {
			this.markFormGroupTouched(this.form);
			this.alertService.error(
				this.t('please_complete_required_fields'),
				this.t('error')
			);
			return;
		}

		try {
			this.loadingService.show();
			
			const formValue = this.form.value;
			const taskData: CreatePickingTaskRequest = {
				outbound_number: formValue.outbound_number,
				assigned_to: formValue.assigned_to || undefined,
				priority: formValue.priority,
				status: this.task ? this.task.status : 'open',
				notes: formValue.notes || undefined,
				items: formValue.items.map((item: any, index: number) => ({
					sku: item.sku,
					required_qty: this.requiredQuantities[index] || 0,
					location: item.location,
					lot_numbers: item.lot_numbers ? item.lot_numbers.split(',').map((s: string) => s.trim()).filter((s: string) => s) : undefined,
					serial_numbers: item.serial_numbers ? item.serial_numbers.split(',').map((s: string) => s.trim()).filter((s: string) => s) : undefined
				}))
			};

			if (this.task) {
				// Update existing task
				const response = await this.pickingTaskService.update(this.task.id, taskData);
				if (response.result.success) {
					this.alertService.success(
						this.t('picking_task_updated_successfully'),
						this.t('success')
					);
					this.success.emit();
				} else {
					this.alertService.error(
						response.result.message || this.t('failed_to_update_picking_task'),
						this.t('error')
					);
				}
			} else {
				const response = await this.pickingTaskService.create(taskData);
				if (response.result.success) {
					this.alertService.success(
						this.t('picking_task_created_successfully'),
						this.t('success')
					);
					this.success.emit();
				} else {
					this.alertService.error(
						response.result.message || this.t('failed_to_create_picking_task'),
						this.t('error')
					);
				}
			}
		} catch (error) {
			this.alertService.error(
				this.t('error_saving_task'),
				this.t('error')
			);
		} finally {
			this.loadingService.hide();
		}
	}

	ensureComboboxState(index: number): void {
		if (this.skuSearchTerms[index] === undefined) this.skuSearchTerms[index] = '';
		if (this.locationSearchTerms[index] === undefined) this.locationSearchTerms[index] = '';
		if (this.showSkuDropdown[index] === undefined) this.showSkuDropdown[index] = false;
		if (this.showLocationDropdown[index] === undefined) this.showLocationDropdown[index] = false;
		
		this.filteredArticlesPerItem[index] = [...this.articles];
		this.filteredLocationsPerItem[index] = [...this.locations];
		
		if (!this.availableLotsPerItem[index]) this.availableLotsPerItem[index] = [];
		if (!this.availableSerialsPerItem[index]) this.availableSerialsPerItem[index] = [];
		if (!this.filteredLotsPerItem[index]) this.filteredLotsPerItem[index] = [];
		if (!this.filteredSerialsPerItem[index]) this.filteredSerialsPerItem[index] = [];
		if (this.lotSearchTerms[index] === undefined) this.lotSearchTerms[index] = '';
		if (this.serialSearchTerms[index] === undefined) this.serialSearchTerms[index] = '';
		if (this.showLotDropdown[index] === undefined) this.showLotDropdown[index] = false;
		if (this.showSerialDropdown[index] === undefined) this.showSerialDropdown[index] = false;
	}

	filterArticlesForItem(index: number): void {
		const term = (this.skuSearchTerms[index] || '').toLowerCase();
		if (!term) {
			this.filteredArticlesPerItem[index] = [...this.articles];
			return;
		}
		this.filteredArticlesPerItem[index] = this.articles.filter(a =>
			(a.sku || '').toLowerCase().includes(term) || (a.name || '').toLowerCase().includes(term)
		);
	}

	filterLocationsForItem(index: number): void {
		const term = (this.locationSearchTerms[index] || '').toLowerCase();
		if (!term) {
			this.filteredLocationsPerItem[index] = [...this.locations];
			return;
		}
		this.filteredLocationsPerItem[index] = this.locations.filter(l =>
			(l.location_code || '').toLowerCase().includes(term) || (l.description || '').toLowerCase().includes(term)
		);
	}

	onSkuSelected(index: number, article: Article): void {
		this.clearItemTrackingData(index);
		
		this.itemsArray.at(index).get('sku')?.setValue(article.sku);
		this.skuSearchTerms[index] = `${article.sku} - ${article.name}`;
		this.showSkuDropdown[index] = false;
		
		this.itemsArray.at(index).get('location')?.setValue('');
		this.locationSearchTerms[index] = '';
		
		this.loadTrackingOptionsForItem(index, article.sku);
	}

	clearItemTrackingData(index: number): void {
		this.itemsArray.at(index).get('lot_numbers')?.setValue('');
		this.itemsArray.at(index).get('serial_numbers')?.setValue('');
		
		this.availableLotsPerItem[index] = [];
		this.availableSerialsPerItem[index] = [];
		this.filteredLotsPerItem[index] = [];
		this.filteredSerialsPerItem[index] = [];
		this.lotSearchTerms[index] = '';
		this.serialSearchTerms[index] = '';
		this.showLotDropdown[index] = false;
		this.showSerialDropdown[index] = false;
	}

	onLocationSelected(index: number, location: Location): void {
		this.itemsArray.at(index).get('location')?.setValue(location.location_code);
		this.locationSearchTerms[index] = `${location.location_code} - ${location.description}`;
		this.showLocationDropdown[index] = false;
	}

	closeSkuDropdownLater(index: number): void {
		setTimeout(() => (this.showSkuDropdown[index] = false), 150);
	}

	closeLocationDropdownLater(index: number): void {
		setTimeout(() => (this.showLocationDropdown[index] = false), 150);
	}

	confirmFirstArticleIfAny(index: number): void {
		const list = this.filteredArticlesPerItem[index] || [];
		if (list.length > 0) {
			this.onSkuSelected(index, list[0]);
		}
	}

	confirmFirstLocationIfAny(index: number): void {
		const list = this.filteredLocationsPerItem[index] || [];
		if (list.length > 0) {
			this.onLocationSelected(index, list[0]);
		}
	}

	private getArticleBySku(sku: string): Article | undefined {
		return this.articles.find(a => a.sku === sku);
	}

	shouldShowLotNumbers(index: number): boolean {
		const sku = this.itemsArray.at(index).get('sku')?.value;
		const article = this.getArticleBySku(sku);
		return !!article?.track_by_lot;
	}

	shouldShowSerialNumbers(index: number): boolean {
		const sku = this.itemsArray.at(index).get('sku')?.value;
		const article = this.getArticleBySku(sku);
		return !!article?.track_by_serial;
	}

	isLotSelectionComplete(index: number): boolean {
		const requiredQty = this.getRequiredQuantity(index);
		const selectedCount = this.getSelectedLotCount(index);
		return requiredQty > 0 && selectedCount === requiredQty;
	}

	isSerialSelectionComplete(index: number): boolean {
		const requiredQty = this.getRequiredQuantity(index);
		const selectedCount = this.getSelectedSerialCount(index);
		return requiredQty > 0 && selectedCount === requiredQty;
	}

	private async loadTrackingOptionsForItem(index: number, sku: string): Promise<void> {
		const article = this.getArticleBySku(sku);
		if (!article) return;
		if (article.track_by_lot) {
			try {
				const lotsResp = await this.lotService.getBySku(sku);
				if (lotsResp.result.success) {
					this.availableLotsPerItem[index] = (lotsResp.data || []).map(l => l.lot_number);
					this.filteredLotsPerItem[index] = [...this.availableLotsPerItem[index]];
				}
			} catch {}
		}
		if (article.track_by_serial) {
			try {
				const serialsResp = await this.serialService.getBySku(sku);
				if (serialsResp.result.success) {
					this.availableSerialsPerItem[index] = (serialsResp.data || []).map(s => s.serial_number);
					this.filteredSerialsPerItem[index] = [...this.availableSerialsPerItem[index]];
				}
			} catch {}
		}
	}

	filterLotsForItem(index: number): void {
		const term = (this.lotSearchTerms[index] || '').toLowerCase();
		const options = this.availableLotsPerItem[index] || [];
		this.filteredLotsPerItem[index] = term ? options.filter(v => (v || '').toLowerCase().includes(term)) : [...options];
	}

	filterSerialsForItem(index: number): void {
		const term = (this.serialSearchTerms[index] || '').toLowerCase();
		const options = this.availableSerialsPerItem[index] || [];
		this.filteredSerialsPerItem[index] = term ? options.filter(v => (v || '').toLowerCase().includes(term)) : [...options];
	}

	onRequiredQuantityChange(index: number): void {
		const ctrl = this.itemsArray.at(index);
		if (ctrl) {
			ctrl.get('lot_numbers')?.setValue('');
			ctrl.get('serial_numbers')?.setValue('');
			this.lotSearchTerms[index] = '';
			this.serialSearchTerms[index] = '';
			this.showLotDropdown[index] = false;
			this.showSerialDropdown[index] = false;
		}
	}

	getRequiredQuantity(index: number, dato?: number): number {
		if (dato !== undefined && dato !== null) {
			return dato;
		}
		
		const qty = this.requiredQuantities[index] || 0;
		return Number(qty) || 0;
	}

	getSelectedLots(index: number): string[] {
		const ctrl = this.itemsArray.at(index).get('lot_numbers');
		const current = (ctrl?.value as string) || '';
		return current ? current.split(',').map(s => s.trim()).filter(Boolean) : [];
	}

	getSelectedLotCount(index: number): number {
		return this.getSelectedLots(index).length;
	}

	getSelectedSerials(index: number): string[] {
		const ctrl = this.itemsArray.at(index).get('serial_numbers');
		const current = (ctrl?.value as string) || '';
		return current ? current.split(',').map(s => s.trim()).filter(Boolean) : [];
	}

	getSelectedSerialCount(index: number): number {
		return this.getSelectedSerials(index).length;
	}

	isLotSelected(index: number, lotNumber: string): boolean {
		return this.getSelectedLots(index).includes(lotNumber);
	}

	isSerialSelected(index: number, serialNumber: string): boolean {
		return this.getSelectedSerials(index).includes(serialNumber);
	}

	onLotSelected(index: number, lotNumber: string): void {
		const ctrl = this.itemsArray.at(index).get('lot_numbers');
		const current = this.getSelectedLots(index);
		const requiredQty = this.getRequiredQuantity(index);

		if (current.includes(lotNumber)) {
			const updated = current.filter(lot => lot !== lotNumber);
			ctrl?.setValue(updated.join(', '));
		} else if (current.length < requiredQty) {
			current.push(lotNumber);
			ctrl?.setValue(current.join(', '));
		} else {
			this.alertService.warning(
				this.t('lot_selection_limit_reached'),
				this.t('warning')
			);
		}
		this.showLotDropdown[index] = false;
	}

	onSerialSelected(index: number, serialNumber: string): void {
		const ctrl = this.itemsArray.at(index).get('serial_numbers');
		const current = this.getSelectedSerials(index);
		const requiredQty = this.getRequiredQuantity(index);

		if (current.includes(serialNumber)) {
			const updated = current.filter(serial => serial !== serialNumber);
			ctrl?.setValue(updated.join(', '));
		} else if (current.length < requiredQty) {
			current.push(serialNumber);
			ctrl?.setValue(current.join(', '));
		} else {
			this.alertService.warning(
				this.t('serial_selection_limit_reached'),
				this.t('warning')
			);
		}
		this.showSerialDropdown[index] = false;
	}

	removeLot(index: number, lotNumber: string): void {
		const ctrl = this.itemsArray.at(index).get('lot_numbers');
		const current = this.getSelectedLots(index);
		const updated = current.filter(lot => lot !== lotNumber);
		ctrl?.setValue(updated.join(', '));
	}

	removeSerial(index: number, serialNumber: string): void {
		const ctrl = this.itemsArray.at(index).get('serial_numbers');
		const current = this.getSelectedSerials(index);
		const updated = current.filter(serial => serial !== serialNumber);
		ctrl?.setValue(updated.join(', '));
	}

	selectRandomLots(index: number): void {
		const requiredQty = this.getRequiredQuantity(index);
		const availableLots = this.availableLotsPerItem[index] || [];
		
		if (availableLots.length === 0) {
			this.alertService.warning(
				this.t('no_lots_available'),
				this.t('warning')
			);
			return;
		}

		if (requiredQty <= 0) {
			this.alertService.warning(
				this.t('set_required_quantity_first'),
				this.t('warning')
			);
			return;
		}

		// Seleccionar lotes al azar
		const shuffled = [...availableLots].sort(() => 0.5 - Math.random());
		const selected = shuffled.slice(0, Math.min(requiredQty, availableLots.length));
		
		const ctrl = this.itemsArray.at(index).get('lot_numbers');
		ctrl?.setValue(selected.join(', '));

		this.alertService.success(
			this.t('random_lots_selected') + ` (${selected.length})`,
			this.t('success')
		);
	}

	selectRandomSerials(index: number): void {
		const requiredQty = this.getRequiredQuantity(index);
		const availableSerials = this.availableSerialsPerItem[index] || [];
		
		if (availableSerials.length === 0) {
			this.alertService.warning(
				this.t('no_serials_available'),
				this.t('warning')
			);
			return;
		}

		if (requiredQty <= 0) {
			this.alertService.warning(
				this.t('set_required_quantity_first'),
				this.t('warning')
			);
			return;
		}

		// Seleccionar series al azar
		const shuffled = [...availableSerials].sort(() => 0.5 - Math.random());
		const selected = shuffled.slice(0, Math.min(requiredQty, availableSerials.length));
		
		const ctrl = this.itemsArray.at(index).get('serial_numbers');
		ctrl?.setValue(selected.join(', '));

		this.alertService.success(
			this.t('random_serials_selected') + ` (${selected.length})`,
			this.t('success')
		);
	}

	closeLotDropdownLater(index: number): void {
		setTimeout(() => (this.showLotDropdown[index] = false), 150);
	}

	closeSerialDropdownLater(index: number): void {
		setTimeout(() => (this.showSerialDropdown[index] = false), 150);
	}

	confirmFirstLotIfAny(index: number): void {
		const list = this.filteredLotsPerItem[index] || [];
		if (list.length > 0) this.onLotSelected(index, list[0]);
	}

	confirmFirstSerialIfAny(index: number): void {
		const list = this.filteredSerialsPerItem[index] || [];
		if (list.length > 0) this.onSerialSelected(index, list[0]);
	}

	// Manual input handlers - allow typing without immediate processing
	onManualLotInput(index: number): void {
		// Typing is allowed, processing happens on Enter
	}

	onManualSerialInput(index: number): void {
		// Typing is allowed, processing happens on Enter
	}

	handleLotEnter(index: number): void {
		const searchTerm = (this.lotSearchTerms[index] || '').trim();
		if (searchTerm) {
			// Check if it's from dropdown first
			const filtered = this.filteredLotsPerItem[index] || [];
			const exactMatch = filtered.find(lot => lot.toLowerCase() === searchTerm.toLowerCase());
			
			if (exactMatch) {
				// Select from dropdown if exact match
				this.onLotSelected(index, exactMatch);
			} else {
				// Add as manual entry
				this.addManualLot(index, searchTerm);
			}
		}
	}

	handleSerialEnter(index: number): void {
		const searchTerm = (this.serialSearchTerms[index] || '').trim();
		if (searchTerm) {
			// Check if it's from dropdown first
			const filtered = this.filteredSerialsPerItem[index] || [];
			const exactMatch = filtered.find(serial => serial.toLowerCase() === searchTerm.toLowerCase());
			
			if (exactMatch) {
				// Select from dropdown if exact match
				this.onSerialSelected(index, exactMatch);
			} else {
				// Add as manual entry
				this.addManualSerial(index, searchTerm);
			}
		}
	}

	addManualLot(index: number, lotNumber: string): void {
		if (!lotNumber.trim()) return;
		
		const ctrl = this.itemsArray.at(index).get('lot_numbers');
		const current = this.getSelectedLots(index);
		const requiredQty = this.getRequiredQuantity(index);

		if (!current.includes(lotNumber.trim()) && current.length < requiredQty) {
			current.push(lotNumber.trim());
			ctrl?.setValue(current.join(', '));
			this.lotSearchTerms[index] = '';
			this.showLotDropdown[index] = false;
		} else if (current.length >= requiredQty) {
			this.alertService.warning(
				this.t('lot_selection_limit_reached'),
				this.t('warning')
			);
		}
	}

	addManualSerial(index: number, serialNumber: string): void {
		if (!serialNumber.trim()) return;
		
		const ctrl = this.itemsArray.at(index).get('serial_numbers');
		const current = this.getSelectedSerials(index);
		const requiredQty = this.getRequiredQuantity(index);

		if (!current.includes(serialNumber.trim()) && current.length < requiredQty) {
			current.push(serialNumber.trim());
			ctrl?.setValue(current.join(', '));
			this.serialSearchTerms[index] = '';
			this.showSerialDropdown[index] = false;
		} else if (current.length >= requiredQty) {
			this.alertService.warning(
				this.t('serial_selection_limit_reached'),
				this.t('warning')
			);
		}
	}

	getUserDisplayName(userId: string): string {
		const user = this.users.find(u => u.id === userId);
		return user ? user.first_name + ' ' + user.last_name || user.email : userId;
	}

	getLocationDisplayName(locationCode: string): string {
		const location = this.locations.find(l => l.location_code === locationCode);
		return location ? `${location.location_code}${location.description ? ` - ${location.description}` : ''}` : locationCode;
	}

	markFormGroupTouched(formGroup: any): void {
		Object.keys(formGroup.controls).forEach(field => {
			const control = formGroup.get(field);
			control?.markAsTouched({ onlySelf: true });
			
			if (control && (control as any).controls) {
				this.markFormGroupTouched(control);
			}
		});
	}

	isFormComplete(): boolean {
		for (let i = 0; i < this.itemsArray.length; i++) {
			const item = this.itemsArray.at(i);
			const sku = item.get('sku')?.value;
			const requiredQty = this.requiredQuantities[i] || 0;
			const location = item.get('location')?.value;

			if (!sku || !requiredQty || requiredQty <= 0 || !location) {
				return false;
			}

			const article = this.getArticleBySku(sku);
			
			if (article?.track_by_lot) {
				const selectedLots = this.getSelectedLots(i);
				if (selectedLots.length !== requiredQty) {
					return false;
				}
			}
			
			if (article?.track_by_serial) {
				const selectedSerials = this.getSelectedSerials(i);
				if (selectedSerials.length !== requiredQty) {
					return false;
				}
			}
		}

		return true;
	}

	isFieldInvalid(fieldName: string): boolean {
		const field = this.form.get(fieldName);
		return !!(field && field.invalid && field.touched);
	}

	getFieldError(fieldName: string): string {
		const field = this.form.get(fieldName);
		if (field && field.errors && field.touched) {
			if (field.errors['required']) {
				return this.t(`${fieldName}_required`);
			}
			if (field.errors['min']) {
				return this.t('quantity_min');
			}
		}
		return '';
	}

	isItemFieldInvalid(itemIndex: number, fieldName: string): boolean {
		if (fieldName === 'required_qty') {
			const qty = this.requiredQuantities[itemIndex] || 0;
			return qty <= 0;
		}
		
		const itemGroup = this.itemsArray.at(itemIndex);
		const field = itemGroup.get(fieldName);
		return !!(field && field.invalid && field.touched);
	}

	getItemFieldError(itemIndex: number, fieldName: string): string {
		if (fieldName === 'required_qty') {
			const qty = this.requiredQuantities[itemIndex] || 0;
			if (qty <= 0) {
				return this.t('required_qty_required');
			}
			return '';
		}
		
		const itemGroup = this.itemsArray.at(itemIndex);
		const field = itemGroup.get(fieldName);
		if (field && field.errors && field.touched) {
			if (field.errors['required']) {
				return this.t(`${fieldName}_required`);
			}
			if (field.errors['min']) {
				return this.t('quantity_min');
			}
		}
		return '';
	}
}
