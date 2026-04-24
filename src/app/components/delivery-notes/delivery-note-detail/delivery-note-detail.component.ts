import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';
import { DeliveryNote } from '@app/models/delivery-note.model';
import { DeliveryNotesService } from '@app/services/delivery-notes.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { handleApiError } from '@app/utils';

const MAX_RETRIES = 10;
const RETRY_INTERVAL_MS = 3000;

@Component({
  selector: 'app-delivery-note-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MainLayoutComponent],
  templateUrl: './delivery-note-detail.component.html',
  styleUrls: ['./delivery-note-detail.component.css'],
})
export class DeliveryNoteDetailComponent implements OnInit, OnDestroy {
  deliveryNote: DeliveryNote | null = null;
  isLoading = false;
  isDownloading = false;

  // PDF polling
  isPolling = false;
  retryCount = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private deliveryNotesService: DeliveryNotesService,
    private alertService: AlertService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDeliveryNote(id);
    } else {
      this.router.navigate(['/delivery-notes']);
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  async loadDeliveryNote(id: string): Promise<void> {
    this.isLoading = true;
    try {
      const res = await this.deliveryNotesService.getById(id);
      if (res.result.success) {
        this.deliveryNote = res.data ?? null;
        if (this.deliveryNote && !this.deliveryNote.pdf_url) {
          this.startPolling(id);
        }
      } else {
        this.alertService.error(res.result.message || this.t('delivery_notes.error_loading'), this.t('error'));
        this.router.navigate(['/delivery-notes']);
      }
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('delivery_notes.error_loading')), this.t('error'));
      this.router.navigate(['/delivery-notes']);
    } finally {
      this.isLoading = false;
    }
  }

  // ---- PDF polling ----

  startPolling(id: string): void {
    if (this.isPolling) return;
    this.isPolling = true;
    this.retryCount = 0;
    this.scheduleNextPoll(id);
  }

  private scheduleNextPoll(id: string): void {
    this.pollTimer = setTimeout(async () => {
      if (this.retryCount >= MAX_RETRIES) {
        this.isPolling = false;
        return;
      }
      this.retryCount++;
      try {
        const res = await this.deliveryNotesService.getById(id);
        if (res.result.success && res.data?.pdf_url) {
          this.deliveryNote = res.data;
          this.isPolling = false;
          return;
        }
        // Still no pdf_url — schedule next poll
        if (this.retryCount < MAX_RETRIES) {
          this.scheduleNextPoll(id);
        } else {
          this.isPolling = false;
        }
      } catch {
        this.isPolling = false;
      }
    }, RETRY_INTERVAL_MS);
  }

  stopPolling(): void {
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this.isPolling = false;
  }

  retryPdfNow(): void {
    if (!this.deliveryNote) return;
    this.stopPolling();
    this.retryCount = 0;
    this.startPolling(this.deliveryNote.id);
  }

  // ---- Download ----

  async downloadPdf(): Promise<void> {
    if (!this.deliveryNote?.pdf_url) return;
    this.isDownloading = true;
    try {
      const blob = await this.deliveryNotesService.downloadPdf(this.deliveryNote.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.deliveryNote.dn_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      this.alertService.error(
        handleApiError(error, this.t('delivery_notes.error_download')),
        this.t('error'),
      );
    } finally {
      this.isDownloading = false;
    }
  }

  // ---- Helpers ----

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  formatDateTime(dateString: string | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  goBack(): void {
    this.router.navigate(['/delivery-notes']);
  }
}
