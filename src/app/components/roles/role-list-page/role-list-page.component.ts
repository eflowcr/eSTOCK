import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Role } from '@app/models/role.model';
import { RolesService } from '@app/services/roles.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { handleApiError } from '@app/utils';
import { RoleListComponent } from '../role-list/role-list.component';

@Component({
  selector: 'app-role-list-page',
  standalone: true,
  imports: [CommonModule, RoleListComponent],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-semibold text-[#00113f] dark:text-white">
            {{ t('roles.title') }}
          </h1>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ t('roles.description') }}
          </p>
        </div>
      </div>
      <app-role-list
        [roles]="roles"
        [isLoading]="isLoading"
        (refresh)="loadRoles()"
      ></app-role-list>
    </div>
  `,
  styles: [],
})
export class RoleListPageComponent implements OnInit {
  roles: Role[] = [];
  isLoading = false;

  constructor(
    private rolesService: RolesService,
    private languageService: LanguageService,
    private alertService: AlertService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnInit(): void {
    this.loadRoles();
  }

  async loadRoles(): Promise<void> {
    try {
      this.isLoading = true;
      const res = await this.rolesService.getList();
      this.roles = (res?.data ?? []) as Role[];
    } catch (error) {
      this.alertService.error(handleApiError(error as any, this.t('roles.load_error')));
    } finally {
      this.isLoading = false;
    }
  }
}
