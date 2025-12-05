import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ReceivingTask } from '@app/models/receiving-task.model';
import { Location } from '@app/models/location.model';
import { User } from '@app/models/user.model';
import { Article } from '@app/models/article.model';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { LotService } from '@app/services/lot.service';
import { SerialService } from '@app/services/serial.service';
import { LocationService } from '@app/services/location.service';
import { UserService } from '@app/services/user.service';
import { ArticleService } from '@app/services/article.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
	selector: 'app-receiving-task-form',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, FormsModule],
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

	availableLotsPerItem: string[][] = [];
	availableSerialsPerItem: string[][] = [];
	filteredLotsPerItem: string[][] = [];
	// Store complete lot objects with quantities
	availableLotObjectsPerItem: any[][] = [];
	filteredLotObjectsPerItem: any[][] = [];
	filteredSerialsPerItem: string[][] = [];
	lotSearchTerms: string[] = [];
	serialSearchTerms: string[] = [];
	showLotDropdown: boolean[] = [];
	showSerialDropdown: boolean[] = [];
	expectedQuantities: number[] = [];
	
	// Lots with quantities per item
	lotsWithQuantityPerItem: Array<{lot_number: string, quantity: number, expiration_date: string | null}[]> = [];
	lotQuantityPerItem: number[] = [];
	lotExpirationDatePerItem: string[] = [];
	
	// Operator combobox properties
	operatorSearchTerm: string = '';
	showOperatorDropdown: boolean = false;
	filteredOperators: User[] = [];

	constructor(
		private fb: FormBuilder,
		private receivingTaskService: ReceivingTaskService,
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

	// Modal helpers
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

	// Operator combobox methods
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
				this.users = (userResponse.data || []).filter((u: User) => u.role === 'operator');
				this.filteredOperators = [...this.users];
			}

			if (articleResponse.result.success) {
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

		// Map operator display name
		if (this.task.assigned_to) {
			const user = this.users.find(u => u.id === this.task!.assigned_to);
			if (user) {
				this.operatorSearchTerm = this.getUserDisplayName(user.id);
			}
		}

		// Patch form with backend field mapping
		this.form.patchValue({
			inbound_number: this.task.order_number || this.task.inbound_number,
			assigned_to: this.task.assigned_to,
			priority: this.task.priority,
			notes: this.task.notes || ''
		});

		// Clear existing items
		while (this.itemsArray.length !== 0) {
			this.itemsArray.removeAt(0);
		}

		if (this.task.items && this.task.items.length > 0) {
			this.task.items.forEach((item, i) => {
				// Extract lots and serials from the new embedded structure
				const lotNumbers: string[] = [];
				const serialNumbers: string[] = [];
				
				// Process lots from embedded structure
				if (item.lots && Array.isArray(item.lots)) {
					// Initialize lots with quantity array for this item
					this.lotsWithQuantityPerItem[i] = [];
					
					item.lots.forEach((lot: any) => {
						lotNumbers.push(lot.lot_number);
						this.lotsWithQuantityPerItem[i].push({
							lot_number: lot.lot_number,
							quantity: lot.quantity || 1,
							expiration_date: this.formatDateForInput(lot.expiration_date) || null
						});
					});
				} else {
					this.lotsWithQuantityPerItem[i] = [];
				}
				
				// Process serials from embedded structure
				if (item.serials && Array.isArray(item.serials)) {
					item.serials.forEach((serial: any) => {
						serialNumbers.push(serial.serial_number);
					});
				}
				
				const expectedQty = item.expectedQty || item.expected_qty || 0;

				this.itemsArray.push(this.fb.group({
					sku: [item.sku, [Validators.required]],
					location: [item.location, [Validators.required]],
					lot_numbers: [lotNumbers.join(', ') || ''],
					serial_numbers: [serialNumbers.join(', ') || '']
				}));
				
				this.expectedQuantities[i] = expectedQty;
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

		const itemGroup = this.fb.group({
			sku: ['', [Validators.required]],
			location: ['', [Validators.required]],
			lot_numbers: [''],
			serial_numbers: ['']
		});

		this.itemsArray.push(itemGroup);

		const index = this.itemsArray.length - 1;
		this.lotQuantityPerItem.push(1);
		this.lotExpirationDatePerItem.push('');
		this.expectedQuantities.push(1);
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
			this.availableLotsPerItem.splice(index, 1);
			this.availableSerialsPerItem.splice(index, 1);
			this.filteredLotsPerItem.splice(index, 1);
			this.filteredSerialsPerItem.splice(index, 1);
			this.lotSearchTerms.splice(index, 1);
			this.serialSearchTerms.splice(index, 1);
			this.showLotDropdown.splice(index, 1);
			this.showSerialDropdown.splice(index, 1);
			// Remove lots with quantities
			this.lotsWithQuantityPerItem.splice(index, 1);
			this.lotQuantityPerItem.splice(index, 1);
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
			
			const taskData: any = {
				inbound_number: formValue.inbound_number,
				assigned_to: formValue.assigned_to,
				priority: formValue.priority,
				status: this.task ? this.task.status : 'open',
				items: formValue.items.map((item: any, index: number) => {
					const itemData: any = {
						sku: item.sku,
						expected_qty: this.expectedQuantities[index] || 0,
						location: item.location
					};
					
					const lots: any[] = [];
					const serials: any[] = [];
					
					// Build lots array with detailed structure for this item
					if (item.lot_numbers) {
						const lotNumbers = item.lot_numbers.split(',').map((s: string) => s.trim()).filter((s: string) => s);
						
						// Check if we have quantity-based lots
						if (this.lotsWithQuantityPerItem[index] && this.lotsWithQuantityPerItem[index].length > 0) {
							// Use quantity-based lots structure
							this.lotsWithQuantityPerItem[index].forEach(lot => {
								lots.push({
									lot_number: lot.lot_number,
									sku: item.sku,
									quantity: lot.quantity,
									expiration_date: lot.expiration_date || null
								});
							});
						} else if (lotNumbers.length > 0) {
							// Use simple lots structure (1 quantity each)
							lotNumbers.forEach((lotNumber: string) => {
								lots.push({
									lot_number: lotNumber,
									sku: item.sku,
									quantity: 1,
									expiration_date: null
								});
							});
						}
					}
					
					// Build serials array with detailed structure for this item
					if (item.serial_numbers) {
						const serialNumbers = item.serial_numbers.split(',').map((s: string) => s.trim()).filter((s: string) => s);
						
						serialNumbers.forEach((serialNumber: string) => {
							serials.push({
								serial_number: serialNumber,
								sku: item.sku,
								status: 'available'
							});
						});
					}
					
					// Only include lots/serials if they have data
					if (lots.length > 0) {
						itemData.lots = lots;
					}
					if (serials.length > 0) {
						itemData.serials = serials;
					}
					
					return itemData;
				})
			};

			if (formValue.notes && formValue.notes.trim() !== '') {
				taskData.notes = formValue.notes;
			}

			if (this.task) {
				// Update existing task
				const response = await this.receivingTaskService.update(this.task.id, taskData);
				if (response.result.success) {
					this.alertService.success(
						response.result.message || this.t('receiving_task_updated_successfully'),
						this.t('success')
					);
					this.success.emit();
				} else {
					this.alertService.error(
						response.result.message || this.t('failed_to_update_receiving_task'),
						this.t('error')
					);
				}
			} else {
				const response = await this.receivingTaskService.create(taskData);
				if (response.result.success) {
					this.alertService.success(
						response.result.message || this.t('receiving_task_created_successfully'),
						this.t('success')
					);
					this.success.emit();
				} else {
					this.alertService.error(
						response.result.message || this.t('failed_to_create_receiving_task'),
						this.t('error')
					);
				}
			}
		} catch (error: any) {
			const errorMessage = error?.result?.message || error?.message || this.t('error_saving_task');
			this.alertService.error(
				errorMessage,
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
		
		// Initialize lots with quantity arrays
		if (!this.lotsWithQuantityPerItem[index]) this.lotsWithQuantityPerItem[index] = [];
		if (this.lotQuantityPerItem[index] === undefined) this.lotQuantityPerItem[index] = 1;
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
		
		// Clear lots with quantities
		this.lotsWithQuantityPerItem[index] = [];
		this.lotQuantityPerItem[index] = 1;
	}

	onLocationSelected(index: number, location: Location): void {
		this.itemsArray.at(index).get('location')?.setValue(location.location_code);
		this.locationSearchTerms[index] = `${location.location_code} - ${location.description}`;
		this.showLocationDropdown[index] = false;
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
		return location ? `${location.location_code} - ${location.description}` : '';
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

	shouldShowExpirationDate(index: number): boolean {
		const sku = this.itemsArray.at(index).get('sku')?.value;
		const article = this.getArticleBySku(sku);
		return !!article?.track_expiration;
	}


	isSerialSelectionComplete(index: number): boolean {
		const expectedQty = this.getExpectedQuantity(index);
		const selectedCount = this.getSelectedSerialCount(index);
		return expectedQty > 0 && selectedCount === expectedQty;
	}

	private async loadTrackingOptionsForItem(index: number, sku: string): Promise<void> {
		const article = this.getArticleBySku(sku);
		if (!article) return;
		if (article.track_by_lot) {
			try {
				const lotsResp = await this.lotService.getBySku(sku);
				if (lotsResp.result.success) {
					// Store complete lot objects
					this.availableLotObjectsPerItem[index] = lotsResp.data || [];
					this.filteredLotObjectsPerItem[index] = [...this.availableLotObjectsPerItem[index]];
					// Keep backward compatibility for lot_number arrays
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
		// Filter lot objects
		const lotObjects = this.availableLotObjectsPerItem[index] || [];
		this.filteredLotObjectsPerItem[index] = term ? 
			lotObjects.filter(lot => (lot.lot_number || '').toLowerCase().includes(term)) : 
			[...lotObjects];
		// Keep backward compatibility
		const options = this.availableLotsPerItem[index] || [];
		this.filteredLotsPerItem[index] = term ? options.filter(v => (v || '').toLowerCase().includes(term)) : [...options];
	}

	filterSerialsForItem(index: number): void {
		const term = (this.serialSearchTerms[index] || '').toLowerCase();
		const options = this.availableSerialsPerItem[index] || [];
		this.filteredSerialsPerItem[index] = term ? options.filter(v => (v || '').toLowerCase().includes(term)) : [...options];
	}

	onExpectedQuantityChange(index: number): void {
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

	getExpectedQuantity(index: number, dato?: number): number {
		if (dato !== undefined && dato !== null) {
			return dato;
		}
		
		const qty = this.expectedQuantities[index] || 0;
		return Number(qty) || 0;
	}

	getSelectedLots(index: number): string[] {
		const ctrl = this.itemsArray.at(index).get('lot_numbers');
		const current = (ctrl?.value as string) || '';
		return current ? current.split(',').map(s => s.trim()).filter(Boolean) : [];
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
		// Use the new quantity-based method
		this.onLotSelectedWithQuantity(index, lotNumber);
	}

	onSerialSelected(index: number, serialNumber: string): void {
		const ctrl = this.itemsArray.at(index).get('serial_numbers');
		const current = this.getSelectedSerials(index);
		const expectedQty = this.getExpectedQuantity(index);

		if (current.includes(serialNumber)) {
			const updated = current.filter(serial => serial !== serialNumber);
			ctrl?.setValue(updated.join(', '));
		} else if (current.length < expectedQty) {
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


	removeSerial(index: number, serialNumber: string): void {
		const ctrl = this.itemsArray.at(index).get('serial_numbers');
		const current = this.getSelectedSerials(index);
		const updated = current.filter(serial => serial !== serialNumber);
		ctrl?.setValue(updated.join(', '));
	}

	closeLotDropdownLater(index: number): void {
		setTimeout(() => (this.showLotDropdown[index] = false), 150);
	}

	closeSerialDropdownLater(index: number): void {
		setTimeout(() => (this.showSerialDropdown[index] = false), 150);
	}

	// Keyboard handlers for better UX
	handleLotEnter(index: number): void {
		const searchTerm = (this.lotSearchTerms[index] || '').trim();
		if (searchTerm) {
			const filtered = this.filteredLotObjectsPerItem[index] || [];
			const exactMatch = filtered.find(lot => lot.lot_number.toLowerCase() === searchTerm.toLowerCase());
			
			if (exactMatch) {
				this.selectLotFromDropdown(index, exactMatch.lot_number);
			} else {
				// Add as new lot with current quantity
				this.addLotWithQuantity(index);
			}
		}
	}

	handleSerialEnter(index: number): void {
		const searchTerm = (this.serialSearchTerms[index] || '').trim();
		if (searchTerm) {
			const filtered = this.filteredSerialsPerItem[index] || [];
			const exactMatch = filtered.find(serial => serial.toLowerCase() === searchTerm.toLowerCase());
			
			if (exactMatch) {
				this.onSerialSelected(index, exactMatch);
			} else {
				// Add as new serial
				this.addManualSerial(index, searchTerm);
			}
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
			this.alertService.warning(
				this.t('serial_selection_limit_reached'),
				this.t('warning')
			);
		}
	}

	// New methods for lots with quantities
	addLotWithQuantity(index: number): void {
		const lotNumber = this.lotSearchTerms[index]?.trim();
		const quantity = this.lotQuantityPerItem[index] || 1;
		const expirationDate = this.lotExpirationDatePerItem[index] || null;
		
		if (!lotNumber) {
			this.alertService.warning(
				this.t('lot_number_required') || 'Número de lote requerido',
				this.t('warning')
			);
			return;
		}
		
		if (quantity <= 0) {
			this.alertService.warning(
				this.t('quantity_must_be_positive') || 'La cantidad debe ser mayor a 0',
				this.t('warning')
			);
			return;
		}

		// Check if expiration date is required for this article
		const sku = this.itemsArray.at(index).get('sku')?.value;
		const article = this.getArticleBySku(sku);
		
		if (article?.track_expiration && (!expirationDate || expirationDate.trim() === '')) {
			this.alertService.error(
				this.t('expiration_date_required_for_tracking') || 'La fecha de expiracion es obligatoria para este articulo',
				this.t('error')
			);
			return;
		}

		// Check if lot already exists
		if (this.lotsWithQuantityPerItem[index].some(lot => lot.lot_number === lotNumber)) {
			this.alertService.warning(
				this.t('lot_already_exists'),
				this.t('warning')
			);
			return;
		}

		// Check if adding this quantity would exceed total
		const currentTotal = this.getTotalLotQuantityForItem(index);
		const expectedQty = this.getExpectedQuantity(index);
		
		if (currentTotal + quantity > expectedQty) {
			const remaining = expectedQty - currentTotal;
			this.alertService.warning(
				this.t('lot_quantity_exceeds_total') || `Solo quedan ${remaining} unidades disponibles`,
				this.t('warning')
			);
			return;
		}

		// Add lot with quantity and expiration date
		this.lotsWithQuantityPerItem[index].push({
			lot_number: lotNumber,
			quantity: quantity,
			expiration_date: expirationDate
		});

		// Update form control for backend compatibility
		const lotNumbers = this.lotsWithQuantityPerItem[index].map(lot => lot.lot_number);
		this.itemsArray.at(index).get('lot_numbers')?.setValue(lotNumbers.join(', '));

		// Clear inputs
		this.lotSearchTerms[index] = '';
		this.lotQuantityPerItem[index] = 1;
		this.lotExpirationDatePerItem[index] = '';
	}

	removeLotWithQuantity(index: number, lotIndex: number): void {
		this.lotsWithQuantityPerItem[index].splice(lotIndex, 1);
		
		// Update form control for backend compatibility
		const lotNumbers = this.lotsWithQuantityPerItem[index].map(lot => lot.lot_number);
		this.itemsArray.at(index).get('lot_numbers')?.setValue(lotNumbers.join(', '));
	}

	selectLotFromDropdown(index: number, lotNumber: string): void {
		this.lotSearchTerms[index] = lotNumber;
		this.showLotDropdown[index] = false;
		
		// Find the lot object to get its quantity
		const lotObjects = this.availableLotObjectsPerItem[index] || [];
		const selectedLot = lotObjects.find(lot => lot.lot_number === lotNumber);
		
		if (selectedLot) {
			// Use the quantity from the lot object automatically
			this.lotQuantityPerItem[index] = selectedLot.quantity;
			// Auto-fill expiration date if available
			if (selectedLot.expiration_date) {
				this.lotExpirationDatePerItem[index] = this.formatDateForInput(selectedLot.expiration_date);
			}
		} else {
			// Fallback: auto-complete remaining quantity if lot not found in objects
			const currentTotal = this.getTotalLotQuantityForItem(index);
			const expectedQty = this.getExpectedQuantity(index);
			const remaining = expectedQty - currentTotal;
			
			if (remaining > 0) {
				this.lotQuantityPerItem[index] = remaining;
			}
		}
		
		// Check if expiration date is required and show warning if not provided
		const sku = this.itemsArray.at(index).get('sku')?.value;
		const article = this.getArticleBySku(sku);
		
		if (article?.track_expiration && (!this.lotExpirationDatePerItem[index] || this.lotExpirationDatePerItem[index].trim() === '')) {
			this.alertService.warning(
				this.t('expiration_date_required_for_tracking') || 'La fecha de expiracion es obligatoria para este articulo',
				this.t('warning')
			);
		}
	}

	getTotalLotQuantityForItem(index: number): number {
		return this.lotsWithQuantityPerItem[index]?.reduce((sum, lot) => sum + lot.quantity, 0) || 0;
	}

	getRemainingQuantityForItem(index: number): number {
		const expectedQty = this.getExpectedQuantity(index);
		const currentTotal = this.getTotalLotQuantityForItem(index);
		return Math.max(0, expectedQty - currentTotal);
	}

	isLotQuantityCompleteForItem(index: number): boolean {
		const expectedQty = this.getExpectedQuantity(index);
		const currentTotal = this.getTotalLotQuantityForItem(index);
		return expectedQty === currentTotal;
	}

	// Expiration date validation methods
	isLotExpired(expirationDate: string | null): boolean {
		if (!expirationDate) return false;
		const today = new Date();
		const expDate = new Date(expirationDate);
		return expDate < today;
	}

	isLotExpiringSoon(expirationDate: string | null): boolean {
		if (!expirationDate) return false;
		const today = new Date();
		const expDate = new Date(expirationDate);
		const daysUntilExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		return daysUntilExpiry <= 30 && daysUntilExpiry > 0; // Expires within 30 days
	}

	formatDateForInput(dateString: string | null): string {
		if (!dateString) return '';
		
		try {
			const date = new Date(dateString);
			if (isNaN(date.getTime())) return '';
			
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			
			return `${year}-${month}-${day}`;
		} catch (error) {
			console.error('Error formatting date:', error);
			return '';
		}
	}

	// Auto-complete when selecting existing lot
	onLotSelectedWithQuantity(index: number, lotNumber: string): void {
		const remainingQty = this.getRemainingQuantityForItem(index);
		
		if (remainingQty <= 0) {
			this.alertService.warning(
				this.t('lot_selection_limit_reached'),
				this.t('warning')
			);
			return;
		}

		// Check if lot already exists
		if (this.lotsWithQuantityPerItem[index].some(lot => lot.lot_number === lotNumber)) {
			this.alertService.warning(
				this.t('lot_already_exists'),
				this.t('warning')
			);
			return;
		}

		// Check if expiration date is required for this article
		const sku = this.itemsArray.at(index).get('sku')?.value;
		const article = this.getArticleBySku(sku);
		const expirationDate = this.lotExpirationDatePerItem[index] || null;
		
		if (article?.track_expiration && (!expirationDate || expirationDate.trim() === '')) {
			this.alertService.error(
				this.t('expiration_date_required_for_tracking') || 'La fecha de expiración es obligatoria para este artículo',
				this.t('error')
			);
			return;
		}

		// Auto-assign remaining quantity or full quantity if it covers all
		const quantityToAssign = remainingQty;
		
		this.lotsWithQuantityPerItem[index].push({
			lot_number: lotNumber,
			quantity: quantityToAssign,
			expiration_date: expirationDate
		});

		// Update form control
		const lotNumbers = this.lotsWithQuantityPerItem[index].map(lot => lot.lot_number);
		this.itemsArray.at(index).get('lot_numbers')?.setValue(lotNumbers.join(', '));

		this.showLotDropdown[index] = false;
		
		// Show success message
		if (quantityToAssign === this.getExpectedQuantity(index)) {
			this.alertService.success(
				this.t('lot_covers_full_quantity') || `Lote ${lotNumber} cubre toda la cantidad (${quantityToAssign})`,
				this.t('success')
			);
		} else {
			this.alertService.success(
				this.t('lot_added_with_quantity') || `Lote ${lotNumber} agregado con ${quantityToAssign} unidades`,
				this.t('success')
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
			const expectedQty = this.expectedQuantities[i] || 0;
			const location = item.get('location')?.value;

			// Basic required fields validation
			if (!sku || !expectedQty || expectedQty <= 0 || !location) {
				return false;
			}

			const article = this.getArticleBySku(sku);
			
			// For lot tracking: allow partial completion (at least some lots but not exceeding expected quantity)
			if (article?.track_by_lot) {
				const totalLotQuantity = this.getTotalLotQuantityForItem(i);
				if (totalLotQuantity > expectedQty) {
					return false; // Cannot exceed expected quantity
				}
				// Allow partial: totalLotQuantity can be less than expectedQty
			}
			
			// For serial tracking: allow partial completion (at least some serials but not exceeding expected quantity)
			if (article?.track_by_serial) {
				const selectedSerials = this.getSelectedSerials(i);
				if (selectedSerials.length > expectedQty) {
					return false; // Cannot exceed expected quantity
				}
				// Allow partial: selectedSerials.length can be less than expectedQty
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
		if (fieldName === 'expected_qty') {
			const qty = this.expectedQuantities[itemIndex] || 0;
			return qty <= 0;
		}
		
		const itemGroup = this.itemsArray.at(itemIndex);
		const field = itemGroup.get(fieldName);
		return !!(field && field.invalid && field.touched);
	}

	getItemFieldError(itemIndex: number, fieldName: string): string {
		if (fieldName === 'expected_qty') {
			const qty = this.expectedQuantities[itemIndex] || 0;
			if (qty <= 0) {
				return this.t('expected_qty_required');
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
 