import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Location } from '@app/models/location.model';
import { LanguageService } from '@app/services/extras/language.service';
import { ZardDialogRef, Z_MODAL_DATA } from '@app/shared/components/dialog';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';

export interface LocationDetailsData {
  location: Location;
  onEdit: (location: Location) => void;
  isAdmin: boolean;
}

@Component({
  selector: 'app-location-details-content',
  standalone: true,
  imports: [CommonModule, ZardButtonComponent],
  template: `
    @if (data) {
      <div class="space-y-0">
        <div class="flex items-start gap-3 py-3 border-b border-border">
          <div class="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ t('location_code') }}</p>
            <p class="mt-0.5 text-sm font-semibold text-foreground font-mono">{{ data.location.location_code }}</p>
          </div>
        </div>
        <div class="flex items-start gap-3 py-3 border-b border-border">
          <div class="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ t('location_description') }}</p>
            <p class="mt-0.5 text-sm text-foreground">{{ data.location.description || '—' }}</p>
          </div>
        </div>
        <div class="flex items-start gap-3 py-3 border-b border-border">
          <div class="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ t('location_zone') }}</p>
            <p class="mt-0.5 text-sm text-foreground">{{ data.location.zone || '—' }}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 py-3 border-b border-border">
          <div class="flex items-start gap-3">
            <div class="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
              <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8 4-8-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            </div>
            <div class="min-w-0">
              <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ t('location_type') }}</p>
              <p class="mt-0.5">
                <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold" [ngClass]="getTypeBadgeClass(data.location.type)">{{ t(data.location.type.toLowerCase()) }}</span>
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="size-9 rounded-lg flex items-center justify-center shrink-0" [ngClass]="data.location.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'">
              <span class="w-2.5 h-2.5 rounded-full" [ngClass]="data.location.is_active ? 'bg-green-500' : 'bg-red-500'"></span>
            </div>
            <div class="min-w-0">
              <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ t('location_status') }}</p>
              <p class="mt-0.5">
                <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold" [ngClass]="getStatusBadgeClass(data.location.is_active)">{{ data.location.is_active ? t('user_management.active') : t('user_management.inactive') }}</span>
              </p>
            </div>
          </div>
        </div>
        <div class="flex items-start gap-3 py-3">
          <div class="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ t('updated_at') }}</p>
            <p class="mt-0.5 text-sm text-foreground">{{ data.location.updated_at ? (data.location.updated_at | date:'medium') : '—' }}</p>
          </div>
        </div>
      </div>

      <!-- Footer with Zard buttons -->
      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6 pt-4 border-t border-border">
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
export class LocationDetailsContentComponent {
  protected readonly language = inject(LanguageService);
  protected readonly dialogRef = inject(ZardDialogRef);
  protected readonly data = inject<LocationDetailsData>(Z_MODAL_DATA);

  protected t(key: string): string {
    return this.language.translate(key);
  }

  protected getTypeBadgeClass(type: string): string {
    const variants: Record<string, string> = {
      PALLET: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      SHELF: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      BIN: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      FLOOR: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      BLOCK: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    };
    return variants[type.toUpperCase()] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }

  protected getStatusBadgeClass(isActive: boolean): string {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected editAndClose(): void {
    this.data.onEdit(this.data.location);
    this.dialogRef.close();
  }
}
