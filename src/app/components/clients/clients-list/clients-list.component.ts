import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Client, ClientListFilters, ClientType } from '@app/models/client.model';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { handleApiError } from '@app/utils';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ConfirmationDialogComponent],
  templateUrl: './clients-list.component.html',
})
export class ClientsListComponent {
  @Input() set clients(value: Client[]) {
    this.allClients = value ?? [];
  }
  @Input() isLoading = false;
  @Output() editClient = new EventEmitter<Client>();
  @Output() clientArchived = new EventEmitter<void>();

  searchTerm = '';
  typeFilter: ClientType | '' = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'active';

  confirmArchiveOpen = false;
  clientToArchive: Client | null = null;
  isArchiving = false;

  allClients: Client[] = [];

  constructor(
    private clientsService: ClientsService,
    private alertService: AlertService,
    private authorizationService: AuthorizationService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  get filteredClients(): Client[] {
    return this.allClients.filter((c) => {
      if (this.typeFilter && c.type !== this.typeFilter) return false;
      if (this.statusFilter === 'active' && !c.is_active) return false;
      if (this.statusFilter === 'inactive' && c.is_active) return false;
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        if (!c.code.toLowerCase().includes(term) && !c.name.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }

  isAdmin(): boolean {
    return this.authorizationService.isAdmin();
  }

  onEdit(client: Client): void {
    this.editClient.emit(client);
  }

  openArchiveConfirm(client: Client): void {
    this.clientToArchive = client;
    this.confirmArchiveOpen = true;
  }

  cancelArchive(): void {
    this.confirmArchiveOpen = false;
    this.clientToArchive = null;
  }

  async confirmArchive(): Promise<void> {
    if (!this.clientToArchive) return;
    this.isArchiving = true;
    try {
      await this.clientsService.softDelete(this.clientToArchive.id);
      this.alertService.success(this.t('clients.archived_success'));
      this.clientArchived.emit();
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('clients.error_archiving')));
    } finally {
      this.isArchiving = false;
      this.confirmArchiveOpen = false;
      this.clientToArchive = null;
    }
  }

  typeBadgeClass(type: ClientType): string {
    switch (type) {
      case 'supplier': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'customer': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'both': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  }

  typeLabel(type: ClientType): string {
    return this.t(`clients.type.${type}`);
  }
}
