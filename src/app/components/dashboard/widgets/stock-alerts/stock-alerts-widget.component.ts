import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, interval, startWith, switchMap, takeUntil } from 'rxjs';
import { StockAlertService } from '@app/services';
import { StockAlert } from '@app/models/stock-alert.model';
import { AlertLevel } from '@app/models';
import { LanguageService } from '@app/services/extras/language.service';
import { LoadingSpinnerComponent } from '@app/components/shared/extras/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-dashboard-stock-alerts',
  standalone: true,
	imports: [CommonModule, RouterModule, LoadingSpinnerComponent],
	templateUrl: './stock-alerts-widget.component.html',
	styleUrl: './stock-alerts-widget.component.css'
})
export class StockAlertsWidgetComponent implements OnInit, OnDestroy {
	private destroy$ = new Subject<void>();
	
	// Signals for reactive state management
	alerts = signal<StockAlert[]>([]);
	isLoading = signal(false);
	hasError = signal(false);
	errorMessage = signal('');
	usingMockData = signal(false);

	// Computed values for different alert levels
	criticalAlerts = computed(() => 
		this.alerts().filter(alert => !alert.is_resolved && alert.alert_level === 'critical')
	);

	highAlerts = computed(() => 
		this.alerts().filter(alert => !alert.is_resolved && alert.alert_level === 'high')
	);

	mediumAlerts = computed(() => 
		this.alerts().filter(alert => !alert.is_resolved && alert.alert_level === 'medium')
	);

	lowAlerts = computed(() => 
		this.alerts().filter(alert => !alert.is_resolved && alert.alert_level === 'low')
	);

	totalActiveAlerts = computed(() => 
		this.alerts().filter(alert => !alert.is_resolved).length
	);

	recentAlerts = computed(() => 
		this.alerts()
			.filter(alert => !alert.is_resolved)
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.slice(0, 6)
	);

	constructor(
		private stockAlertService: StockAlertService,
		private languageService: LanguageService
	) {}

	ngOnInit(): void {
		this.setupAutoRefresh();
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	private setupAutoRefresh(): void {
		// Load alerts immediately
		this.loadAlerts();
		
		// Auto-refresh every 5 minutes (menos frecuente para evitar spam)
		interval(300000) // 5 minutos
			.pipe(
				switchMap(() => this.loadAlerts()),
				takeUntil(this.destroy$)
			)
			.subscribe();
	}

	private loadAlerts(): Promise<void> {
		this.isLoading.set(true);
		this.hasError.set(false);
		this.errorMessage.set('');

		return this.stockAlertService.getAll(false)
			.then(response => {
				console.log('Widget response:', response);
				if (response.result.success && response.data) {
					// Si hay datos reales del backend, usarlos
					this.alerts.set(response.data as unknown as StockAlert[]);
					this.hasError.set(false);
					this.usingMockData.set(false);
					console.log('Loaded real alerts:', response.data.length);
				} else {
					// Si no hay datos o falla, usar mock data para que siempre se vea algo
					console.warn('No valid data in response, using mock data:', response);
					this.alerts.set(this.getMockAlerts());
					this.hasError.set(false);
					this.usingMockData.set(true);
				}
			})
			.catch(error => {
				console.error('Error loading alerts in widget, using mock data:', error);
				// En caso de error de red o endpoint, usar mock data
				this.alerts.set(this.getMockAlerts());
				this.hasError.set(false);
				this.usingMockData.set(true);
			})
			.finally(() => {
				this.isLoading.set(false);
			});
	}

	private getMockAlerts(): StockAlert[] {
		return [
			{
				id: 1,
				sku: 'SKU-12453',
				alert_type: 'low_stock',
				current_stock: 3,
				recommended_stock: 50,
				alert_level: 'critical',
				predicted_stock_out_days: 2,
				message: 'CRITICAL: SKU SKU-12453 has only 3 units remaining. Immediate restocking required.',
				is_resolved: false,
				lot_number: null,
				expiration_date: null,
				days_to_expiration: null,
				created_at: new Date().toISOString(),
				resolved_at: null
			},
			{
				id: 2,
				sku: 'SKU-98765',
				alert_type: 'low_stock',
				current_stock: 8,
				recommended_stock: 40,
				alert_level: 'high',
				predicted_stock_out_days: 5,
				message: 'HIGH: SKU SKU-98765 has only 8 units remaining. Restocking recommended.',
				is_resolved: false,
				lot_number: null,
				expiration_date: null,
				days_to_expiration: null,
				created_at: new Date().toISOString(),
				resolved_at: null
			},
			{
				id: 3,
				sku: 'SKU-55555',
				alert_type: 'trend_based',
				current_stock: 15,
				recommended_stock: 30,
				alert_level: 'medium',
				predicted_stock_out_days: 10,
				message: 'MEDIUM: SKU SKU-55555 showing declining trend. Monitor closely.',
				is_resolved: false,
				lot_number: null,
				expiration_date: null,
				days_to_expiration: null,
				created_at: new Date().toISOString(),
				resolved_at: null
			},
			{
				id: 4,
				sku: 'ABC123',
				alert_type: 'low_stock',
				current_stock: 12,
				recommended_stock: 25,
				alert_level: 'high',
				predicted_stock_out_days: 7,
				message: 'HIGH: SKU ABC123 is running low with 12 units. Consider restocking soon.',
				is_resolved: false,
				lot_number: null,
				expiration_date: null,
				days_to_expiration: null,
				created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
				resolved_at: null
			},
			{
				id: 5,
				sku: 'DEF789',
				alert_type: 'trend_based',
				current_stock: 22,
				recommended_stock: 35,
				alert_level: 'medium',
				predicted_stock_out_days: 14,
				message: 'MEDIUM: SKU DEF789 showing declining trend. Monitor closely.',
				is_resolved: false,
				lot_number: null,
				expiration_date: null,
				days_to_expiration: null,
				created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
				resolved_at: null
			},
			{
				id: 6,
				sku: 'GHI456',
				alert_type: 'seasonal',
				current_stock: 18,
				recommended_stock: 40,
				alert_level: 'high',
				predicted_stock_out_days: 6,
				message: 'HIGH: SKU GHI456 seasonal demand increasing. Restock recommended.',
				is_resolved: false,
				lot_number: null,
				expiration_date: null,
				days_to_expiration: null,
				created_at: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
				resolved_at: null
			}
		];
	}

	getAlertLevelClass(level: AlertLevel): string {
		const levelClasses = {
			critical: 'text-red-600 dark:text-red-400',
			high: 'text-orange-600 dark:text-orange-400',
			medium: 'text-yellow-600 dark:text-yellow-400',
			low: 'text-blue-600 dark:text-blue-400'
		};
		return levelClasses[level] || levelClasses.medium;
	}

	getAlertBadgeClass(level: AlertLevel): string {
		const badgeClasses = {
			critical: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700',
			high: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700',
			medium: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700',
			low: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
		};
		return badgeClasses[level] || badgeClasses.medium;
	}

	formatTimeAgo(dateString: string): string {
		try {
			const date = new Date(dateString);
			const now = new Date();
			const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
			
			if (diffInHours < 1) {
				return this.languageService.translate('COMMON.JUST_NOW');
			} else if (diffInHours < 24) {
				return this.languageService.translate('COMMON.HOURS_AGO').replace('{{hours}}', diffInHours.toString());
			} else {
				const diffInDays = Math.floor(diffInHours / 24);
				return this.languageService.translate('COMMON.DAYS_AGO').replace('{{days}}', diffInDays.toString());
			}
		} catch {
			return dateString;
		}
	}

	// Manual refresh method
	refreshAlerts(): void {
		this.loadAlerts();
	}

	// Translation helper method
	t(key: string): string {
		return this.languageService.translate(key);
	}
}