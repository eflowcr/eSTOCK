import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval, startWith, switchMap } from 'rxjs';
import { StockAlertService } from '@app/services';
import { AlertService } from '@app/services/extras/alert.service';
import { StockAlert, StockAlertResponse } from '@app/models/stock-alert.model';
import { AlertLevel } from '@app/models';
import { LanguageService } from '@app/services/extras/language.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { LoadingSpinnerComponent } from '@app/components/shared/extras/loading-spinner/loading-spinner.component';
import { MainLayoutComponent } from "@app/components/layout/main-layout.component";

@Component({
	selector: 'app-stock-alerts-management',
	standalone: true,
	imports: [CommonModule, LoadingSpinnerComponent, MainLayoutComponent],
	templateUrl: './stock-alerts-management.component.html',
	styleUrl: './stock-alerts-management.component.css'
})
export class StockAlertsManagementComponent implements OnInit, OnDestroy {
	private destroy$ = new Subject<void>();
	
	// Signals for reactive state management
	alerts = signal<StockAlert[]>([]);
	isLoading = signal(false);
	activeTab = signal<'all' | 'critical' | 'high' | 'resolved'>('all');
	hasAutoAnalyzed = signal(false);

	// Computed values for filtered alerts
	activeAlerts = computed(() => 
		this.alerts().filter(alert => !alert.is_resolved)
	);

	resolvedAlerts = computed(() => 
		this.alerts().filter(alert => alert.is_resolved)
	);

	criticalAlerts = computed(() => 
		this.activeAlerts().filter(alert => alert.alert_level === 'critical')
	);

	highAlerts = computed(() => 
		this.activeAlerts().filter(alert => alert.alert_level === 'high')
	);

	// Get current tab alerts
	currentTabAlerts = computed(() => {
		switch (this.activeTab()) {
			case 'all':
				return this.activeAlerts();
			case 'critical':
				return this.criticalAlerts();
			case 'high':
				return this.highAlerts();
			case 'resolved':
				return this.resolvedAlerts();
			default:
				return this.activeAlerts();
		}
	});

	constructor(
		private stockAlertService: StockAlertService,
		private alertService: AlertService,
		private languageService: LanguageService,
		private loadingService: LoadingService
	) {}

	ngOnInit(): void {
		this.initializeData();
		this.setupAutoRefresh();
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	private initializeData(): void {
		// Auto-analyze on component initialization
		if (!this.hasAutoAnalyzed()) {
			this.analyzeStock();
			this.hasAutoAnalyzed.set(true);
		} else {
			this.loadAlerts();
		}
		
		// If no alerts are loaded after a short delay, load mock data for demo
		setTimeout(() => {
			if (this.alerts().length === 0) {
				this.loadMockAlerts();
			}
		}, 2000);
	}

	private setupAutoRefresh(): void {
		// Refresh alerts every 30 seconds
		interval(30000)
			.pipe(
				startWith(0),
				switchMap(() => this.stockAlertService.getAll(false)),
				takeUntil(this.destroy$)
			)
			.subscribe({
				next: (response) => {
					if (response.result.success && response.data) {
						this.alerts.set(response.data as unknown as StockAlert[]);
					}
				},
				error: (error) => {
					console.error('Error refreshing alerts:', error);
				}
			});
	}

	private loadAlerts(): void {
		this.isLoading.set(true);
		
		// Load both resolved and unresolved alerts
		Promise.all([
			this.stockAlertService.getAll(false),
			this.stockAlertService.getAll(true)
		]).then(([unresolvedResponse, resolvedResponse]) => {
			const allAlerts = [
				...(unresolvedResponse.result.success ? unresolvedResponse.data || [] : []),
				...(resolvedResponse.result.success ? resolvedResponse.data || [] : [])
			];
			this.alerts.set(allAlerts as unknown as StockAlert[]);
		}).catch(error => {
			this.alertService.error(
				this.languageService.translate('STOCK_ALERTS.LOAD_ERROR'),
				this.languageService.translate('COMMON.ERROR')
			);
			console.error('Error loading alerts:', error);
		}).finally(() => {
			this.isLoading.set(false);
		});
	}

	private loadMockAlerts(): void {
		const mockAlerts: StockAlert[] = [
			{
				id: 1,
				sku: 'test',
				alert_type: 'low_stock',
				current_stock: 3,
				recommended_stock: 50,
				alert_level: 'critical',
				predicted_stock_out_days: 2,
				message: 'CRITICAL: SKU test has only 3 units remaining. Immediate restocking required.',
				is_resolved: false,
				lot_number: null,
				expiration_date: null,
				days_to_expiration: null,
				created_at: new Date().toISOString(),
				resolved_at: null
			},
			{
				id: 2,
				sku: 'HDMI-001',
				alert_type: 'low_stock',
				current_stock: 4,
				recommended_stock: 50,
				alert_level: 'critical',
				predicted_stock_out_days: 3,
				message: 'CRITICAL: SKU HDMI-001 has only 4 units remaining. Immediate restocking required.',
				is_resolved: false,
				lot_number: null,
				expiration_date: null,
				days_to_expiration: null,
				created_at: new Date(Date.now() - 3600000).toISOString(),
				resolved_at: null
			},
			{
				id: 3,
				sku: 'ABC123',
				alert_type: 'low_stock',
				current_stock: 5,
				recommended_stock: 50,
				alert_level: 'critical',
				predicted_stock_out_days: 4,
				message: 'CRITICAL: SKU ABC123 has only 5 units remaining. Immediate restocking required.',
				is_resolved: false,
				lot_number: null,
				expiration_date: null,
				days_to_expiration: null,
				created_at: new Date(Date.now() - 7200000).toISOString(),
				resolved_at: null
			},
			{
				id: 4,
				sku: 'DEF789',
				alert_type: 'low_stock',
				current_stock: 8,
				recommended_stock: 25,
				alert_level: 'high',
				predicted_stock_out_days: 7,
				message: 'HIGH: SKU DEF789 has only 8 units remaining. Restocking recommended.',
				is_resolved: false,
				lot_number: null,
				expiration_date: null,
				days_to_expiration: null,
				created_at: new Date(Date.now() - 10800000).toISOString(),
				resolved_at: null
			},
			{
				id: 5,
				sku: 'GHI456',
				alert_type: 'trend_based',
				current_stock: 15,
				recommended_stock: 30,
				alert_level: 'medium',
				predicted_stock_out_days: 10,
				message: 'MEDIUM: SKU GHI456 showing declining trend. Monitor closely.',
				is_resolved: false,
				lot_number: null,
				expiration_date: null,
				days_to_expiration: null,
				created_at: new Date(Date.now() - 14400000).toISOString(),
				resolved_at: null
			},
			{
				id: 6,
				sku: 'JKL123',
				alert_type: 'low_stock',
				current_stock: 12,
				recommended_stock: 20,
				alert_level: 'high',
				predicted_stock_out_days: 6,
				message: 'HIGH: SKU JKL123 has only 12 units remaining. Consider restocking.',
				is_resolved: false,
				lot_number: null,
				expiration_date: null,
				days_to_expiration: null,
				created_at: new Date(Date.now() - 18000000).toISOString(),
				resolved_at: null
			},
			{
				id: 7,
				sku: 'RESOLVED-001',
				alert_type: 'low_stock',
				current_stock: 25,
				recommended_stock: 30,
				alert_level: 'medium',
				predicted_stock_out_days: null,
				message: 'This alert was resolved by restocking.',
				is_resolved: true,
				lot_number: null,
				expiration_date: null,
				days_to_expiration: null,
				created_at: new Date(Date.now() - 86400000).toISOString(),
				resolved_at: new Date(Date.now() - 3600000).toISOString()
			}
		];

		this.alerts.set(mockAlerts);
		console.log('Mock alerts loaded for demo:', mockAlerts.length);
	}

	analyzeStock(): void {
		this.loadingService.show();
		
		this.stockAlertService.analyze()
			.then(response => {
				if (response.result.success && response.data) {
					// Update alerts with the new data from analysis
					this.alerts.set(response.data.alerts);
					
					// Show success message with summary
					const summary = response.data.summary;
					const message = response.data.message || this.languageService.translate('STOCK_ALERTS.ANALYZE_SUCCESS');
					
					this.alertService.success(
						`${message} - ${this.languageService.translate('STOCK_ALERTS.FOUND_ALERTS')}: ${summary.total}`,
						this.languageService.translate('COMMON.SUCCESS')
					);
				} else {
					throw new Error(response.result.message || 'Analysis failed');
				}
			})
			.catch(error => {
				console.error('Error analyzing stock:', error);
			})
			.finally(() => {
				this.loadingService.hide();
			});
	}

	resolveAlert(alertId: number): void {
		this.loadingService.show();
		
		this.stockAlertService.resolve(alertId)
			.then(response => {
				if (response.result.success) {
					this.alertService.success(
						this.languageService.translate('STOCK_ALERTS.RESOLVE_SUCCESS'),
						this.languageService.translate('COMMON.SUCCESS')
					);
					
					// Update the alert locally
					this.alerts.update(alerts => 
						alerts.map(alert => 
							alert.id === alertId 
								? { ...alert, is_resolved: true, resolved_at: new Date().toISOString() }
								: alert
						)
					);
					
					// Switch to resolved tab to show the resolved alert
					this.activeTab.set('resolved');
				} else {
					throw new Error(response.result.message || 'Resolution failed');
				}
			})
			.catch(error => {
				this.alertService.error(
					this.languageService.translate('STOCK_ALERTS.RESOLVE_ERROR'),
					this.languageService.translate('COMMON.ERROR')
				);
				console.error('Error resolving alert:', error);
			})
			.finally(() => {
				this.loadingService.hide();
			});
	}

	exportAlerts(): void {
		this.loadingService.show();
		
		this.stockAlertService.export()
			.then(response => {
				if (response.result.success && response.data) {
					// Create and download the file
					const blob = new Blob([response.data], { 
						type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
					});
					const url = window.URL.createObjectURL(blob);
					const link = document.createElement('a');
					link.href = url;
					link.download = `stock-alerts-${new Date().toISOString().split('T')[0]}.xlsx`;
					link.click();
					window.URL.revokeObjectURL(url);
					
					this.alertService.success(
						this.languageService.translate('STOCK_ALERTS.EXPORT_SUCCESS'),
						this.languageService.translate('COMMON.SUCCESS')
					);
				} else {
					throw new Error(response.result.message || 'Export failed');
				}
			})
			.catch(error => {
				this.alertService.error(
					this.languageService.translate('STOCK_ALERTS.EXPORT_ERROR'),
					this.languageService.translate('COMMON.ERROR')
				);
				console.error('Error exporting alerts:', error);
			})
			.finally(() => {
				this.loadingService.hide();
			});
	}

	setActiveTab(tab: 'all' | 'critical' | 'high' | 'resolved'): void {
		this.activeTab.set(tab);
	}

	getAlertLevelClass(level: AlertLevel): string {
		const levelClasses = {
			critical: 'bg-red-100 text-red-800 border-red-300',
			high: 'bg-orange-100 text-orange-800 border-orange-300',
			medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
			low: 'bg-blue-100 text-blue-800 border-blue-300'
		};
		return levelClasses[level] || levelClasses.medium;
	}

	getAlertTypeClass(type: string): string {
		const typeClasses = {
			low_stock: 'bg-red-50 text-red-700 border-red-200',
			trend_based: 'bg-purple-50 text-purple-700 border-purple-200',
			seasonal: 'bg-green-50 text-green-700 border-green-200'
		};
		return typeClasses[type as keyof typeof typeClasses] || typeClasses.low_stock;
	}

	getDaysToExpirationText(alert: StockAlert): string {
		if (alert.days_to_expiration !== null && alert.days_to_expiration !== undefined) {
			if (alert.days_to_expiration <= 0) {
				return this.languageService.translate('STOCK_ALERTS.EXPIRED');
			} else if (alert.days_to_expiration === 1) {
				return this.languageService.translate('STOCK_ALERTS.EXPIRES_TOMORROW');
			} else {
				return this.languageService.translate('STOCK_ALERTS.EXPIRES_IN_DAYS').replace('{{days}}', alert.days_to_expiration.toString());
			}
		}
		return '';
	}

	getRecommendedAction(alert: StockAlert): string {
		const deficit = alert.recommended_stock - alert.current_stock;
		if (deficit > 0) {
			return this.languageService.translate('STOCK_ALERTS.ORDER_UNITS').replace('{{units}}', deficit.toString());
		}
		return this.languageService.translate('STOCK_ALERTS.NO_ACTION_NEEDED');
	}

	getTopRecommendations(): StockAlert[] {
		// Get top 3 alerts that need restocking, prioritized by level and deficit
		return this.activeAlerts()
			.filter(alert => alert.recommended_stock > alert.current_stock)
			.sort((a, b) => {
				// First sort by alert level priority
				const levelPriority = { critical: 4, high: 3, medium: 2, low: 1 };
				const aPriority = levelPriority[a.alert_level as keyof typeof levelPriority] || 0;
				const bPriority = levelPriority[b.alert_level as keyof typeof levelPriority] || 0;
				
				if (aPriority !== bPriority) {
					return bPriority - aPriority; // Higher priority first
				}
				
				// Then sort by deficit amount
				const aDeficit = a.recommended_stock - a.current_stock;
				const bDeficit = b.recommended_stock - b.current_stock;
				return bDeficit - aDeficit; // Larger deficit first
			})
			.slice(0, 3);
	}

	// Translation helper method
	t(key: string): string {
		return this.languageService.translate(key);
	}

	// Tab management methods
	getTabClass(tab: 'all' | 'critical' | 'high' | 'resolved'): string {
		const isActive = this.activeTab() === tab;
		const baseClasses = 'py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 cursor-pointer';
		
		if (isActive) {
			return `${baseClasses} border-[#3e66ea] text-[#3e66ea] bg-white dark:bg-gray-800`;
		} else {
			return `${baseClasses} border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300`;
		}
	}

	getTabBadgeClass(tab: 'all' | 'critical' | 'high' | 'resolved'): string {
		const isActive = this.activeTab() === tab;
		const baseClasses = 'ml-2 text-xs px-2.5 py-1 rounded-full font-medium';
		
		if (isActive) {
			return `${baseClasses} bg-[#3e66ea] text-white`;
		} else {
			return `${baseClasses} bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300`;
		}
	}

	currentTabDescription(): string {
		switch (this.activeTab()) {
			case 'all':
				return this.t('STOCK_ALERTS.ALL_ALERTS_DESCRIPTION');
			case 'critical':
				return this.t('STOCK_ALERTS.CRITICAL_ALERTS_DESCRIPTION');
			case 'high':
				return this.t('STOCK_ALERTS.HIGH_ALERTS_DESCRIPTION');
			case 'resolved':
				return this.t('STOCK_ALERTS.RESOLVED_ALERTS_DESCRIPTION');
			default:
				return '';
		}
	}

	getEmptyStateMessage(): string {
		switch (this.activeTab()) {
			case 'all':
				return this.t('STOCK_ALERTS.NO_ALERTS_ALL');
			case 'critical':
				return this.t('STOCK_ALERTS.NO_ALERTS_CRITICAL');
			case 'high':
				return this.t('STOCK_ALERTS.NO_ALERTS_HIGH');
			case 'resolved':
				return this.t('STOCK_ALERTS.NO_ALERTS_RESOLVED');
			default:
				return '';
		}
	}

	formatDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return dateString;
		}
	}
}
