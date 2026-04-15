import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
	FormBuilder, FormGroup, FormArray,
	Validators, ReactiveFormsModule, AbstractControl
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { PickingTask, CreatePickingTaskRequest } from '@app/models/picking-task.model';
import { LocationAllocation } from '@app/models/lot-entry.model';
import { Location } from '@app/models/location.model';
import { User } from '@app/models/user.model';
import { Article } from '@app/models/article.model';
import { PickingTaskService } from '@app/services/picking-task.service';
import { LocationService } from '@app/services/location.service';
import { InventoryService } from '@app/services/inventory.service';
import { UserService } from '@app/services/user.service';
import { ArticleService } from '@app/services/article.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { LanguageService } from '@app/services/extras/language.service';
import { getDisplayableApiError, humanizeApiError } from '@app/utils';
import { DrawerComponent } from '@app/shared/components/drawer';
import { ZardSelectComponent } from '../../../shared/components/select/select.component';
import { ZardSelectItemComponent } from '../../../shared/components/select/select-item.component';
import { ZardButtonComponent } from '../../../shared/components/button/button.component';

@Component({
	selector: 'app-picking-task-form',
	standalone: true,
	imports: [
		CommonModule, ReactiveFormsModule, FormsModule,
		DrawerComponent, ZardButtonComponent, ZardSelectComponent, ZardSelectItemComponent
	],
	templateUrl: './picking-task-form.component.html',
	styleUrls: ['./picking-task-form.component.css']
})
export class PickingTaskFormComponent implements OnInit {
	@Input() task: PickingTask | null = null;
	@Input() isOpen = false;
	@Output() success = new EventEmitter<void>();
	@Output() cancel = new EventEmitter<void>();

	form: FormGroup;
	locations: Location[] = [];
	users: User[] = [];
	articles: Article[] = [];
	isLoading = false;
	isEditing = false;

	// SKU combobox state per item index
	skuSearchTerms: string[] = [];
	showSkuDropdown: boolean[] = [];
	filteredArticlesPerItem: Article[][] = [];

	// Operator combobox state
	operatorSearchTerm = '';
	showOperatorDropdown = false;
	filteredOperators: User[] = [];

	// F2: stock warning per item index
	stockWarnings: Record<number, string> = {};

	// F3: available qty cache, key = "itemIndex-allocIndex"
	availableQtyPerAlloc: Record<string, number> = {};

	constructor(
		private fb: FormBuilder,
		private pickingTaskService: PickingTaskService,
		private locationService: LocationService,
		private userService: UserService,
		private articleService: ArticleService,
		private inventoryService: InventoryService,
		private alertService: AlertService,
		private loadingService: LoadingService,
		private languageService: LanguageService,
		private cdr: ChangeDetectorRef
	) {
		this.form = this.fb.group({
			outbound_number: ['', [Validators.required]],
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

	close(): void {
		this.cancel.emit();
	}

	onDrawerClosed(): void {
		this.cancel.emit();
	}

	// ─────────────────────────────────────────────────────────────
	//  Angular FormGroup Helpers (required for nested FormArray)
	// ─────────────────────────────────────────────────────────────

	/** Cast AbstractControl → FormGroup for template access. */
	asGroup(control: AbstractControl): FormGroup {
		return control as FormGroup;
	}

	getItemsArray(): FormArray {
		return this.form.get('items') as FormArray;
	}

	getAllocationsArray(itemIndex: number): FormArray {
		return (this.getItemsArray().at(itemIndex) as FormGroup).get('allocations') as FormArray;
	}

	// ─────────────────────────────────────────────────────────────
	//  Form Group Factories
	// ─────────────────────────────────────────────────────────────

	private createItemGroup(item?: { sku?: string; required_qty?: number; allocations?: LocationAllocation[] }): FormGroup {
		const allocs = item?.allocations || [];
		return this.fb.group({
			sku: [item?.sku || '', Validators.required],
			required_qty: [item?.required_qty || 0, [Validators.required, Validators.min(0.001)]],
			allocations: this.fb.array(allocs.map(a => this.createAllocationGroup(a))),
		});
	}

	private createAllocationGroup(alloc?: Partial<LocationAllocation>): FormGroup {
		return this.fb.group({
			location: [alloc?.location || '', Validators.required],
			quantity: [alloc?.quantity || 0, [Validators.required, Validators.min(0.001)]],
			lot_number: [alloc?.lot_number || ''],
			expiration_date_display: [alloc?.expiration_date || ''],
		});
	}

	// ─────────────────────────────────────────────────────────────
	//  Allocation Management — F2
	// ─────────────────────────────────────────────────────────────

	addAllocation(itemIndex: number): void {
		this.getAllocationsArray(itemIndex).push(this.createAllocationGroup());
	}

	removeAllocation(itemIndex: number, allocIndex: number): void {
		this.getAllocationsArray(itemIndex).removeAt(allocIndex);
		this.reindexAvailableQtyCache(itemIndex, allocIndex);
	}

	private reindexAvailableQtyCache(itemIndex: number, removedAllocIndex: number): void {
		const updated: Record<string, number> = {};
		for (const [key, val] of Object.entries(this.availableQtyPerAlloc)) {
			const [ki, ji] = key.split('-').map(Number);
			if (ki !== itemIndex) {
				updated[key] = val;
			} else if (ji < removedAllocIndex) {
				updated[key] = val;
			} else if (ji > removedAllocIndex) {
				updated[`${ki}-${ji - 1}`] = val;
			}
			// ji === removedAllocIndex → dropped
		}
		this.availableQtyPerAlloc = updated;
	}

	// ─────────────────────────────────────────────────────────────
	//  FEFO Pre-fill — F2b
	// ─────────────────────────────────────────────────────────────

	/** Triggered when SKU or required_qty changes — prefills allocations from backend. */
	async onSkuOrQtyChange(itemIndex: number): Promise<void> {
		const item = this.getItemsArray().at(itemIndex) as FormGroup;
		const sku: string = item.get('sku')?.value || '';
		const qty = Number(item.get('required_qty')?.value);
		if (sku && qty > 0) {
			await this.prefillAllocationsForItem(itemIndex, sku, qty);
		}
	}

	async prefillAllocationsForItem(itemIndex: number, sku: string, requiredQty: number): Promise<void> {
		if (!sku || requiredQty <= 0) return;
		try {
			const resp = await this.inventoryService.getPickSuggestions(sku, requiredQty);
			if (!resp.result.success) return;

			const raw = resp.data as any;
			let allocations: LocationAllocation[] = [];
			let sufficient = true;

			if (raw && typeof raw === 'object' && 'allocations' in raw) {
				// New PickSuggestionResponse (H3)
				allocations = (raw.allocations || []) as LocationAllocation[];
				sufficient = raw.sufficient ?? true;
			} else if (Array.isArray(raw)) {
				// Legacy PickSuggestion[] fallback
				allocations = (raw as any[]).map((s: any) => ({
					location: s.location as string,
					quantity: s.quantity as number,
					lot_number: s.lot_number || undefined,
					expiration_date: s.expiration_date || undefined,
				}));
				const totalFound = allocations.reduce((sum, a) => sum + a.quantity, 0);
				sufficient = totalFound >= requiredQty;
			}

			// Replace allocations in form
			const allocsArray = this.getAllocationsArray(itemIndex);
			allocsArray.clear();
			// Clear the cache for this item
			this.availableQtyPerAlloc = Object.fromEntries(
				Object.entries(this.availableQtyPerAlloc).filter(([k]) => !k.startsWith(`${itemIndex}-`))
			);

			for (const s of allocations) {
				allocsArray.push(this.createAllocationGroup(s));
			}

			// Stock warning if insufficient
			if (!sufficient) {
				const totalFound = allocations.reduce((sum, a) => sum + a.quantity, 0);
				this.stockWarnings[itemIndex] =
					`⚠️ Solo se pueden asignar ${totalFound} uds — se requieren ${requiredQty}. ` +
					`Stock insuficiente en todas las ubicaciones.`;
			} else {
				delete this.stockWarnings[itemIndex];
			}

			// Load F3 available qty for each allocation
			for (let j = 0; j < allocsArray.length; j++) {
				const ag = allocsArray.at(j) as FormGroup;
				const loc: string = ag.get('location')?.value || '';
				if (sku && loc) {
					this.loadAvailableQtyForAlloc(itemIndex, j, sku, loc);
				}
			}

			this.cdr.detectChanges();
		} catch (err) {
			console.error('prefillAllocationsForItem error', err);
		}
	}

	// ─────────────────────────────────────────────────────────────
	//  Allocation Sum Validation — F2c
	// ─────────────────────────────────────────────────────────────

	validateAllocationSum(itemIndex: number): string | null {
		const item = this.getItemsArray().at(itemIndex) as FormGroup;
		const requiredQty = Number(item.get('required_qty')?.value) || 0;
		if (requiredQty <= 0) return null;
		const allocs = this.getAllocationsArray(itemIndex).controls;
		if (allocs.length === 0) return null; // allow empty while user is entering data
		const sumQty = allocs.reduce((s, a) => s + (Number(a.get('quantity')?.value) || 0), 0);
		if (Math.abs(sumQty - requiredQty) > 0.001) {
			return `Suma allocations (${sumQty.toFixed(3)}) ≠ requerido (${requiredQty})`;
		}
		return null;
	}

	canSubmit(): boolean {
		if (this.form.invalid) return false;
		const items = this.getItemsArray().controls;
		for (let i = 0; i < items.length; i++) {
			if (this.getAllocationsArray(i).length === 0) return false;
			if (this.validateAllocationSum(i) !== null) return false;
		}
		return true;
	}

	// ─────────────────────────────────────────────────────────────
	//  Available Qty per Allocation — F3
	// ─────────────────────────────────────────────────────────────

	async loadAvailableQtyForAlloc(itemIndex: number, allocIndex: number, sku: string, location: string): Promise<void> {
		if (!sku || !location) return;
		const key = `${itemIndex}-${allocIndex}`;
		try {
			const inv = await this.inventoryService.getBySkuAndLocation(sku, location);
			if (inv && inv.result.success && inv.data) {
				this.availableQtyPerAlloc[key] =
					inv.data.available_qty ?? (inv.data.quantity - (inv.data.reserved_qty || 0));
			} else {
				this.availableQtyPerAlloc[key] = 0;
			}
		} catch {
			this.availableQtyPerAlloc[key] = 0;
		}
		this.cdr.detectChanges();
	}

	getAvailableQty(itemIndex: number, allocIndex: number): number | null {
		const key = `${itemIndex}-${allocIndex}`;
		return this.availableQtyPerAlloc[key] ?? null;
	}

	isAllocInsufficient(itemIndex: number, allocIndex: number): boolean {
		const avail = this.getAvailableQty(itemIndex, allocIndex);
		if (avail === null) return false;
		const alloc = this.getAllocationsArray(itemIndex).at(allocIndex) as FormGroup;
		return (Number(alloc.get('quantity')?.value) || 0) > avail;
	}

	/** Called on blur of allocation location input to refresh available qty. */
	onAllocLocationChange(itemIndex: number, allocIndex: number): void {
		const itemGroup = this.getItemsArray().at(itemIndex) as FormGroup;
		const sku: string = itemGroup.get('sku')?.value || '';
		const alloc = this.getAllocationsArray(itemIndex).at(allocIndex) as FormGroup;
		const loc: string = alloc.get('location')?.value || '';
		if (sku && loc) {
			this.loadAvailableQtyForAlloc(itemIndex, allocIndex, sku, loc);
		}
	}

	// ─────────────────────────────────────────────────────────────
	//  Start Picking (lazy reservation — B3a)
	// ─────────────────────────────────────────────────────────────

	async startPicking(): Promise<void> {
		if (!this.task) return;
		try {
			this.loadingService.show();
			const response = await this.pickingTaskService.start(this.task.id);
			if (response.result.success) {
				this.alertService.success(
					this.t('picking_started_successfully') || 'Picking iniciado. Stock reservado.',
					this.t('success')
				);
				this.success.emit();
			} else {
				const msg = response.result.message || '';
				this.alertService.error(
					humanizeApiError(msg, this.t, 'failed_to_start_picking'),
					this.t('error')
				);
			}
		} catch (error: any) {
			this.alertService.error(
				getDisplayableApiError(error, this.t, 'error_starting_picking'),
				this.t('error')
			);
		} finally {
			this.loadingService.hide();
		}
	}

	// ─────────────────────────────────────────────────────────────
	//  Operator Combobox
	// ─────────────────────────────────────────────────────────────

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

	onOperatorBlur(): void {
		setTimeout(() => (this.showOperatorDropdown = false), 150);
	}

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

	closeOperatorDropdownLater(): void {
		setTimeout(() => (this.showOperatorDropdown = false), 150);
	}

	confirmFirstOperatorIfAny(): void {
		const list = this.filteredOperators || [];
		if (list.length > 0) this.onOperatorSelected(list[0]);
	}

	// ─────────────────────────────────────────────────────────────
	//  Data Loading
	// ─────────────────────────────────────────────────────────────

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
				this.articles = (articleResponse.data || []).filter(a => a.is_active !== false);
			}
		} catch {
			this.alertService.error(this.t('error_loading_data'), this.t('error'));
		} finally {
			this.isLoading = false;
		}
	}

	loadTaskForEdit(): void {
		if (!this.task) return;

		if (this.task.assigned_to) {
			const user = this.users.find(u => u.id === this.task!.assigned_to);
			this.operatorSearchTerm = user ? this.getUserDisplayName(user.id) : this.task.assigned_to;
		}

		this.form.patchValue({
			outbound_number: this.task.order_number || this.task.outbound_number,
			assigned_to: this.task.assigned_to,
			priority: this.task.priority,
			notes: this.task.notes || ''
		});

		while (this.itemsArray.length !== 0) {
			this.itemsArray.removeAt(0);
		}

		if (this.task.items && this.task.items.length > 0) {
			this.task.items.forEach((item, i) => {
				const requiredQty = item.expectedQty || item.required_qty || 0;

				// Use allocations if present; fall back to legacy location field (F0 alias)
				const allocations: LocationAllocation[] =
					(item.allocations || []).length > 0
						? item.allocations
						: (item.location ? [{ location: item.location, quantity: requiredQty }] : []);

				const itemGroup = this.createItemGroup({ sku: item.sku, required_qty: requiredQty, allocations });
				this.itemsArray.push(itemGroup);
				this.ensureComboboxState(i);

				const article = this.articles.find(a => a.sku === item.sku);
				this.skuSearchTerms[i] = article ? `${article.sku} - ${article.name}` : item.sku;

				// Load F3 available qty for each allocation
				allocations.forEach((alloc, j) => {
					if (item.sku && alloc.location) {
						this.loadAvailableQtyForAlloc(i, j, item.sku, alloc.location);
					}
				});
			});
		} else {
			this.addItem();
		}

		this.cdr.detectChanges();
	}

	// ─────────────────────────────────────────────────────────────
	//  Item Management
	// ─────────────────────────────────────────────────────────────

	get itemsArray(): FormArray {
		return this.form.get('items') as FormArray;
	}

	canAddItem(): boolean {
		if (this.itemsArray.length === 0) return true;
		const last = this.itemsArray.at(this.itemsArray.length - 1) as FormGroup;
		const sku: string = last.get('sku')?.value || '';
		const qty = Number(last.get('required_qty')?.value);
		return !!(sku && qty > 0);
	}

	addItem(): void {
		if (!this.canAddItem()) {
			this.alertService.warning(
				this.t('complete_current_item_before_adding_new'),
				this.t('warning')
			);
			return;
		}
		const itemGroup = this.createItemGroup();
		this.itemsArray.push(itemGroup);
		const index = this.itemsArray.length - 1;
		this.ensureComboboxState(index);
		this.cdr.detectChanges();
	}

	removeItem(index: number): void {
		if (this.itemsArray.length > 1) {
			this.itemsArray.removeAt(index);
			this.skuSearchTerms.splice(index, 1);
			this.showSkuDropdown.splice(index, 1);
			this.filteredArticlesPerItem.splice(index, 1);
			// Clear warnings and cached available qty (re-indexed on next access)
			const updated: Record<string, number> = {};
			for (const [key, val] of Object.entries(this.availableQtyPerAlloc)) {
				const ki = Number(key.split('-')[0]);
				if (ki < index) updated[key] = val;
				else if (ki > index) {
					const ji = key.split('-')[1];
					updated[`${ki - 1}-${ji}`] = val;
				}
			}
			this.availableQtyPerAlloc = updated;
			const updatedWarnings: Record<number, string> = {};
			for (const [ki, msg] of Object.entries(this.stockWarnings)) {
				const n = Number(ki);
				if (n < index) updatedWarnings[n] = msg;
				else if (n > index) updatedWarnings[n - 1] = msg;
			}
			this.stockWarnings = updatedWarnings;
		}
	}

	ensureComboboxState(index: number): void {
		if (this.skuSearchTerms[index] === undefined) this.skuSearchTerms[index] = '';
		if (this.showSkuDropdown[index] === undefined) this.showSkuDropdown[index] = false;
		this.filteredArticlesPerItem[index] = [...this.articles];
	}

	// ─────────────────────────────────────────────────────────────
	//  SKU Combobox
	// ─────────────────────────────────────────────────────────────

	filterArticlesForItem(index: number): void {
		const term = (this.skuSearchTerms[index] || '').toLowerCase();
		this.filteredArticlesPerItem[index] = term
			? this.articles.filter(a =>
					(a.sku || '').toLowerCase().includes(term) || (a.name || '').toLowerCase().includes(term)
				)
			: [...this.articles];
	}

	isSkuValid(index: number): boolean {
		const sku = this.itemsArray.at(index).get('sku')?.value;
		return !!sku && this.articles.some(a => a.sku === sku);
	}

	hasValidSkuSelection(index: number): boolean {
		return this.isSkuValid(index);
	}

	enableSkuEdit(index: number): void {
		this.skuSearchTerms[index] = '';
		this.showSkuDropdown[index] = true;
		this.itemsArray.at(index).get('sku')?.setValue('');
	}

	clearSkuManually(index: number): void {
		this.skuSearchTerms[index] = '';
		this.itemsArray.at(index).get('sku')?.setValue('');
		this.showSkuDropdown[index] = false;
		this.getAllocationsArray(index).clear();
		delete this.stockWarnings[index];
	}

	getSelectedSkuName(index: number): string {
		const sku = this.itemsArray.at(index).get('sku')?.value;
		const article = this.articles.find(a => a.sku === sku);
		return article ? `${article.sku} - ${article.name}` : '';
	}

	onSkuBlur(index: number): void {
		setTimeout(() => (this.showSkuDropdown[index] = false), 150);
	}

	onSkuSelected(index: number, article: Article): void {
		this.itemsArray.at(index).get('sku')?.setValue(article.sku);
		this.skuSearchTerms[index] = `${article.sku} - ${article.name}`;
		this.showSkuDropdown[index] = false;
		// Clear existing allocations for this item
		this.getAllocationsArray(index).clear();
		delete this.stockWarnings[index];
		// Trigger prefill if required_qty is already set
		this.onSkuOrQtyChange(index);
	}

	closeSkuDropdownLater(index: number): void {
		setTimeout(() => (this.showSkuDropdown[index] = false), 150);
	}

	confirmFirstArticleIfAny(index: number): void {
		const list = this.filteredArticlesPerItem[index] || [];
		if (list.length > 0) this.onSkuSelected(index, list[0]);
	}

	// ─────────────────────────────────────────────────────────────
	//  Submit
	// ─────────────────────────────────────────────────────────────

	async onSubmit(): Promise<void> {
		if (!this.canSubmit()) {
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
				assigned_to: formValue.assigned_to,
				priority: formValue.priority,
				status: this.task ? this.task.status : 'open',
				items: this.getItemsArray().controls.map((itemCtrl) => {
					const itemGroup = itemCtrl as FormGroup;
					const allocsArray = itemGroup.get('allocations') as FormArray;
					const allocations: LocationAllocation[] = allocsArray.controls.map((allocCtrl) => {
						const ag = allocCtrl as FormGroup;
						const alloc: LocationAllocation = {
							location: ag.get('location')?.value || '',
							quantity: Number(ag.get('quantity')?.value) || 0,
						};
						const lotNum: string = ag.get('lot_number')?.value || '';
						if (lotNum) alloc.lot_number = lotNum;
						return alloc;
					});
					return {
						sku: itemGroup.get('sku')?.value as string,
						required_qty: Number(itemGroup.get('required_qty')?.value) || 0,
						allocations,
					};
				}),
			};

			if (formValue.notes?.trim()) {
				taskData.notes = formValue.notes;
			}

			if (this.task) {
				const response = await this.pickingTaskService.update(this.task.id, taskData);
				if (response.result.success) {
					this.alertService.success(this.t('picking_task_updated_successfully'), this.t('success'));
					this.success.emit();
				} else {
					this.alertService.error(
						humanizeApiError(response.result.message || '', this.t, 'failed_to_update_picking_task'),
						this.t('error')
					);
				}
			} else {
				const response = await this.pickingTaskService.create(taskData);
				if (response.result.success) {
					this.alertService.success(this.t('picking_task_created_successfully'), this.t('success'));
					this.success.emit();
				} else {
					this.alertService.error(
						humanizeApiError(response.result.message || '', this.t, 'failed_to_create_picking_task'),
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

	// ─────────────────────────────────────────────────────────────
	//  Helpers
	// ─────────────────────────────────────────────────────────────

	getUserDisplayName(userId: string): string {
		const user = this.users.find(u => u.id === userId);
		return user ? `${user.first_name} ${user.last_name}` || user.email : userId;
	}

	markFormGroupTouched(fg: any): void {
		Object.keys(fg.controls).forEach(field => {
			const control = fg.get(field);
			control?.markAsTouched({ onlySelf: true });
			if (control?.controls) {
				this.markFormGroupTouched(control);
			}
		});
	}

	isFieldInvalid(fieldName: string): boolean {
		const field = this.form.get(fieldName);
		return !!(field && field.invalid && field.touched);
	}

	getFieldError(fieldName: string): string {
		const field = this.form.get(fieldName);
		if (field?.errors && field.touched) {
			if (field.errors['required']) {
				const key = `${fieldName}_required`;
				const msg = this.t(key);
				return msg !== key ? msg : this.t('field_required');
			}
			if (field.errors['min']) return this.t('quantity_min');
		}
		return '';
	}

	isItemFieldInvalid(itemIndex: number, fieldName: string): boolean {
		const field = this.itemsArray.at(itemIndex).get(fieldName);
		return !!(field && field.invalid && field.touched);
	}

	getItemFieldError(itemIndex: number, fieldName: string): string {
		const field = this.itemsArray.at(itemIndex).get(fieldName);
		if (field?.errors && field.touched) {
			if (field.errors['required']) return this.t(`${fieldName}_required`);
			if (field.errors['min']) return this.t('quantity_min');
		}
		return '';
	}
}
