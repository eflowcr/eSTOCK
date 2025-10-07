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
import { InventoryService } from '@app/services/inventory.service';
import { Inventory } from '@app/models/inventory.model';
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
	inventoryData: Inventory[] = []; 
	articleLocationMap: Map<string, Location[]> = new Map(); 
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
	
	lotsWithQuantityPerItem: Array<{lot_number: string, quantity: number, expiration_date: string | null}[]> = [];
	lotQuantityPerItem: number[] = [];
	lotExpirationDatePerItem: string[] = [];
	availableLotObjectsPerItem: any[][] = [];
	filteredLotObjectsPerItem: any[][] = [];
	
	operatorSearchTerm: string = '';
	showOperatorDropdown: boolean = false;
	filteredOperators: User[] = [];

	constructor(
		private fb: FormBuilder,
		private pickingTaskService: PickingTaskService,
		private locationService: LocationService,
		private userService: UserService,
		private articleService: ArticleService,
		private inventoryService: InventoryService,
		private lotService: LotService,
		private serialService: SerialService,
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

	// Helper method to detect if a response contains an error message
	private isErrorResponse(response: any): boolean {
		if (!response.result.success) {
			return true;
		}
		
		// Check for error keywords in the message even if success is true
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

	// Gestión de operadores
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

	async loadData(): Promise<void> {
		try {
			this.isLoading = true;
			
			const [locationResponse, userResponse, inventoryResponse] = await Promise.all([
				this.locationService.getAll(),
				this.userService.getAll(),
				this.inventoryService.getAll()
			]);

			if (locationResponse.result.success) {
				this.locations = locationResponse.data;
			}

			if (userResponse.result.success) {
				this.users = (userResponse.data || []).filter((u: User) => u.role === 'operator');
				this.filteredOperators = [...this.users];
			}

			if (inventoryResponse.result.success) {
				this.inventoryData = inventoryResponse.data || [];
				
				const uniqueArticles = new Map<string, Article>();
				const locationMap = new Map<string, Location[]>();
				
				this.inventoryData.forEach(item => {
					if (item.quantity > 0) {
						if (!uniqueArticles.has(item.sku)) {
							uniqueArticles.set(item.sku, {
								sku: item.sku,
								name: item.name || item.sku,
								description: item.description || '',
								track_by_lot: item.track_by_lot || false,
								track_by_serial: item.track_by_serial || false,
								track_expiration: item.track_expiration || false,
								is_active: true
							} as Article);
						}
						
						const currentLocations = locationMap.get(item.sku) || [];
						const location = this.locations.find(loc => loc.location_code === item.location);
						if (location && !currentLocations.find(loc => loc.location_code === item.location)) {
							currentLocations.push(location);
							locationMap.set(item.sku, currentLocations);
						}
					}
				});
				
				this.articles = Array.from(uniqueArticles.values());
				this.articleLocationMap = locationMap;
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
		
		if (this.task.assigned_to) {
			const user = this.users.find(u => u.id === this.task!.assigned_to);
			if (user) {
				this.operatorSearchTerm = this.getUserDisplayName(user.id);
			} else {
				this.operatorSearchTerm = this.task.assigned_to;
			}
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
							expiration_date: lot.expiration_date || null
						});
					});
				} else {
					// Fallback: try old structure
					const oldLotNumbers = item.lotNumbers || item.lot_numbers || [];
					this.lotsWithQuantityPerItem[i] = [];
					
					if (oldLotNumbers && oldLotNumbers.length > 0) {
						oldLotNumbers.forEach((lotNumber: string) => {
							lotNumbers.push(lotNumber);
							this.lotsWithQuantityPerItem[i].push({
								lot_number: lotNumber,
								quantity: 1,
								expiration_date: null
							});
						});
					}
				}
				
				if (item.serials && Array.isArray(item.serials)) {
					item.serials.forEach((serial: any) => {
						serialNumbers.push(serial.serial_number);
					});
				} else {
					const oldSerialNumbers = item.serialNumbers || [];
					if (oldSerialNumbers && oldSerialNumbers.length > 0) {
						serialNumbers.push(...oldSerialNumbers);
					}
				}
				
				const requiredQty = item.expectedQty || item.required_qty || 0;
				
				this.itemsArray.push(this.fb.group({
					sku: [item.sku, [Validators.required]],
					location: [item.location, [Validators.required]],
					lot_numbers: [lotNumbers.join(', ') || ''],
					serial_numbers: [serialNumbers.join(', ') || '']
				}));
				
				this.requiredQuantities[i] = requiredQty;
				
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
		
		// Forzar detección de cambios
		this.cdr.detectChanges();
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
		this.requiredQuantities[index] = 1; // Inicializar con 1 en lugar de 0
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
			
			const taskData: any = {
				outbound_number: formValue.outbound_number,
				assigned_to: formValue.assigned_to,
				priority: formValue.priority,
				status: this.task ? this.task.status : 'open',
				items: formValue.items.map((item: any, index: number) => {
					const itemData: any = {
						sku: item.sku,
						required_qty: this.requiredQuantities[index] || 0,
						location: item.location
					};
					
					if (item.lot_numbers) {
						const lotNumbers = item.lot_numbers.split(',').map((s: string) => s.trim()).filter((s: string) => s);
						const lots: any[] = [];
						
						if (this.lotsWithQuantityPerItem[index] && this.lotsWithQuantityPerItem[index].length > 0) {
							this.lotsWithQuantityPerItem[index].forEach(lot => {
								lots.push({
									lot_number: lot.lot_number,
									sku: item.sku,
									quantity: lot.quantity,
									expiration_date: lot.expiration_date || null
								});
							});
						} else {
							lotNumbers.forEach((lotNumber: string) => {
								lots.push({
									lot_number: lotNumber,
									sku: item.sku,
									quantity: 1,
									expiration_date: null
								});
							});
						}
						
						if (lots.length > 0) {
							itemData.lots = lots;
						}
					}
					
					if (item.serial_numbers) {
						const serialNumbers = item.serial_numbers.split(',').map((s: string) => s.trim()).filter((s: string) => s);
						const serials: any[] = [];
						
						serialNumbers.forEach((serialNumber: string) => {
							serials.push({
								serial_number: serialNumber,
								sku: item.sku,
								status: 'available'
							});
						});
						
						if (serials.length > 0) {
							itemData.serials = serials;
						}
					}
					
					return itemData;
				})
			};


			if (formValue.notes && formValue.notes.trim() !== '') {
				taskData.notes = formValue.notes;
			}
			

			if (this.task) {
				const response = await this.pickingTaskService.update(this.task.id, taskData);
				
				if (this.isErrorResponse(response)) {
					this.alertService.error(
						response.result.message || this.t('failed_to_update_picking_task'),
						this.t('error')
					);
				} else {
					this.alertService.success(
						this.t('picking_task_updated_successfully'),
						this.t('success')
					);
					this.success.emit();
				}
			} else {
				const response = await this.pickingTaskService.create(taskData);
				
				if (this.isErrorResponse(response)) {
					this.alertService.error(
						response.result.message || this.t('failed_to_create_picking_task'),
						this.t('error')
					);
				} else {
					this.alertService.success(
						this.t('picking_task_created_successfully'),
						this.t('success')
					);
					this.success.emit();
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
		if (!this.lotsWithQuantityPerItem[index]) this.lotsWithQuantityPerItem[index] = [];
		if (this.lotQuantityPerItem[index] === undefined) this.lotQuantityPerItem[index] = 1;
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

	// Gestión de SKUs
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
		return article ? `${article.sku} - ${article.name}` : '';
	}

	onSkuBlur(index: number): void {
		setTimeout(() => (this.showSkuDropdown[index] = false), 150);
	}

	onSkuSelected(index: number, article: Article): void {
		this.clearItemTrackingData(index);
		
		this.itemsArray.at(index).get('sku')?.setValue(article.sku);
		this.skuSearchTerms[index] = `${article.sku} - ${article.name}`;
		this.showSkuDropdown[index] = false;
		
		const availableLocations = this.articleLocationMap.get(article.sku) || [];
		
		this.filteredLocationsPerItem[index] = availableLocations;
		
		if (availableLocations.length === 1) {
			const autoLocation = availableLocations[0];
			this.itemsArray.at(index).get('location')?.setValue(autoLocation.location_code);
			this.locationSearchTerms[index] = `${autoLocation.location_code} - ${autoLocation.description || ''}`;
		} else {
			this.itemsArray.at(index).get('location')?.setValue('');
			this.locationSearchTerms[index] = '';
		}
		
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

	// Gestión de ubicaciones
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

	onLocationBlur(index: number): void {
		setTimeout(() => (this.showLocationDropdown[index] = false), 150);
	}

	onLocationSelected(index: number, location: Location): void {
		this.itemsArray.at(index).get('location')?.setValue(location.location_code);
		this.locationSearchTerms[index] = `${location.location_code} - ${location.description}`;
		this.showLocationDropdown[index] = false;
		
		const sku = this.itemsArray.at(index).get('sku')?.value;
		if (sku) {
			this.loadTrackingOptionsForItem(index, sku);
		}
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
		// First try to get article from articles array
		let article = this.articles.find(a => a.sku === sku);
		
		// If not found in articles array, try to get from inventory data
		if (!article) {
			const inventoryItem = this.inventoryData.find(item => item.sku === sku);
			if (inventoryItem) {
				article = {
					sku: inventoryItem.sku,
					name: inventoryItem.name || inventoryItem.sku,
					description: inventoryItem.description || '',
					track_by_lot: inventoryItem.track_by_lot || false,
					track_by_serial: inventoryItem.track_by_serial || false,
					track_expiration: inventoryItem.track_expiration || false,
					is_active: true
				} as Article;
			}
		}
		
		return article;
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
		// First try to get article from articles array
		let article = this.getArticleBySku(sku);
		
		// If not found in articles array, try to get from inventory data
		if (!article) {
			const inventoryItem = this.inventoryData.find(item => item.sku === sku);
			if (inventoryItem) {
				article = {
					sku: inventoryItem.sku,
					name: inventoryItem.name || inventoryItem.sku,
					description: inventoryItem.description || '',
					track_by_lot: inventoryItem.track_by_lot || false,
					track_by_serial: inventoryItem.track_by_serial || false,
					track_expiration: inventoryItem.track_expiration || false,
					is_active: true
				} as Article;
			}
		}
		
		if (!article) return;
		
		if (article.track_by_lot) {
			try {
				const lotsResp = await this.lotService.getBySku(sku);
				if (lotsResp.result.success) {
					// Filter out lots with quantity 0
					const availableLots = (lotsResp.data || []).filter(lot => lot.quantity > 0);
					// Store complete lot objects
					this.availableLotObjectsPerItem[index] = availableLots;
					this.filteredLotObjectsPerItem[index] = [...this.availableLotObjectsPerItem[index]];
					// Keep backward compatibility for lot_number arrays
					this.availableLotsPerItem[index] = availableLots.map(l => l.lot_number);
					this.filteredLotsPerItem[index] = [...this.availableLotsPerItem[index]];
				}
			} catch (error) {
				console.error('Error loading lots for SKU:', sku, error);
			}
		}
		
		if (article.track_by_serial) {
			try {
				const serialsResp = await this.serialService.getBySku(sku);
				if (serialsResp.result.success) {
					this.availableSerialsPerItem[index] = (serialsResp.data || []).map(s => s.serial_number);
					this.filteredSerialsPerItem[index] = [...this.availableSerialsPerItem[index]];
				}
			} catch (error) {
				console.error('Error loading serials for SKU:', sku, error);
			}
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

	async loadExistingLotData(itemIndex: number, sku: string, lotNumbers: string[]): Promise<void> {
		try {
			// Initialize the array
			this.lotsWithQuantityPerItem[itemIndex] = [];
			
			// Get all lots for this SKU from the service
			const response = await this.lotService.getBySku(sku);
			if (response.result.success && response.data) {
				// Map existing lot numbers to lot objects with quantities
				for (const lotNumber of lotNumbers) {
					const lotData = response.data.find(lot => lot.lot_number === lotNumber);
					
					if (lotData) {
						this.lotsWithQuantityPerItem[itemIndex].push({
							lot_number: lotNumber,
							quantity: lotData.quantity || 1,
							expiration_date: lotData.expiration_date || null
						});
					} else {
						// Fallback if specific lot not found in response
						this.lotsWithQuantityPerItem[itemIndex].push({
							lot_number: lotNumber,
							quantity: 1,
							expiration_date: null
						});
					}
				}
			} else {
				// Fallback if service call failed
				this.lotsWithQuantityPerItem[itemIndex] = lotNumbers.map(lotNumber => ({
					lot_number: lotNumber,
					quantity: 1,
					expiration_date: null
				}));
			}
		} catch (error) {
			console.error('Error loading existing lot data:', error);
			// Fallback: create basic lot objects
			this.lotsWithQuantityPerItem[itemIndex] = lotNumbers.map(lotNumber => ({
				lot_number: lotNumber,
				quantity: 1,
				expiration_date: null
			}));
		}
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

	// Lot quantity management methods
	addLotWithQuantity(index: number): void {
		const lotNumber = this.lotSearchTerms[index]?.trim();
		const quantity = this.lotQuantityPerItem[index] || 1;
		
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
		const requiredQty = this.getRequiredQuantity(index);
		
		if (currentTotal + quantity > requiredQty) {
			const remaining = requiredQty - currentTotal;
			this.alertService.warning(
				this.t('lot_quantity_exceeds_total') || `Solo quedan ${remaining} unidades disponibles`,
				this.t('warning')
			);
			return;
		}

		// Add lot with quantity
		this.lotsWithQuantityPerItem[index].push({
			lot_number: lotNumber,
			quantity: quantity,
			expiration_date: this.lotExpirationDatePerItem[index] || null
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
			// Set expiration date if available
			this.lotExpirationDatePerItem[index] = selectedLot.expiration_date || '';
		} else {
			// Fallback: auto-complete remaining quantity if lot not found in objects
			const currentTotal = this.getTotalLotQuantityForItem(index);
			const requiredQty = this.getRequiredQuantity(index);
			const remaining = requiredQty - currentTotal;
			
			if (remaining > 0) {
				this.lotQuantityPerItem[index] = remaining;
			}
		}
	}

	getTotalLotQuantityForItem(index: number): number {
		return this.lotsWithQuantityPerItem[index]?.reduce((sum, lot) => sum + lot.quantity, 0) || 0;
	}

	getRemainingQuantityForItem(index: number): number {
		const requiredQty = this.getRequiredQuantity(index);
		const currentTotal = this.getTotalLotQuantityForItem(index);
		return Math.max(0, requiredQty - currentTotal);
	}

	isLotQuantityCompleteForItem(index: number): boolean {
		const requiredQty = this.getRequiredQuantity(index);
		const currentTotal = this.getTotalLotQuantityForItem(index);
		return requiredQty > 0 && currentTotal === requiredQty;
	}

	shouldShowExpirationDate(index: number): boolean {
		const sku = this.itemsArray.at(index).get('sku')?.value;
		const article = this.getArticleBySku(sku);
		return !!article?.track_expiration;
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

		// Auto-assign remaining quantity or full quantity if it covers all
		const quantityToAssign = remainingQty;
		
		this.lotsWithQuantityPerItem[index].push({
			lot_number: lotNumber,
			quantity: quantityToAssign,
			expiration_date: null
		});

		// Update form control
		const lotNumbers = this.lotsWithQuantityPerItem[index].map(lot => lot.lot_number);
		this.itemsArray.at(index).get('lot_numbers')?.setValue(lotNumbers.join(', '));

		this.showLotDropdown[index] = false;
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
			
			// Allow partial selection for lots and serials
			if (article?.track_by_lot) {
				// For lot tracking, check if using quantity-based lots or simple lots
				if (this.lotsWithQuantityPerItem[i] && this.lotsWithQuantityPerItem[i].length > 0) {
					// Quantity-based lots: allow partial quantities (not exceeding required)
					const totalLotQuantity = this.getTotalLotQuantityForItem(i);
					if (totalLotQuantity > requiredQty) {
						return false;
					}
				} else {
					// Simple lots: allow partial selection (not exceeding required)
					const selectedLots = this.getSelectedLots(i);
					if (selectedLots.length > requiredQty) {
						return false;
					}
				}
			}
			
			if (article?.track_by_serial) {
				const selectedSerials = this.getSelectedSerials(i);
				// Allow partial selection (not exceeding required)
				if (selectedSerials.length > requiredQty) {
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
