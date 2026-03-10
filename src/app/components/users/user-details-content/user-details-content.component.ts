import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { User, getRoleDisplayName } from '@app/models/user.model';
import { LanguageService } from '@app/services/extras/language.service';
import { ZardDialogRef, Z_MODAL_DATA } from '@app/shared/components/dialog';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';

export interface UserDetailsData {
  user: User;
  onEdit: (user: User) => void;
  isAdmin: boolean;
}

@Component({
  selector: 'app-user-details-content',
  standalone: true,
  imports: [CommonModule, ZardButtonComponent],
  template: `
    @if (data) {
      <div class="space-y-8">
        <!-- Profile header: avatar + name + email -->
        <div class="flex items-center gap-5 p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
          <div class="size-14 rounded-full bg-[#00113f] flex items-center justify-center text-white shrink-0 overflow-hidden ring-4 ring-white dark:ring-gray-800 shadow-md">
            <img *ngIf="data.user.profile_image_url" [src]="data.user.profile_image_url" [alt]="getUserDisplayName()" class="size-14 object-cover">
            <span *ngIf="!data.user.profile_image_url" class="text-lg font-semibold">{{ getInitials() }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-lg font-semibold text-gray-900 dark:text-white">{{ getUserDisplayName() }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ data.user.email }}</p>
          </div>
        </div>

        <!-- Role & Status -->
        <div class="grid grid-cols-2 gap-6">
          <div class="p-5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
            <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">{{ t('user_management.role') }}</p>
            <span class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium" [ngClass]="getRoleBadgeClass(data.user.role_id)">{{ getRoleDisplayName(data.user) || data.user.role_id }}</span>
          </div>
          <div class="p-5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
            <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">{{ t('user_management.status') }}</p>
            <span class="inline-flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" [ngClass]="data.user.is_active ? 'bg-emerald-500' : 'bg-red-500'"></span>
              <span class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium" [ngClass]="getStatusBadgeClass(data.user.is_active)">{{ data.user.is_active ? t('user_management.active') : t('user_management.inactive') }}</span>
            </span>
          </div>
        </div>

        <!-- Created date -->
        <div class="flex items-center gap-4 p-5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
          <div class="size-10 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 shadow-sm">
            <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{{ t('user_management.created') }}</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white mt-1">{{ formatDate(data.user.created_at) }}</p>
          </div>
        </div>
      </div>

      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
        <button type="button" z-button zType="outline" (click)="close()">
          {{ t('close') }}
        </button>
        @if (data.isAdmin) {
          <button type="button" z-button zType="default" (click)="editAndClose()">
            <svg class="size-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            {{ t('edit') }}
          </button>
        }
      </div>
    }
  `,
})
export class UserDetailsContentComponent {
  protected readonly language = inject(LanguageService);
  protected readonly dialogRef = inject(ZardDialogRef);
  protected readonly data = inject<UserDetailsData>(Z_MODAL_DATA);

  protected t(key: string): string {
    return this.language.translate(key);
  }

  protected getUserDisplayName(): string {
    const u = this.data.user;
    if (u.first_name || u.last_name) {
      return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
    }
    return u.email || u.id;
  }

  protected getInitials(): string {
    const u = this.data.user;
    const f = u.first_name?.[0] ?? '';
    const l = u.last_name?.[0] ?? '';
    return `${f}${l}`.toUpperCase() || 'U';
  }

  protected getRoleDisplayName = getRoleDisplayName;

  protected getRoleBadgeClass(roleId: string): string {
    const variants: Record<string, string> = {
      admin: 'bg-indigo-600 text-white dark:bg-indigo-500',
      operator: 'bg-emerald-600 text-white dark:bg-emerald-500',
      viewer: 'bg-slate-500 text-white dark:bg-slate-400',
    };
    const key = (roleId ?? '').toLowerCase();
    return variants[key] ?? 'bg-slate-500 text-white dark:bg-slate-400';
  }

  protected getStatusBadgeClass(isActive: boolean): string {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  }

  protected formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString ?? '—';
    }
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected editAndClose(): void {
    this.data.onEdit(this.data.user);
    this.dialogRef.close();
  }
}
