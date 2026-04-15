import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ReceivingTask, ReceivingTaskItem, CreateReceivingTaskRequest } from '@app/models/receiving-task.model';
import { LotEntry } from '@app/models/lot-entry.model';
import { Location } from '@app/models/location.model';
import { User } from '@app/models/user.model';
import { Article } from '@app/models/article.model';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { InventoryService } from '@app/services/inventory.service';
import { SerialService } from '@app/services/serial.service';
import { LocationService } from '@app/services/location.service';
import { UserService } from '@app/services/user.service';
import { ArticleService } from '@app/services/article.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { LanguageService } from '@app/services/extras/language.service';
import { getDisplayableApiError, humanizeApiError } from '@app/utils';
import { ZardSelectComponent } from '../../../shared/components/select/select.component';
import { ZardSelectItemComponent } from '../../../shared/components/select/select-item.component';

@Component({
	selector: 'app-receiving-task-form',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, FormsModule, ZardSelectComponent, ZardSelectItemComponent],
	templateUrl: './receiving-task-form.component.html',
	styleUrls: ['./receiving-task-form.component.css']
})
export class ReceivingTaskFormComponent implements OnInit {
	@Input() task: ReceivingTask | null = null;
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

	// Serial tracking state (lots now use FormArray — see getLotsArray)
	availableSerialsPerItem: string[][] = [];
	filteredSerialsPerItem: string[][] = [];
	serialSearchTerms: string[] = [];
	showSerialDropdown: boolean[] = [];
	expectedQuantities: number[] = [];

	// Operator combobox
	operatorSearchTerm: string = '';
	showOperatorDropdown: boolean = false;
	filteredOperators: User[] = [];

	// R3: last-known location per SKU, scoped to this form session
	private lastLocationCache: Record<string, string> = {};

	constructor(
		private fb: FormBuilder,
		private receivingTaskService: ReceivingTaskService,
		private inventoryService: InventoryService,
		private locationService: LocationService,
		private userService: UserService,
		private articleService: ArticleService,
		private serialService: SerialService,
		private alertService: AlertService,
		private loadingService: LoadingService,
		private languageService: LanguageService,
		private cdr: ChangeDetectorRef
	) {
		this.form = this.fb.group({
			inbound_number: ['', [Validators.required]],
			assigned_to: ['', [Validators.required]],
			priority: ['normal', [Validators.required]],
			notes: [''],
			items: this.fb.array([])
		});
	}

	async ngOnInit(): Promise<void> {
		await this.loadData();
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

	// ── FormArray accessors ──────────────────────────────────────────────────

	get itemsArray(): FormArray {
		return this.form.get('items') as FormArray;
	}

	getLotsArray(itemIndex: number): FormArray {
		return (this.itemsArray.at(itemIndex) as FormGroup).get('lots') as FormArray;
	}

	/** Cast AbstractControl → FormGroup for Angular template nested FormArrays */
	asGroup(control: AbstractControl): FormGroup {
		return control as FormGroup;
	}

	// ── Item / Lot group factories ───────────────────────────────────────────

	private createItemGroup(item?: ReceivingTaskItem): FormGroup {
		return this.fb.group({
			sku: [item?.sku || '', Validators.required],
			location: [item?.location || '', Validators.required],
			serial_numbers: [''],
			lots: this.fb.array(
				(item?.lots ?? []).map(l => this.createLotGroup(l))
			),
		});
	}

	private createLotGroup(lot?: LotEntry): FormGroup {
		return this.fb.group({
			lot_number: [lot?.lot_number || '', Validators.required],
			quantity: [lot?.quantity ?? 0, [Validators.required, Validators.min(0.001)]],
			expiration_date: [lot?.expiration_date || ''],
		});
	}

	// ── Lot FormArray operations (F1) ────────────────────────────────────────

	addLot(itemIndex: number): void {
		this.getLotsArray(itemIndex).push(this.createLotGroup());
	}

	removeLot(itemIndex: number, lotIndex: number): void {
		this.getLotsArray(itemIndex).removeAt(lotIndex);
	}

	articleTracksByLot(itemIndex: number): boolean {
		const sku = (this.itemsArray.at(itemIndex) as FormGroup).get('sku')?.value;
		const article = this.articles.find(a => a.sku === sku);
		return article?.track_by_lot ?? false;
	}

	validateLotSum(itemIndex: number): string | null {
		const expectedQty = this.expectedQuantities[itemIndex] || 0;
		if (!this.articleTracksByLot(itemIndex) || expectedQty === 0) return null;
		const lots = this.getLotsArray(itemIndex).controls;
		const sumQty = lots.reduce((sum, l) => sum + (l.get('quantity')?.value || 0), 0);
		if (Math.abs(sumQty - expectedQty) > 0.001) {
			return `Suma de lotes (${sumQty}) ≠ cantidad esperada (${expectedQty})`;
		}
		return null;
	}

	getLotValidationError(itemIndex: number): string | null {
		return this.validateLotSum(itemIndex);
	}

	// ── R3: Auto-sugerencia de última ubicación para el SKU ──────────────────

	async suggestLastLocationForSku(itemIndex: number, sku: string): Promise<void> {
		if (!sku) return;
		const item = this.itemsArray.at(itemIndex) as FormGroup;
		// Do not overwrite if operator already has a location selected
		if (item.get('location')?.value) return;

		// Cache hit — no network call needed
		if (this.lastLocationCache[sku]) {
			const locationCode = this.lastLocationCache[sku];
			item.get('location')?.setValue(locationCode);
			const loc = this.locations.find(l => l.location_code === locationCode);
			this.locationSearchTerms[itemIndex] = loc
				? `${loc.location_code} - ${loc.description}`
				: locationCode;
			return;
		}

		try {
			// pick-suggestions returns entries sorted by FEFO; first entry is most recently used
			const resp = await this.inventoryService.getPickSuggestions(sku);
			if (resp?.result?.success && resp.data?.length > 0) {
				const locationCode = resp.data[0].location;
				if (locationCode) {
					this.lastLocationCache[sku] = locationCode;
					// Guard: user might have typed during the async call
					if (!item.get('location')?.value) {
						item.get('location')?.setValue(locationCode);
						const loc = this.locations.find(l => l.location_code === locationCode);
						this.locationSearchTerms[itemIndex] = loc
							? `${loc.location_code} - ${loc.description}`
							: locationCode;
					}
				}
			}
		} catch (err) {
			console.debug('[R3] suggestLastLocationForSku failed silently', err);
		}
	}

	// ── Modal helpers ────────────────────────────────────────────────────────

	close(): void {
		this.resetForm();
		this.cancel.emit();
	}

	onCancel(): void {
		this.resetForm();
		this.cancel.emit();
	}

	private resetForm(): void {
		this.operatorSearchTerm = '';
		this.showOperatorDropdown = false;
		this.filteredOperators = [...this.users];
		this.form.reset();
	}

	onBackdropClick(event: Event): void {
		if (event.target === event.currentTarget) {
			this.close();
		}
	}

	// ── Operator combobox ────────────────────────────────────────────────────

	filterOperators(): void {
		const term = (this.operatorSearchTerm || '').toLowerCase();
		if (!term) {
			this.filteredOperators = [...this.users];
			return;
		}
		this.filteredOperators = this.users.filter(user =>
			(user.first_name || '').toLowerCase().includes(term) ||
			(user.last_name || '').toLowerCase().includes(term) ||
			(user.email || '').toLowerCase().includes(term)
		);
	}

	onOperatorSelected(user: User): void {
		this.form.patchValue({ assigned_to: user.id });
		this.operatorSearchTerm = this.getUserDisplayName(user.id);
		this.showOperatorDropdown = false;
	}

	onOperatorBlur(): void {
		setTimeout(() => (this.showOperatorDropdown = false), 150);
	}

	closeOperatorDropdownLater(): void {
		setTimeout(() => (this.showOperatorDropdown = false), 150);
	}

	isOperatorValid(): boolean {
		const formValue = this.form.get('assigned_to')?.value;
		return !!formValue && this.users.some(u => u.id === formValue);
	}

	hasValidOperatorSelection(): boolean {
		return this.isOperatorValid();
	}

	enableOperatorEdit(): void {
		this.operatorSearchTerm = '';
		this.showOperatorDropdown = true;
		this.form.patchValue({ assigned_to: '' });
	}

	clearOperatorManually(): void {
		this.operatorSearchTerm = '';
		this.form.patchValue({ assigned_to: '' });
		this.showOperatorDropdown = false;
	}

	getSelectedOperatorName(): string {
		const userId = this.form.get('assigned_to')?.value;
		const user = this.users.find(u => u.id === userId);
		return user ? `${user.first_name} ${user.last_name}` : '';
	}

	confirmFirstOperatorIfAny(): void {
		const list = this.filteredOperators || [];
		if (list.length > 0) this.onOperatorSelected(list[0]);
	}

	// ── Data loading ─────────────────────────────────────────────────────────

	async loadData(): Promise<void> {
		try {
			this.isLoading = true;

			const [locationResponse, userResponse, articleResponse] = await Promise.all([
				this.locationService.getAll(),
				this.userService.getAll(),
				this.articleService.getAll()
			]);

			if (locationResponse.result.success) {
				this.locations = locationResponse.data;
			}

			if (userResponse.result.success) {
				this.users = (userResponse.data || []).filter(
					(u: User) => (u.role?.name ?? u.role_id ?? '').toLowerCase() === 'operator'
				);
				this.filteredOperators = [...this.users];
			}

			if (articleResponse.result.success) {
				this.articles = (articleResponse.data || []).filter(article => article.is_active !== false);
			}
		} catch (error) {
			this.alertService.error(this.t('error_loading_data'), this.t('error'));
		} finally {
			this.isLoading = false;
		}
	}

	loadTaskForEdit(): void {
		if (!this.task) return;

		if (this.task.assigned_to) {
			const user = this.users.find(u => u.id === this.task!.assigned_to);
			if (user) this.operatorSearchTerm = this.getUserDisplayName(user.id);
		}

		this.form.patchValue({
			inbound_number: this.task.order_number || this.task.inbound_number,
			assigned_to: this.task.assigned_to,
			priority: this.task.priority,
			notes: this.task.notes || ''
		});

		while (this.itemsArray.length !== 0) this.itemsArray.removeAt(0);

		if (this.task.items && this.task.items.length > 0) {
			this.task.items.forEach((item, i) => {
				const serialNumbers = item.serialNumbers || item.serial_numbers || [];
				const expectedQty = item.expectedQty || item.expected_qty || 0;

				this.itemsArray.push(this.createItemGroup(item));
				(this.itemsArray.at(i) as FormGroup)
					.get('serial_numbers')?.setValue(serialNumbers.join(', ') || '');

				this.expectedQuantities[i] = expectedQty;
				this.ensureComboboxState(i);

				const article = this.getArticleBySku(item.sku);
				this.skuSearchTerms[i] = article ? `${article.sku} - ${article.name}` : item.sku;
				const loc = this.locations.find(l => l.location_code === item.location);
				this.locationSearchTerms[i] = loc
					? `${loc.location_code} - ${loc.description}`
					: item.location;

				this.loadTrackingOptionsForItem(i, item.sku);
			});
		} else {
			this.addItem();
		}
	}

	// ── Item CRUD ────────────────────────────────────────────────────────────

	canAddItem(): boolean {
		if (this.itemsArray.length === 0) return true;
		const lastIndex = this.itemsArray.length - 1;
		const lastItem = this.itemsArray.at(lastIndex);
		if (!lastItem) return true;
		const sku = lastItem.get('sku')?.value;
		const expectedQty = this.expectedQuantities[lastIndex];
		const location = lastItem.get('location')?.value;
		return !!(sku && expectedQty && expectedQty > 0 && location);
	}

	addItem(): void {
		if (!this.canAddItem()) {
			this.alertService.warning(
				this.t('complete_current_item_before_adding_new'),
				this.t('warning')
			);
			return;
		}
		this.itemsArray.push(this.createItemGroup());
		const index = this.itemsArray.length - 1;
		this.expectedQuantities[index] = 1;
		this.ensureComboboxState(index);
		this.cdr.detectChanges();
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
			this.expectedQuantities.splice(index, 1);
			this.availableSerialsPerItem.splice(index, 1);
			this.filteredSerialsPerItem.splice(index, 1);
			this.serialSearchTerms.splice(index, 1);
			this.showSerialDropdown.splice(index, 1);
		}
	}

	// ── Submit ───────────────────────────────────────────────────────────────

	async onSubmit(): Promise<void> {
		if (this.form.invalid || !this.isFormComplete()) {
			this.markFormGroupTouched(this.form);
			this.alertService.error(this.t('please_complete_required_fields'), this.t('error'));
			return;
		}

		try {
			this.loadingService.show();

			const formValue = this.form.value;
			const taskData: any = {
				inbound_number: formValue.inbound_number,
				assigned_to: formValue.assigned_to,
				priority: formValue.priority,
				status: this.task ? this.task.status : 'open',
				items: formValue.items.map((item: any, index: number) => {
					const mapped: any = {
						sku: item.sku,
						expected_qty: this.expectedQuantities[index] || 0,
						location: item.location,
					};
					// F1: map lots FormArray → LotEntry[]
					if (item.lots && item.lots.length > 0) {
						mapped.lots = (item.lots as any[]).map(l => ({
							lot_number: l.lot_number,
							quantity: l.quantity,
							...(l.expiration_date ? { expiration_date: l.expiration_date } : {}),
						}));
					}
					// Legacy alias: preserve lot_numbers[] for older tasks that had them
					const legacyLots = this.task?.items?.[index]?.lot_numbers;
					if (legacyLots?.length && !mapped.lots) {
						mapped.lot_numbers = legacyLots;
					}
					if (item.serial_numbers) {
						const serials = (item.serial_numbers as string)
							.split(',').map((s: string) => s.trim()).filter((s: string) => s);
						if (serials.length) mapped.serial_numbers = serials;
					}
					return mapped;
				})
			};

			if (formValue.notes?.trim()) {
				taskData.notes = formValue.notes;
			}

			if (this.task) {
				const response = await this.receivingTaskService.update(this.task.id, taskData);
				if (response.result.success) {
					this.alertService.success(
						this.t('receiving_task_updated_successfully'),
						this.t('success')
					);
					this.success.emit();
				} else {
					this.alertService.error(
						humanizeApiError(response.result.message || '', this.t, 'failed_to_update_receiving_task'),
						this.t('error')
					);
				}
			} else {
				const response = await this.receivingTaskService.create(taskData);
				if (response.result.success) {
					this.alertService.success(
						this.t('receiving_task_created_successfully'),
						this.t('success')
					);
					this.success.emit();
				} else {
					this.alertService.error(
						humanizeApiError(response.result.message || '', this.t, 'failed_to_create_receiving_task'),
						this.t('error')
					);
				}
			}
		} catch (error: any) {
			this.alertService.error(
				getDisplayableApiError(error, this.t, 'error_saving_task'),
				this.t('error')
			);
		} finally {
			this.loadingService.hide();
		}
	}

	// ── Combobox state init ──────────────────────────────────────────────────

	ensureComboboxState(index: number): void {
		if (this.skuSearchTerms[index] === undefined) this.skuSearchTerms[index] = '';
		if (this.locationSearchTerms[index] === undefined) this.locationSearchTerms[index] = '';
		if (this.showSkuDropdown[index] === undefined) this.showSkuDropdown[index] = false;
		if (this.showLocationDropdown[index] === undefined) this.showLocationDropdown[index] = false;
		this.filteredArticlesPerItem[index] = [...this.articles];
		this.filteredLocationsPerItem[index] = [...this.locations];
		if (!this.availableSerialsPerItem[index]) this.availableSerialsPerItem[index] = [];
		if (!this.filteredSerialsPerItem[index]) this.filteredSerialsPerItem[index] = [];
		if (this.serialSearchTerms[index] === undefined) this.serialSearchTerms[index] = '';
		if (this.showSerialDropdown[index] === undefined) this.showSerialDropdown[index] = false;
	}

	// ── SKU combobox ─────────────────────────────────────────────────────────

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

	onSkuSelected(index: number, article: Article): void {
		this.clearItemTrackingData(index);

		this.itemsArray.at(index).get('sku')?.setValue(article.sku);
		this.skuSearchTerms[index] = `${article.sku} - ${article.name}`;
		this.showSkuDropdown[index] = false;

		this.itemsArray.at(index).get('location')?.setValue('');
		this.locationSearchTerms[index] = '';

		this.loadTrackingOptionsForItem(index, article.sku);
		// R3: pre-fill location with last known location for this SKU
		this.suggestLastLocationForSku(index, article.sku);
	}

	clearItemTrackingData(index: number): void {
		// Clear serials
		this.itemsArray.at(index).get('serial_numbers')?.setValue('');
		this.availableSerialsPerItem[index] = [];
		this.filteredSerialsPerItem[index] = [];
		this.serialSearchTerms[index] = '';
		this.showSerialDropdown[index] = false;
		// Clear lots FormArray
		const lotsArray = this.getLotsArray(index);
		while (lotsArray && lotsArray.length > 0) lotsArray.removeAt(0);
	}

	onSkuBlur(index: number): void {
		setTimeout(() => (this.showSkuDropdown[index] = false), 150);
	}

	closeSkuDropdownLater(index: number): void {
		setTimeout(() => (this.showSkuDropdown[index] = false), 150);
	}

	isSkuValid(index: number): boolean {
		const formValue = this.itemsArray.at(index).get('sku')?.value;
		return !!formValue && this.articles.some(a => a.sku === formValue);
	}

	hasValidSkuSelection(index: number): boolean {
		return this.isSkuValid(index);
	}

	enableSkuEdit(index: number): void {
		this.skuSearchTerms[index] = '';
		this.showSkuDropdown[index] = true;
		this.itemsArray.at(index).get('sku')?.setValue('');
		this.clearItemTrackingData(index);
	}

	clearSkuManually(index: number): void {
		this.skuSearchTerms[index] = '';
		this.itemsArray.at(index).get('sku')?.setValue('');
		this.showSkuDropdown[index] = false;
		this.clearItemTrackingData(index);
	}

	getSelectedSkuName(index: number): string {
		const sku = this.itemsArray.at(index).get('sku')?.value;
		const article = this.articles.find(a => a.sku === sku);
		return article ? article.name : '';
	}

	// ── Location combobox ────────────────────────────────────────────────────

	filterLocationsForItem(index: number): void {
		const term = (this.locationSearchTerms[index] || '').toLowerCase();
		if (!term) {
			this.filteredLocationsPerItem[index] = [...this.locations];
			return;
		}
		this.filteredLocationsPerItem[index] = this.locations.filter(l =>
			(l.location_code || '').toLowerCase().includes(term) ||
			(l.description || '').toLowerCase().includes(term)
		);
	}

	onLocationSelected(index: number, location: Location): void {
		this.itemsArray.at(index).get('location')?.setValue(location.location_code);
		this.locationSearchTerms[index] = `${location.location_code} - ${location.description}`;
		this.showLocationDropdown[index] = false;
	}

	onLocationBlur(index: number): void {
		setTimeout(() => (this.showLocationDropdown[index] = false), 150);
	}

	closeLocationDropdownLater(index: number): void {
		setTimeout(() => (this.showLocationDropdown[index] = false), 150);
	}

	isLocationValid(index: number): boolean {
		const formValue = this.itemsArray.at(index).get('location')?.value;
		return !!formValue && this.locations.some(l => l.location_code === formValue);
	}

	hasValidLocationSelection(index: number): boolean {
		return this.isLocationValid(index);
	}

	enableLocationEdit(index: number): void {
		this.locationSearchTerms[index] = '';
		this.showLocationDropdown[index] = true;
		this.itemsArray.at(index).get('location')?.setValue('');
	}

	clearLocationManually(index: number): void {
		this.locationSearchTerms[index] = '';
		this.itemsArray.at(index).get('location')?.setValue('');
		this.showLocationDropdown[index] = false;
	}

	getSelectedLocationName(index: number): string {
		const locationCode = this.itemsArray.at(index).get('location')?.value;
		const location = this.locations.find(l => l.location_code === locationCode);
		return location ? `${location.location_code} - ${location.description}` : locationCode;
	}

	confirmFirstArticleIfAny(index: number): void {
		const list = this.filteredArticlesPerItem[index] || [];
		if (list.length > 0) this.onSkuSelected(index, list[0]);
	}

	confirmFirstLocationIfAny(index: number): void {
		const list = this.filteredLocationsPerItem[index] || [];
		if (list.length > 0) this.onLocationSelected(index, list[0]);
	}

	// ── Article helpers ──────────────────────────────────────────────────────

	private getArticleBySku(sku: string): Article | undefined {
		return this.articles.find(a => a.sku === sku);
	}

	shouldShowSerialNumbers(index: number): boolean {
		const sku = this.itemsArray.at(index).get('sku')?.value;
		const article = this.getArticleBySku(sku);
		return !!article?.track_by_serial;
	}

	// ── Serial tracking ──────────────────────────────────────────────────────

	isSerialSelectionComplete(index: number): boolean {
		const expectedQty = this.getExpectedQuantity(index);
		return expectedQty > 0 && this.getSelectedSerialCount(index) === expectedQty;
	}

	private async loadTrackingOptionsForItem(index: number, sku: string): Promise<void> {
		const article = this.getArticleBySku(sku);
		if (!article?.track_by_serial) return;
		try {
			const serialsResp = await this.serialService.getBySku(sku);
			if (serialsResp.result.success) {
				this.availableSerialsPerItem[index] = (serialsResp.data || []).map(s => s.serial_number);
				this.filteredSerialsPerItem[index] = [...this.availableSerialsPerItem[index]];
			}
		} catch {}
	}

	filterSerialsForItem(index: number): void {
		const term = (this.serialSearchTerms[index] || '').toLowerCase();
		const options = this.availableSerialsPerItem[index] || [];
		this.filteredSerialsPerItem[index] = term
			? options.filter(v => (v || '').toLowerCase().includes(term))
			: [...options];
	}

	onExpectedQuantityChange(index: number): void {
		const ctrl = this.itemsArray.at(index);
		if (ctrl) {
			ctrl.get('serial_numbers')?.setValue('');
			this.serialSearchTerms[index] = '';
			this.showSerialDropdown[index] = false;
		}
	}

	getExpectedQuantity(index: number, dato?: number): number {
		if (dato !== undefined && dato !== null) return dato;
		return Number(this.expectedQuantities[index] || 0) || 0;
	}

	getSelectedSerials(index: number): string[] {
		const ctrl = this.itemsArray.at(index).get('serial_numbers');
		const current = (ctrl?.value as string) || '';
		return current ? current.split(',').map(s => s.trim()).filter(Boolean) : [];
	}

	getSelectedSerialCount(index: number): number {
		return this.getSelectedSerials(index).length;
	}

	isSerialSelected(index: number, serialNumber: string): boolean {
		return this.getSelectedSerials(index).includes(serialNumber);
	}

	onSerialSelected(index: number, serialNumber: string): void {
		const ctrl = this.itemsArray.at(index).get('serial_numbers');
		const current = this.getSelectedSerials(index);
		const expectedQty = this.getExpectedQuantity(index);
		if (current.includes(serialNumber)) {
			ctrl?.setValue(current.filter(s => s !== serialNumber).join(', '));
		} else if (current.length < expectedQty) {
			current.push(serialNumber);
			ctrl?.setValue(current.join(', '));
		} else {
			this.alertService.warning(this.t('serial_selection_limit_reached'), this.t('warning'));
		}
		this.showSerialDropdown[index] = false;
	}

	removeSerial(index: number, serialNumber: string): void {
		const ctrl = this.itemsArray.at(index).get('serial_numbers');
		const current = this.getSelectedSerials(index);
		ctrl?.setValue(current.filter(s => s !== serialNumber).join(', '));
	}

	selectRandomSerials(index: number): void {
		const expectedQty = this.getExpectedQuantity(index);
		const availableSerials = this.availableSerialsPerItem[index] || [];
		if (availableSerials.length === 0) {
			this.alertService.warning(this.t('no_serials_available'), this.t('warning'));
			return;
		}
		if (expectedQty <= 0) {
			this.alertService.warning(this.t('set_expected_quantity_first'), this.t('warning'));
			return;
		}
		const selected = [...availableSerials]
			.sort(() => 0.5 - Math.random())
			.slice(0, Math.min(expectedQty, availableSerials.length));
		this.itemsArray.at(index).get('serial_numbers')?.setValue(selected.join(', '));
		this.alertService.success(
			this.t('random_serials_selected') + ` (${selected.length})`,
			this.t('success')
		);
	}

	closeSerialDropdownLater(index: number): void {
		setTimeout(() => (this.showSerialDropdown[index] = false), 150);
	}

	confirmFirstSerialIfAny(index: number): void {
		const list = this.filteredSerialsPerItem[index] || [];
		if (list.length > 0 && !this.getSelectedSerials(index).includes(list[0])) {
			this.onSerialSelected(index, list[0]);
		}
	}

	handleSerialEnter(index: number): void {
		const searchTerm = (this.serialSearchTerms[index] || '').trim();
		if (!searchTerm) return;
		const filtered = this.filteredSerialsPerItem[index] || [];
		const exactMatch = filtered.find(s => s.toLowerCase() === searchTerm.toLowerCase());
		if (exactMatch) {
			this.onSerialSelected(index, exactMatch);
		} else {
			this.addManualSerial(index, searchTerm);
		}
	}

	addManualSerial(index: number, serialNumber: string): void {
		if (!serialNumber.trim()) return;
		const ctrl = this.itemsArray.at(index).get('serial_numbers');
		const current = this.getSelectedSerials(index);
		const expectedQty = this.getExpectedQuantity(index);
		if (!current.includes(serialNumber.trim()) && current.length < expectedQty) {
			current.push(serialNumber.trim());
			ctrl?.setValue(current.join(', '));
			this.serialSearchTerms[index] = '';
			this.showSerialDropdown[index] = false;
		} else if (current.length >= expectedQty) {
			this.alertService.warning(this.t('serial_selection_limit_reached'), this.t('warning'));
		}
	}

	onManualSerialInput(_index: number): void {}

	// ── Form validation helpers ──────────────────────────────────────────────

	getUserDisplayName(userId: string): string {
		const user = this.users.find(u => u.id === userId);
		return user ? user.first_name + ' ' + user.last_name || user.email : userId;
	}

	getLocationDisplayName(locationCode: string): string {
		const location = this.locations.find(l => l.location_code === locationCode);
		return location
			? `${location.location_code}${location.description ? ` - ${location.description}` : ''}`
			: locationCode;
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
			const expectedQty = this.expectedQuantities[i] || 0;
			const location = item.get('location')?.value;

			if (!sku || !expectedQty || expectedQty <= 0 || !location) return false;

			const article = this.getArticleBySku(sku);

			if (article?.track_by_lot) {
				// Must have at least one lot and sum must match expected_qty
				if (this.getLotsArray(i).length === 0) return false;
				if (this.validateLotSum(i) !== null) return false;
			}

			if (article?.track_by_serial) {
				if (this.getSelectedSerials(i).length !== expectedQty) return false;
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
			if (field.errors['required']) return this.t(`${fieldName}_required`);
			if (field.errors['min']) return this.t('quantity_min');
		}
		return '';
	}

	isItemFieldInvalid(itemIndex: number, fieldName: string): boolean {
		if (fieldName === 'expected_qty') {
			return (this.expectedQuantities[itemIndex] || 0) <= 0;
		}
		const field = this.itemsArray.at(itemIndex).get(fieldName);
		return !!(field && field.invalid && field.touched);
	}

	getItemFieldError(itemIndex: number, fieldName: string): string {
		if (fieldName === 'expected_qty') {
			if ((this.expectedQuantities[itemIndex] || 0) <= 0) return this.t('expected_qty_required');
			return '';
		}
		const field = this.itemsArray.at(itemIndex).get(fieldName);
		if (field && field.errors && field.touched) {
			if (field.errors['required']) return this.t(`${fieldName}_required`);
			if (field.errors['min']) return this.t('quantity_min');
		}
		return '';
	}
}
