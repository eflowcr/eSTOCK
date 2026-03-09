import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Role } from '@app/models/role.model';
import { RolesService } from '@app/services/roles.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { handleApiError } from '@app/utils';
import {
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCE_GROUPS,
  type PermissionResourceGroup,
} from '@app/config/permission-resources.config';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import { ZardSwitchComponent } from '@app/shared/components/switch';

type PermissionsMap = Record<string, Record<string, boolean>>;

@Component({
  selector: 'app-role-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ZardButtonComponent, ZardSwitchComponent],
  templateUrl: './role-detail.component.html',
  styleUrls: ['./role-detail.component.css'],
})
export class RoleDetailComponent implements OnInit {
  role: Role | null = null;
  roleId: string | null = null;
  isLoading = true;
  isSaving = false;
  fullAccess = false;
  permissions: PermissionsMap = {};
  groups: PermissionResourceGroup[] = PERMISSION_RESOURCE_GROUPS;
  actions = PERMISSION_ACTIONS;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rolesService: RolesService,
    private languageService: LanguageService,
    private alertService: AlertService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnInit(): void {
    this.roleId = this.route.snapshot.paramMap.get('id');
    if (this.roleId) {
      this.loadRole();
    } else {
      this.isLoading = false;
    }
  }

  private parsePermissions(raw: unknown): PermissionsMap {
    if (raw == null) return {};
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    if (typeof raw !== 'object' || raw === null) return {};
    const perms = raw as Record<string, unknown>;
    if ('all' in perms && perms['all'] === true) {
      return {};
    }
    const out: PermissionsMap = {};
    for (const [resource, value] of Object.entries(perms)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        out[resource] = value as Record<string, boolean>;
      }
    }
    return out;
  }

  private buildPermissionsPayload(): Record<string, unknown> {
    if (this.fullAccess) {
      return { all: true };
    }
    return { ...this.permissions };
  }

  async loadRole(): Promise<void> {
    if (!this.roleId) return;
    try {
      this.isLoading = true;
      const res = await this.rolesService.getById(this.roleId);
      if (res?.result?.success && res.data) {
        this.role = res.data as Role;
        const raw = this.role.permissions;
        const parsed = this.parsePermissions(raw);
        const hasAll = raw && typeof raw === 'object' && 'all' in (raw as Record<string, unknown>) && (raw as Record<string, unknown>)['all'] === true;
        if (hasAll) {
          this.fullAccess = true;
          this.permissions = {};
        } else {
          this.fullAccess = false;
          this.permissions = parsed;
        }
      }
    } catch (error) {
      this.alertService.error(handleApiError(error as any, this.t('roles.load_error')));
      this.router.navigate(['/roles']);
    } finally {
      this.isLoading = false;
    }
  }

  onFullAccessChange(checked: boolean): void {
    this.fullAccess = checked;
    if (checked) {
      this.permissions = {};
    }
  }

  getPermission(resource: string, action: string): boolean {
    if (this.fullAccess) return true;
    const res = this.permissions[resource];
    if (!res) return false;
    return res[action] === true;
  }

  setPermission(resource: string, action: string, value: boolean): void {
    if (this.fullAccess) return;
    if (!this.permissions[resource]) {
      this.permissions[resource] = {};
    }
    this.permissions[resource][action] = value;
    this.permissions = { ...this.permissions };
  }

  allPermissionsForResource(resource: string): boolean {
    if (this.fullAccess) return true;
    const res = this.permissions[resource];
    if (!res) return false;
    return this.actions.every((a) => res[a.key] === true);
  }

  setAllForResource(resource: string, value: boolean): void {
    if (this.fullAccess) return;
    this.permissions[resource] = {};
    if (value) {
      this.actions.forEach((a) => (this.permissions[resource][a.key] = true));
    }
    this.permissions = { ...this.permissions };
  }

  async save(): Promise<void> {
    if (!this.roleId) return;
    try {
      this.isSaving = true;
      const payload = this.buildPermissionsPayload();
      await this.rolesService.updatePermissions(this.roleId, payload);
      this.alertService.success(this.t('roles.permissions_updated'), this.t('success'));
      this.loadRole();
    } catch (error) {
      this.alertService.error(handleApiError(error as any, this.t('roles.save_error')));
    } finally {
      this.isSaving = false;
    }
  }

  back(): void {
    this.router.navigate(['/roles']);
  }
}
