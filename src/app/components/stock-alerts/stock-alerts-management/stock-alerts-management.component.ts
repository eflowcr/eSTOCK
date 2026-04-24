import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval, switchMap } from 'rxjs';
import { StockAlertService } from '@app/services';
import { AlertService } from '@app/services/extras/alert.service';
import { StockAlert, StockAlertResponse } from '@app/models/stock-alert.model';
import { AlertLevel } from '@app/models';
import { LanguageService } from '@app/services/extras/language.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { handleApiError } from '@app/utils';
import { MainLayoutComponent } from "@app/components/layout/main-layout.component";
import { ExpirationsTabComponent } from '../expirations-tab/expirations-tab.component';

type AlertTab = 'all' | 'critical' | 'high' | 'medium' | 'resolved' | 'expirations';

@Component({
	selector: 'app-stock-alerts-management',
	standalone: true,
	imports: [CommonModule, MainLayoutComponent, ExpirationsTabComponent],
	templateUrl: './stock-alerts-management.component.html',
	styleUrl: './stock-alerts-management.component.css'
})
export class StockAlertsManagementComponent implements OnInit, OnDestroy {
	private destroy$ = new Subject<void>();

	alerts = signal<StockAlert[]>([]);
	isLoading = signal(false);
	activeTab = signal<AlertTab>('all');
	hasAutoAnalyzed = signal(false);
	searchQuery = signal('');

	activeAlerts = computed(() => this.alerts().filter(alert => !alert.is_resolved));
	resolvedAlerts = computed(() => this.alerts().filter(alert => alert.is_resolved));
	criticalAlerts = computed(() => this.activeAlerts().filter(alert => alert.alert_level === 'critical'));
	highAlerts = computed(() => this.activeAlerts().filter(alert => alert.alert_level === 'high'));
	mediumAlerts = computed(() => this.activeAlerts().filter(alert => alert.alert_level === 'medium'));

	currentTabAlerts = computed(() => {
		switch (this.activeTab()) {
			case 'all':      return this.activeAlerts();
			case 'critical': return this.criticalAlerts();
			case 'high':     return this.highAlerts();
			case 'medium':   return this.mediumAlerts();
			case 'resolved': return this.resolvedAlerts();
			default:         return this.activeAlerts();
		}
	});

	filteredTabAlerts = computed(() => {
		const q = this.searchQuery().toLowerCase().trim();
		const alerts = this.currentTabAlerts();
		if (!q) return alerts;
		return alerts.filter(a => a.sku.toLowerCase().includes(q) || a.message.toLowerCase().includes(q));
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
		interval(30000)
			.pipe(
				switchMap(() => this.stockAlertService.analyze()),
				takeUntil(this.destroy$)
			)
			.subscribe({
				next: (response) => {
					if (response.result.success && response.data) {
						this.alerts.set(response.data.alerts);
					}
				},
				error: () => {}
			});
	}

	private loadAlerts(): void {
		this.isLoading.set(true);
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
			.finally(() => { this.isLoading.set(false); });
	}

	analyzeStock(): void {
		this.loadingService.show();
		this.stockAlertService.analyze()
			.then(response => {
				if (response.result.success && response.data) {
					this.alerts.set(response.data.alerts);
					const totalAlerts = response.data.summary.total;
					let msg = this.languageService.translate('STOCK_ALERTS.ANALYZE_SUCCESS');
					msg += totalAlerts > 0
						? ` - ${this.languageService.translate('STOCK_ALERTS.FOUND_ALERTS')}: ${totalAlerts}`
						: ` - ${this.languageService.translate('STOCK_ALERTS.NO_ALERTS_FOUND')}`;
					this.alertService.success(msg, this.languageService.translate('COMMON.SUCCESS'));
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
			.finally(() => { this.loadingService.hide(); });
	}

	resolveAlert(alertId: string): void {
		this.loadingService.show();
		this.stockAlertService.resolve(alertId)
			.then(response => {
				if (response.result.success) {
					this.alertService.success(
						this.languageService.translate('STOCK_ALERTS.RESOLVE_SUCCESS'),
						this.languageService.translate('COMMON.SUCCESS')
					);
					this.alerts.update(alerts =>
						alerts.map(alert =>
							alert.id === alertId
								? { ...alert, is_resolved: true, resolved_at: new Date().toISOString() }
								: alert
						)
					);
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
			.finally(() => { this.loadingService.hide(); });
	}

	exportAlerts(): void {
		this.loadingService.show();
		this.stockAlertService.export()
			.then(blob => {
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
			})
			.catch((error: any) => {
				this.alertService.error(
					handleApiError(error, this.languageService.translate('STOCK_ALERTS.EXPORT_ERROR')),
					this.languageService.translate('COMMON.ERROR')
				);
			})
			.finally(() => { this.loadingService.hide(); });
	}

	setActiveTab(tab: AlertTab): void {
		this.activeTab.set(tab);
		this.searchQuery.set('');
	}

	alertLevelAccent(level: string): string {
		const map: Record<string, string> = {
			critical: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-yellow-400', low: 'bg-blue-400',
		};
		return map[level] ?? 'bg-border';
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

	getDaysToExpirationText(alert: StockAlert): string {
		if (alert.days_to_expiration !== null && alert.days_to_expiration !== undefined) {
			if (alert.days_to_expiration <= 0) return this.languageService.translate('STOCK_ALERTS.EXPIRED');
			if (alert.days_to_expiration === 1) return this.languageService.translate('STOCK_ALERTS.EXPIRES_TOMORROW');
			return this.languageService.translate('STOCK_ALERTS.EXPIRES_IN_DAYS').replace('{{days}}', alert.days_to_expiration.toString());
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
		return this.activeAlerts()
			.filter(alert => alert.recommended_stock > alert.current_stock)
			.sort((a, b) => {
				const levelPriority = { critical: 4, high: 3, medium: 2, low: 1 };
				const aPriority = levelPriority[a.alert_level as keyof typeof levelPriority] || 0;
				const bPriority = levelPriority[b.alert_level as keyof typeof levelPriority] || 0;
				if (aPriority !== bPriority) return bPriority - aPriority;
				return (b.recommended_stock - b.current_stock) - (a.recommended_stock - a.current_stock);
			})
			.slice(0, 3);
	}

	t(key: string): string { return this.languageService.translate(key); }

	getTabClass(tab: AlertTab): string {
		const isActive = this.activeTab() === tab;
		const base = 'py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 cursor-pointer';
		return isActive
			? `${base} border-[#3e66ea] text-[#3e66ea] bg-white dark:bg-gray-800`
			: `${base} border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300`;
	}

	getTabBadgeClass(tab: AlertTab): string {
		const isActive = this.activeTab() === tab;
		const base = 'ml-2 text-xs px-2.5 py-1 rounded-full font-medium';
		return isActive
			? `${base} bg-[#3e66ea] text-white`
			: `${base} bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300`;
	}

	getEmptyStateMessage(): string {
		switch (this.activeTab()) {
			case 'all':      return this.t('STOCK_ALERTS.NO_ALERTS_ALL');
			case 'critical': return this.t('STOCK_ALERTS.NO_ALERTS_CRITICAL');
			case 'high':     return this.t('STOCK_ALERTS.NO_ALERTS_HIGH');
			case 'medium':   return this.t('STOCK_ALERTS.NO_ALERTS_MEDIUM');
			case 'resolved': return this.t('STOCK_ALERTS.NO_ALERTS_RESOLVED');
			default:         return '';
		}
	}

	formatDate(dateString: string): string {
		try { return new Date(dateString).toLocaleDateString(); } catch { return dateString; }
	}
}
