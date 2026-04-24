import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoryTreeNode } from '@app/models/category.model';
import { CategoriesService } from '@app/services/categories.service';

@Component({
  selector: 'app-category-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">
      <!-- Trigger button -->
      <button type="button" (click)="toggleDropdown()"
        class="w-full flex items-center justify-between h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        [class.opacity-50]="disabled"
        [disabled]="disabled">
        <span [class.text-muted-foreground]="!selectedId">
          {{ selectedLabel || placeholder }}
        </span>
        <svg class="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      <!-- Clear button -->
      <button *ngIf="selectedId && !disabled" type="button" (click)="clear()"
        class="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>

      <!-- Dropdown -->
      <div *ngIf="isOpen"
        class="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-md">

        <div *ngIf="isLoading" class="flex items-center justify-center p-4">
          <div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>

        <div *ngIf="!isLoading && tree.length === 0" class="p-3 text-sm text-muted-foreground text-center">
          {{ emptyText }}
        </div>

        <ng-container *ngFor="let node of tree">
          <!-- Root option -->
          <button type="button" (click)="select(node.id, node.name)"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors text-left"
            [ngClass]="selectedId === node.id ? 'bg-accent' : ''">
            <svg class="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
            <span class="font-medium">{{ node.name }}</span>
            <svg *ngIf="selectedId === node.id" class="ml-auto h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </button>
          <!-- Children -->
          <button *ngFor="let child of node.children" type="button" (click)="select(child.id, child.name)"
            class="w-full flex items-center gap-2 pl-8 pr-3 py-2 text-sm text-foreground hover:bg-accent transition-colors text-left"
            [ngClass]="selectedId === child.id ? 'bg-accent' : ''">
            <svg class="h-3 w-3 text-muted-foreground/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <span>{{ child.name }}</span>
            <svg *ngIf="selectedId === child.id" class="ml-auto h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </button>
        </ng-container>
      </div>

      <!-- Backdrop -->
      <div *ngIf="isOpen" class="fixed inset-0 z-40" (click)="closeDropdown()"></div>
    </div>
  `,
})
export class CategoryPickerComponent implements OnInit {
  @Input() selectedId: string | null = null;
  @Input() placeholder = 'Select category';
  @Input() emptyText = 'No categories found';
  @Input() disabled = false;
  @Output() selectionChange = new EventEmitter<{ id: string | null; name: string | null }>();

  tree: CategoryTreeNode[] = [];
  isLoading = false;
  isOpen = false;
  selectedLabel: string | null = null;

  constructor(private categoriesService: CategoriesService) {}

  async ngOnInit(): Promise<void> {
    await this.loadTree();
    if (this.selectedId) {
      this.selectedLabel = this.findLabel(this.selectedId);
    }
  }

  private async loadTree(): Promise<void> {
    this.isLoading = true;
    try {
      const res = await this.categoriesService.tree();
      this.tree = res.data ?? [];
    } finally {
      this.isLoading = false;
    }
  }

  private findLabel(id: string): string | null {
    for (const node of this.tree) {
      if (node.id === id) return node.name;
      for (const child of node.children) {
        if (child.id === id) return child.name;
      }
    }
    return null;
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
  }

  closeDropdown(): void {
    this.isOpen = false;
  }

  select(id: string, name: string): void {
    this.selectedId = id;
    this.selectedLabel = name;
    this.isOpen = false;
    this.selectionChange.emit({ id, name });
  }

  clear(): void {
    this.selectedId = null;
    this.selectedLabel = null;
    this.selectionChange.emit({ id: null, name: null });
  }
}
