import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockAlert, StockAlertSearchParams } from '@app/models/stock-alert.model';
import { AlertLevel } from '@app/models';
import { StockAlertService } from '@app/services';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LoadingSpinnerComponent } from '@app/components/shared/extras/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-stock-alerts-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './stock-alerts-list.component.html',
  styleUrls: ['./stock-alerts-list.component.css']
})
export class StockAlertsListComponent implements OnInit {
  @Input() alerts = signal<StockAlert[]>([]);
  @Input() isLoading = signal<boolean>(false);

  // Search and filter parameters - using regular properties for ngModel binding
  searchParams: StockAlertSearchParams = {
    search: '',
    alert_level: undefined,
    alert_type: '',
    page: 1,
    limit: 10,
    sort_by: 'created_at',
    sort_order: 'desc'
  };

  // Set to track alerts being resolved
  resolvingAlerts = new Set<number>();

  constructor(
    private stockAlertService: StockAlertService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    // Component initialization
  }

  // Search and filter methods
  onSearchChange(): void {
    this.searchParams.page = 1;
    this.performSearch();
  }

  onFilterChange(): void {
    this.searchParams.page = 1;
    this.performSearch();
  }

  private performSearch(): void {
    this.isLoading.set(true);
    
    this.stockAlertService.search(this.searchParams)
      .then(response => {
        if (response.result.success && response.data) {
          this.alerts.set(response.data as unknown as StockAlert[]);
        } else {
          this.alertService.error(
            this.t('STOCK_ALERTS.SEARCH_ERROR'),
            this.t('COMMON.ERROR')
          );
        }
      })
      .catch(error => {
        console.error('Error searching alerts:', error);
        this.alertService.error(
          this.t('STOCK_ALERTS.SEARCH_ERROR'),
          this.t('COMMON.ERROR')
        );
      })
      .finally(() => {
        this.isLoading.set(false);
      });
  }

  // Pagination methods
  previousPage(): void {
    if (this.searchParams.page && this.searchParams.page > 1) {
      this.searchParams.page = this.searchParams.page - 1;
      this.performSearch();
    }
  }

  nextPage(): void {
    const currentPage = this.searchParams.page || 1;
    this.searchParams.page = currentPage + 1;
    this.performSearch();
  }

  // Alert actions
  async resolveAlert(alertId: number): Promise<void> {
    if (this.resolvingAlerts.has(alertId)) return;

    this.resolvingAlerts.add(alertId);

    try {
      const response = await this.stockAlertService.resolve(alertId);
      
      if (response.result.success) {
        // Update the alert in the list
        const currentAlerts = this.alerts();
        const updatedAlerts = currentAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, is_resolved: true, resolved_at: new Date().toISOString() }
            : alert
        );
        this.alerts.set(updatedAlerts);
        
        this.alertService.success(
          this.t('STOCK_ALERTS.RESOLVE_SUCCESS'),
          this.t('COMMON.SUCCESS')
        );
      } else {
        this.alertService.error(
          this.t('STOCK_ALERTS.RESOLVE_ERROR'),
          this.t('COMMON.ERROR')
        );
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      this.alertService.error(
        this.t('STOCK_ALERTS.RESOLVE_ERROR'),
        this.t('COMMON.ERROR')
      );
    } finally {
      this.resolvingAlerts.delete(alertId);
    }
  }

  // Utility methods
  getDaysToExpirationClass(days: number | null): string {
    if (days === null) return 'expiration-normal';
    if (days <= 0) return 'expiration-warning';
    if (days <= 3) return 'expiration-caution';
    return 'expiration-normal';
  }

  getDaysToExpirationText(days: number | null): string {
    if (days === null) return '';
    if (days <= 0) return this.t('STOCK_ALERTS.EXPIRED');
    if (days === 1) return this.t('STOCK_ALERTS.EXPIRES_TOMORROW');
    return this.t('STOCK_ALERTS.EXPIRES_IN_DAYS').replace('{{days}}', days.toString());
  }

  getRecommendedAction(alert: StockAlert): string {
    if (alert.recommended_stock > alert.current_stock) {
      const needed = alert.recommended_stock - alert.current_stock;
      return this.t('STOCK_ALERTS.ORDER_UNITS').replace('{{units}}', needed.toString());
    }
    return this.t('STOCK_ALERTS.NO_ACTION_NEEDED');
  }

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }

  // Translation helper
  t(key: string): string {
    return this.languageService.translate(key);
  }
}