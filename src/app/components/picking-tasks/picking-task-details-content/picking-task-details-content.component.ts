import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PickingTask } from '@app/models/picking-task.model';
import { LanguageService } from '@app/services/extras/language.service';
import { PickingTaskService } from '@app/services/picking-task.service';
import { AlertService } from '@app/services/extras/alert.service';
import { ZardDialogRef, Z_MODAL_DATA } from '@app/shared/components/dialog';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import { handleApiError } from '@app/utils';

export interface PickingTaskDetailsData {
  task: PickingTask;
  getUserDisplayName: (userId: string | null) => string;
  getStatusBadge: (status: string) => { text: string; className: string };
  getPriorityBadge: (priority: string) => { text: string; className: string };
  onStatusUpdated?: () => void;
}

@Component({
  selector: 'app-picking-task-details-content',
  standalone: true,
  imports: [CommonModule, ZardButtonComponent],
  template: `
    @if (data; as d) {
      <div class="max-h-[70vh] overflow-y-auto space-y-6">
        <!-- Status Update Section -->
        @if (d.task.status === 'open' || d.task.status === 'in_progress') {
          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <h4 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('task_actions') }}</h4>
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('current_status') }}:</span>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border" [ngClass]="d.getStatusBadge(d.task.status).className">
                  {{ d.getStatusBadge(d.task.status).text }}
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                @if (d.task.status === 'open') {
                  <button z-button zType="default" zSize="sm" type="button" (click)="startTask()" [disabled]="updating">
                    {{ t('start_task') }}
                  </button>
                }
                @if (d.task.status === 'in_progress') {
                  <button z-button zType="default" zSize="sm" type="button" (click)="updateStatus('completed')" [disabled]="updating" class="!bg-green-600 hover:!bg-green-700">
                    {{ t('mark_complete') }}
                  </button>
                }
                @if (d.task.status === 'open' || d.task.status === 'in_progress') {
                  <button z-button zType="destructive" zSize="sm" type="button" (click)="updateStatus('cancelled')" [disabled]="updating">
                    {{ t('cancel_task') }}
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- Task Details -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('outbound_number') }}</p>
            <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">{{ d.task.order_number || d.task.outbound_number || '-' }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('priority') }}</p>
            <p class="mt-1">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border" [ngClass]="d.getPriorityBadge(d.task.priority).className">
                {{ d.getPriorityBadge(d.task.priority).text }}
              </span>
            </p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('assigned_to') }}</p>
            <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">{{ d.getUserDisplayName(d.task.assigned_to) }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('created_by') }}</p>
            <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">{{ d.getUserDisplayName(d.task.created_by) }}</p>
          </div>
        </div>

        @if (d.task.notes) {
          <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('notes') }}</p>
            <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ d.task.notes }}</p>
          </div>
        }

        <!-- Items -->
        @if (d.task.items && d.task.items.length > 0) {
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('items') }}</h4>
            <div class="space-y-2">
              @for (item of d.task.items; track item.sku + item.location) {
                <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-900/30">
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p class="font-medium text-gray-500 dark:text-gray-400">{{ t('sku') }}</p>
                      <p class="text-gray-900 dark:text-white font-mono">{{ item.sku }}</p>
                    </div>
                    <div>
                      <p class="font-medium text-gray-500 dark:text-gray-400">{{ t('required_qty') }}</p>
                      <p class="text-gray-900 dark:text-white">{{ item.expectedQty || item.required_qty || 0 }}</p>
                    </div>
                    <div>
                      <p class="font-medium text-gray-500 dark:text-gray-400">{{ t('location') }}</p>
                      <p class="text-gray-900 dark:text-white">{{ item.location }}</p>
                    </div>
                  </div>
                  @if ((item.lotNumbers && item.lotNumbers.length > 0) || (item.serialNumbers && item.serialNumbers.length > 0)) {
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      @if (item.lotNumbers && item.lotNumbers.length > 0) {
                        <div>
                          <p class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('lot_numbers') }}</p>
                          <div class="flex flex-wrap gap-1 mt-1">
                            @for (lot of item.lotNumbers; track lot) {
                              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{{ lot }}</span>
                            }
                          </div>
                        </div>
                      }
                      @if (item.serialNumbers && item.serialNumbers.length > 0) {
                        <div>
                          <p class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('serial_numbers') }}</p>
                          <div class="flex flex-wrap gap-1 mt-1">
                            @for (serial of item.serialNumbers; track serial) {
                              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{{ serial }}</span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>

      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6 pt-4 border-t border-border">
        <button type="button" z-button zType="outline" (click)="close()">{{ t('close') }}</button>
      </div>
    }
  `,
})
export class PickingTaskDetailsContentComponent {
  protected readonly language = inject(LanguageService);
  protected readonly dialogRef = inject(ZardDialogRef);
  protected readonly data = inject<PickingTaskDetailsData | null>(Z_MODAL_DATA);
  private readonly pickingTaskService = inject(PickingTaskService);
  private readonly alertService = inject(AlertService);

  updating = false;

  protected t(key: string): string {
    return this.language.translate(key);
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected async startTask(): Promise<void> {
    const d = this.data;
    if (!d?.task) return;
    this.updating = true;
    try {
      const response = await this.pickingTaskService.start(d.task.id);
      if (response.result.success) {
        this.alertService.success(this.t('task_status_updated_successfully'), this.t('success'));
        d.onStatusUpdated?.();
        this.close();
      } else {
        this.alertService.error(response.result.message || this.t('failed_to_update_task_status'), this.t('error'));
      }
    } catch (error: unknown) {
      this.alertService.error(handleApiError(error, this.t('failed_to_update_task_status')), this.t('error'));
    } finally {
      this.updating = false;
    }
  }

  protected async updateStatus(status: string): Promise<void> {
    const d = this.data;
    if (!d?.task) return;
    this.updating = true;
    try {
      const response = await this.pickingTaskService.update(d.task.id, { status });
      if (response.result.success) {
        this.alertService.success(this.t('task_status_updated_successfully'), this.t('success'));
        d.onStatusUpdated?.();
        this.close();
      } else {
        this.alertService.error(response.result.message || this.t('failed_to_update_task_status'), this.t('error'));
      }
    } catch (error: unknown) {
      this.alertService.error(handleApiError(error, this.t('failed_to_update_task_status')), this.t('error'));
    } finally {
      this.updating = false;
    }
  }
}
