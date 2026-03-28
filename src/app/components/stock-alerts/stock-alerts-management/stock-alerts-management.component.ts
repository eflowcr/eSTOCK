import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval, startWith, switchMap } from 'rxjs';
import { StockAlertService } from '@app/services';
import { AlertService } from '@app/services/extras/alert.service';
import { StockAlert, StockAlertResponse } from '@app/models/stock-alert.model';
import { AlertLevel } from '@app/models';
import { LanguageService } from '@app/services/extras/language.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { handleApiError } from '@app/utils';
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
		if (!this.hasAutoAnalyzed()) {
			this.analyzeStock();
			this.hasAutoAnalyzed.set(true);
		} else {
			this.loadAlerts();
		}
	}

	private setupAutoRefresh(): void {
		// Refresh alerts every 30 seconds using analyze endpoint
		interval(30000)
			.pipe(
				startWith(0),
				switchMap(() => this.stockAlertService.analyze()),
				takeUntil(this.destroy$)
			)
			.subscribe({
				next: (response) => {
					if (response.result.success && response.data) {
						this.alerts.set(response.data.alerts);
					}
				},
				error: (error) => {
					// Silently handle errors for auto-refresh
				}
			});
	}

	private loadAlerts(): void {
		this.isLoading.set(true);
		
		// Use analyze endpoint to get all alerts
		this.stockAlertService.analyze()
			.then(response => {
				if (response.result.success && response.data) {
					this.alerts.set(response.data.alerts);
				} else {
					this.alertService.error(
						this.languageService.translate('STOCK_ALERTS.LOAD_ERROR'),
						this.languageService.translate('COMMON.ERROR')
					);
				}
			})
			.catch((error: any) => {
				this.alertService.error(
					handleApiError(error, this.languageService.translate('STOCK_ALERTS.LOAD_ERROR')),
					this.languageService.translate('COMMON.ERROR')
				);
			})
			.finally(() => {
				this.isLoading.set(false);
			});
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
					const totalAlerts = summary.total;
					
					let successMessage = this.languageService.translate('STOCK_ALERTS.ANALYZE_SUCCESS');
					if (totalAlerts > 0) {
						successMessage += ` - ${this.languageService.translate('STOCK_ALERTS.FOUND_ALERTS')}: ${totalAlerts}`;
					} else {
						successMessage += ` - ${this.languageService.translate('STOCK_ALERTS.NO_ALERTS_FOUND')}`;
					}
					
					this.alertService.success(
						successMessage,
						this.languageService.translate('COMMON.SUCCESS')
					);
				} else {
					throw new Error(response.result.message || 'Analysis failed');
				}
			})
			.catch((error: any) => {
				this.alertService.error(
					handleApiError(error, 'Analysis failed'),
					this.languageService.translate('COMMON.ERROR')
				);
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
			.catch((error: any) => {
				this.alertService.error(
					handleApiError(error, this.languageService.translate('STOCK_ALERTS.RESOLVE_ERROR')),
					this.languageService.translate('COMMON.ERROR')
				);
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
			.catch((error: any) => {
				this.alertService.error(
					handleApiError(error, this.languageService.translate('STOCK_ALERTS.EXPORT_ERROR')),
					this.languageService.translate('COMMON.ERROR')
				);
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
