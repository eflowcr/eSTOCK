import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Inventory } from '@app/models/inventory.model';
import { LanguageService } from '@app/services/extras/language.service';
import { Z_MODAL_DATA } from '@app/shared/components/dialog';

@Component({
  selector: 'app-inventory-details-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (inventory) {
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <span class="inline-flex items-center rounded-md bg-accent px-2 py-1 text-xs font-semibold text-primary">{{ inventory.sku }}</span>
        <span class="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">{{ inventory.location || '-' }}</span>
        <span [class]="getStatusBadgeClass(inventory.status)" class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold">{{ t(inventory.status) }}</span>
      </div>
      <div class="max-h-[70vh] overflow-y-auto space-y-5">
        <!-- Basic Information -->
        <section class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
          <h4 class="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('basic_information') }}</h4>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('sku_code') }}</p>
              <p class="mt-1 font-mono text-sm font-semibold text-gray-900 dark:text-white">{{ inventory.sku }}</p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('name') }}</p>
              <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">{{ inventory.name || '-' }}</p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('presentation') }}</p>
              <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">{{ t(inventory.presentation) }}</p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('quantity') }}</p>
              <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ inventory.quantity }}</p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('unit_price') }}</p>
              <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ (inventory.unit_price ?? 0) | currency:'USD' }}</p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('location') }}</p>
              <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">{{ inventory.location || '-' }}</p>
            </div>
          </div>
          @if (inventory.description) {
            <div class="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('description') }}</p>
              <p class="mt-1 text-sm text-gray-800 dark:text-gray-200">{{ inventory.description }}</p>
            </div>
          }
        </section>

        <!-- Tracking Information -->
        <section class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
          <h4 class="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('tracking_information') }}</h4>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/30">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('track_by_lot') }}</span>
              <span [class]="inventory.track_by_lot ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'" class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold">
                {{ inventory.track_by_lot ? t('enabled') : t('disabled') }}
              </span>
            </div>
            <div class="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/30">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('track_by_serial') }}</span>
              <span [class]="inventory.track_by_serial ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'" class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold">
                {{ inventory.track_by_serial ? t('enabled') : t('disabled') }}
              </span>
            </div>
            <div class="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/30">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('track_expiration') }}</span>
              <span [class]="inventory.track_expiration ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'" class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold">
                {{ inventory.track_expiration ? t('enabled') : t('disabled') }}
              </span>
            </div>
          </div>
        </section>

        <!-- Stock Limits -->
        @if (inventory.min_quantity != null || inventory.max_quantity != null) {
          <section class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <h4 class="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('stock_limits') }}</h4>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-700 dark:bg-gray-900/30">
                <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('min_quantity') }}</p>
                <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ inventory.min_quantity ?? '-' }}</p>
              </div>
              <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-700 dark:bg-gray-900/30">
                <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('max_quantity') }}</p>
                <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ inventory.max_quantity ?? '-' }}</p>
              </div>
            </div>
          </section>
        }

        <!-- Lots -->
        @if (inventory.lots && inventory.lots.length > 0) {
          <section class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <h4 class="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('lots') }}</h4>
            <div class="space-y-2">
              @for (lot of inventory.lots; track lot.id) {
                <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/30">
                  <div class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <p class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('lot_number') }}</p>
                      <p class="font-medium text-gray-900 dark:text-white">{{ lot.lotNumber }}</p>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('quantity') }}</p>
                      <p class="font-medium text-gray-900 dark:text-white">{{ lot.quantity }}</p>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('expiration_date') }}</p>
                      <p class="font-medium text-gray-900 dark:text-white">{{ lot.expirationDate ? (lot.expirationDate | date:'shortDate') : '-' }}</p>
                    </div>
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- Serials -->
        @if (inventory.serials && inventory.serials.length > 0) {
          <section class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <h4 class="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('serials') }}</h4>
            <div class="space-y-2">
              @for (serial of inventory.serials; track serial.id) {
                <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/30">
                  <div class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <p class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('serial_number') }}</p>
                      <p class="font-mono text-sm font-medium text-gray-900 dark:text-white">{{ serial.serialNumber }}</p>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('status') }}</p>
                      <p class="font-medium text-gray-900 dark:text-white">{{ t(serial.status) }}</p>
                    </div>
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- Timestamps -->
        <section class="rounded-lg border border-gray-200/70 bg-white p-3 dark:border-gray-700/70 dark:bg-gray-800/50">
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            @if (inventory.created_at) {
              <div class="rounded-md border border-gray-200/70 bg-gray-50/70 px-2.5 py-2 dark:border-gray-700/70 dark:bg-gray-900/20">
                <p class="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('created_at') }}</p>
                <p class="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{{ inventory.created_at | date:'medium' }}</p>
              </div>
            }
            @if (inventory.updated_at) {
              <div class="rounded-md border border-gray-200/70 bg-gray-50/70 px-2.5 py-2 dark:border-gray-700/70 dark:bg-gray-900/20">
                <p class="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('updated_at') }}</p>
                <p class="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{{ inventory.updated_at | date:'medium' }}</p>
              </div>
            }
          </div>
        </section>
      </div>
    }
  `,
})
export class InventoryDetailsContentComponent {
  protected readonly language = inject(LanguageService);
  protected readonly inventory = inject<Inventory>(Z_MODAL_DATA);

  protected t(key: string): string {
    return this.language.translate(key);
  }

  protected getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'damaged':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }
}
