import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Client } from '@app/models/client.model';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { handleApiError } from '@app/utils';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { ClientFormComponent } from '../client-form/client-form.component';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MainLayoutComponent, ClientFormComponent],
  templateUrl: './client-detail.component.html',
})
export class ClientDetailComponent implements OnInit {
  client: Client | null = null;
  isLoading = false;
  isEditOpen = false;
  activeTab: 'general' | 'history' = 'general';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientsService: ClientsService,
    private alertService: AlertService,
    private authorizationService: AuthorizationService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadClient(id);
  }

  async loadClient(id: string): Promise<void> {
    this.isLoading = true;
    try {
      const res = await this.clientsService.getById(id);
      this.client = res.data ?? null;
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('clients.error_loading')));
      this.router.navigate(['/clients']);
    } finally {
      this.isLoading = false;
    }
  }

  isAdmin(): boolean {
    return this.authorizationService.isAdmin();
  }

  openEdit(): void {
    this.isEditOpen = true;
  }

  closeEdit(): void {
    this.isEditOpen = false;
  }

  onClientSaved(): void {
    this.closeEdit();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadClient(id);
  }

  showReceivingHistory(): boolean {
    return !!this.client && (this.client.type === 'supplier' || this.client.type === 'both');
  }

  showPickingHistory(): boolean {
    return !!this.client && (this.client.type === 'customer' || this.client.type === 'both');
  }

  typeBadgeClass(): string {
    switch (this.client?.type) {
      case 'supplier': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'customer': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'both': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-600';
    }
  }
}
