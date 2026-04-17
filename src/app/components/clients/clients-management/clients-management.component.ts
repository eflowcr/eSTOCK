import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Client } from '@app/models/client.model';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { handleApiError } from '@app/utils';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { ClientsListComponent } from '../clients-list/clients-list.component';
import { ClientFormComponent } from '../client-form/client-form.component';

@Component({
  selector: 'app-clients-management',
  standalone: true,
  imports: [CommonModule, RouterModule, MainLayoutComponent, ClientsListComponent, ClientFormComponent],
  templateUrl: './clients-management.component.html',
})
export class ClientsManagementComponent implements OnInit {
  clients: Client[] = [];
  isLoading = false;
  isFormOpen = false;
  selectedClient: Client | null = null;

  constructor(
    private clientsService: ClientsService,
    private alertService: AlertService,
    private authorizationService: AuthorizationService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnInit(): void {
    this.loadClients();
  }

  async loadClients(): Promise<void> {
    this.isLoading = true;
    try {
      const res = await this.clientsService.list();
      this.clients = res.data ?? [];
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('clients.error_loading')));
    } finally {
      this.isLoading = false;
    }
  }

  isAdmin(): boolean {
    return this.authorizationService.isAdmin();
  }

  openCreateForm(): void {
    this.selectedClient = null;
    this.isFormOpen = true;
  }

  openEditForm(client: Client): void {
    this.selectedClient = { ...client };
    this.isFormOpen = true;
  }

  closeForm(): void {
    this.isFormOpen = false;
    this.selectedClient = null;
  }

  onClientSaved(): void {
    this.closeForm();
    this.loadClients();
  }

  onClientArchived(): void {
    this.loadClients();
  }
}
