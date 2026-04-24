import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';
import { DeliveryNote, DeliveryNoteListFilters } from '@app/models/delivery-note.model';
import { ClientsService } from '@app/services/clients.service';
import { DeliveryNotesService } from '@app/services/delivery-notes.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { handleApiError } from '@app/utils';
import { Client } from '@app/models/client.model';

const DN_LS_KEY = 'dn_list_filters';

@Component({
  selector: 'app-delivery-notes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainLayoutComponent],
  templateUrl: './delivery-notes-list.component.html',
  styleUrls: ['./delivery-notes-list.component.css'],
})
export class DeliveryNotesListComponent implements OnInit {
  deliveryNotes: DeliveryNote[] = [];
  clients: Client[] = [];
  isLoading = signal(false);

  // Filters
  filterCustomerId = '';
  filterSoNumber = '';
  filterFrom = '';
  filterTo = '';

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalCount = 0;

  constructor(
    private deliveryNotesService: DeliveryNotesService,
    private clientsService: ClientsService,
    private alertService: AlertService,
    private languageService: LanguageService,
    private router: Router,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnInit(): void {
    this.restoreFilters();
    this.loadClients();
    this.loadDeliveryNotes();
  }

  private restoreFilters(): void {
    try {
      const saved = localStorage.getItem(DN_LS_KEY);
      if (saved) {
        const f = JSON.parse(saved);
        this.filterCustomerId = f.customer_id ?? '';
        this.filterSoNumber = f.so_number ?? '';
        this.filterFrom = f.from ?? '';
        this.filterTo = f.to ?? '';
        this.currentPage = f.page ?? 1;
      }
    } catch { /* ignore */ }
  }

  private saveFilters(): void {
    try {
      const f: Record<string, unknown> = { page: this.currentPage };
      if (this.filterCustomerId) f['customer_id'] = this.filterCustomerId;
      if (this.filterSoNumber) f['so_number'] = this.filterSoNumber;
      if (this.filterFrom) f['from'] = this.filterFrom;
      if (this.filterTo) f['to'] = this.filterTo;
      localStorage.setItem(DN_LS_KEY, JSON.stringify(f));
    } catch { /* ignore */ }
  }

  async loadClients(): Promise<void> {
    try {
      const res = await this.clientsService.list();
      if (res.result.success) {
        this.clients = (res.data || []).filter(c => c.type === 'customer' || c.type === 'both');
      }
    } catch {
      // non-critical
    }
  }

  async loadDeliveryNotes(): Promise<void> {
    this.isLoading.set(true);
    try {
      const filters: DeliveryNoteListFilters = {
        page: this.currentPage,
        page_size: this.pageSize,
      };
      if (this.filterCustomerId) filters.customer_id = this.filterCustomerId;
      if (this.filterSoNumber) filters.so_number = this.filterSoNumber;
      if (this.filterFrom) filters.from = this.filterFrom;
      if (this.filterTo) filters.to = this.filterTo;

      const res = await this.deliveryNotesService.list(filters);
      if (res.result.success) {
        this.deliveryNotes = res.data || [];
        this.totalCount = (res as any).meta?.total ?? this.deliveryNotes.length;
      } else {
        this.alertService.error(
          res.result.message || this.t('delivery_notes.error_loading'),
          this.t('error'),
        );
      }
    } catch (error: any) {
      this.alertService.error(
        handleApiError(error, this.t('delivery_notes.error_loading')),
        this.t('error'),
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.saveFilters();
    this.loadDeliveryNotes();
  }

  clearFilters(): void {
    this.filterCustomerId = '';
    this.filterSoNumber = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.currentPage = 1;
    localStorage.removeItem(DN_LS_KEY);
    this.loadDeliveryNotes();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.saveFilters();
      this.loadDeliveryNotes();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.saveFilters();
      this.loadDeliveryNotes();
    }
  }

  viewDetail(dn: DeliveryNote): void {
    this.router.navigate(['/delivery-notes', dn.id]);
  }

  async downloadPdf(dn: DeliveryNote, event: Event): Promise<void> {
    event.stopPropagation();
    if (!dn.pdf_url) return;
    try {
      const blob = await this.deliveryNotesService.downloadPdf(dn.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dn.dn_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      this.alertService.error(
        handleApiError(error, this.t('delivery_notes.error_download')),
        this.t('error'),
      );
    }
  }

  getPdfStatusBadge(dn: DeliveryNote): { className: string; text: string } {
    if (dn.pdf_url) {
      return {
        className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
        text: this.t('delivery_notes.pdf_generated'),
      };
    }
    return {
      className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700',
      text: this.t('delivery_notes.pdf_pending'),
    };
  }

  getClientName(dn: DeliveryNote): string {
    if (dn.customer?.name) return dn.customer.name;
    const c = this.clients.find(cl => cl.id === dn.customer_id);
    return c?.name || dn.customer_id;
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  get hasActiveFilters(): boolean {
    return !!(this.filterCustomerId || this.filterSoNumber || this.filterFrom || this.filterTo);
  }
}
