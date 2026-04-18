import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReceivingTask } from '@app/models/receiving-task.model';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
  selector: 'app-proveedores-tab',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './proveedores-tab.component.html',
})
export class ProveedoresTabComponent implements OnInit {
  @Input({ required: true }) sku!: string;

  isLoading = false;
  lastTask: ReceivingTask | null = null;
  lastQty = 0;

  constructor(
    private receivingTaskService: ReceivingTaskService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return (key: string) => this.languageService.translate(key);
  }

  ngOnInit(): void {
    this.loadLastReception();
  }

  async loadLastReception(): Promise<void> {
    if (!this.sku) return;
    this.isLoading = true;
    try {
      const res = await this.receivingTaskService.getAll();
      const tasks = (res.data ?? []).filter(
        task => task.status === 'completed' && (task.items ?? []).some(item => item.sku === this.sku)
      );
      tasks.sort((a, b) => {
        const aDate = a.completed_at || a.updated_at || a.created_at;
        const bDate = b.completed_at || b.updated_at || b.created_at;
        return (bDate || '').localeCompare(aDate || '');
      });
      const last = tasks[0] ?? null;
      this.lastTask = last;
      if (last) {
        const matching = (last.items ?? []).filter(item => item.sku === this.sku);
        this.lastQty = matching.reduce(
          (sum, item) => sum + (item.received_qty || item.accepted_qty || 0),
          0,
        );
      }
    } catch {
      this.lastTask = null;
    } finally {
      this.isLoading = false;
    }
  }

  get lastDate(): string | null {
    if (!this.lastTask) return null;
    const d = this.lastTask.completed_at || this.lastTask.updated_at || this.lastTask.created_at;
    if (!d) return null;
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return d;
    }
  }

  get supplierName(): string {
    return this.lastTask?.supplier?.name || this.t('article_detail.proveedores.supplier_unknown');
  }

  get supplierCode(): string | null {
    return this.lastTask?.supplier?.code ?? null;
  }
}
