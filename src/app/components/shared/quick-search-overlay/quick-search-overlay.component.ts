import {
  Component,
  OnDestroy,
  OnInit,
  HostListener,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuickSearchService, QuickSearchResult } from '@app/services/quick-search.service';
import { LanguageService } from '@app/services/extras/language.service';
import { ExpiryClassPipe } from '@app/shared/pipes/expiry-class.pipe';
import { Article } from '@app/models/article.model';
import { Location } from '@app/models/location.model';
import { Lot } from '@app/models/lot.model';
import { ReceivingTask } from '@app/models/receiving-task.model';
import { PickingTask } from '@app/models/picking-task.model';

type ResultItem =
  | { kind: 'article'; data: Article }
  | { kind: 'location'; data: Location }
  | { kind: 'lot'; data: Lot }
  | { kind: 'receiving'; data: ReceivingTask }
  | { kind: 'picking'; data: PickingTask };

@Component({
  selector: 'app-quick-search-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule, ExpiryClassPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="open">
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        (click)="close()"
        aria-hidden="true"
      ></div>

      <!-- Modal -->
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="t('quick_search.placeholder')"
        class="fixed left-1/2 top-[12%] z-50 w-full max-w-xl -translate-x-1/2 rounded-2xl border border-border bg-popover shadow-2xl"
      >
        <!-- Input row -->
        <div class="flex items-center gap-3 border-b border-border px-4 py-3">
          <svg class="h-4 w-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
          </svg>
          <input
            #searchInput
            type="text"
            [(ngModel)]="query"
            (ngModelChange)="onQueryChange($event)"
            [placeholder]="t('quick_search.placeholder')"
            class="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autocomplete="off"
            spellcheck="false"
          />
          <span class="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">ESC</span>
          <div *ngIf="loading" class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-muted border-t-foreground"></div>
        </div>

        <!-- Results -->
        <div class="max-h-[28rem] overflow-y-auto py-2" #resultsList>
          <!-- Empty state -->
          <div
            *ngIf="!loading && query.trim() && totalCount === 0"
            class="px-4 py-8 text-center text-sm text-muted-foreground"
          >{{ t('quick_search.empty') }}</div>

          <!-- Hint state -->
          <div
            *ngIf="!query.trim()"
            class="px-4 py-8 text-center text-sm text-muted-foreground"
          >{{ t('quick_search.shortcut_hint') }}</div>

          <!-- Articles -->
          <ng-container *ngIf="results.articles.length">
            <div class="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {{ t('quick_search.section.articles') }}
            </div>
            <button
              *ngFor="let item of results.articles; let i = index"
              type="button"
              (click)="navigate({ kind: 'article', data: item })"
              (mouseenter)="setActive(flatIndex({ kind: 'article', data: item }))"
              [class.bg-accent]="activeIndex === flatIndex({ kind: 'article', data: item })"
              class="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs font-semibold text-foreground">{{ item.sku }}</span>
                  <span class="truncate text-sm text-foreground">{{ item.name }}</span>
                  <span *ngIf="item.category?.name" class="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">{{ item.category?.name }}</span>
                </div>
              </div>
              <svg class="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </ng-container>

          <!-- Locations -->
          <ng-container *ngIf="results.locations.length">
            <div class="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {{ t('quick_search.section.locations') }}
            </div>
            <button
              *ngFor="let item of results.locations"
              type="button"
              (click)="navigate({ kind: 'location', data: item })"
              (mouseenter)="setActive(flatIndex({ kind: 'location', data: item }))"
              [class.bg-accent]="activeIndex === flatIndex({ kind: 'location', data: item })"
              class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
            >
              <span class="font-mono text-xs font-semibold text-foreground">{{ item.location_code }}</span>
              <span *ngIf="item.description" class="truncate text-sm text-muted-foreground">{{ item.description }}</span>
              <svg class="ml-auto h-3 w-3 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </ng-container>

          <!-- Lots -->
          <ng-container *ngIf="results.lots.length">
            <div class="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {{ t('quick_search.section.lots') }}
            </div>
            <button
              *ngFor="let item of results.lots"
              type="button"
              (click)="navigate({ kind: 'lot', data: item })"
              (mouseenter)="setActive(flatIndex({ kind: 'lot', data: item }))"
              [class.bg-accent]="activeIndex === flatIndex({ kind: 'lot', data: item })"
              class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
            >
              <span class="font-mono text-xs font-semibold text-foreground">{{ item.lot_number }}</span>
              <span class="text-sm text-muted-foreground">{{ item.sku }}</span>
              <span
                *ngIf="item.expiration_date"
                class="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                [ngClass]="item.expiration_date | expiryClass"
              >{{ item.expiration_date | date:'dd/MM/yyyy' }}</span>
              <svg class="h-3 w-3 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </ng-container>

          <!-- Tasks -->
          <ng-container *ngIf="results.tasks.receiving.length || results.tasks.picking.length">
            <div class="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {{ t('quick_search.section.tasks') }}
            </div>
            <button
              *ngFor="let item of results.tasks.receiving"
              type="button"
              (click)="navigate({ kind: 'receiving', data: item })"
              (mouseenter)="setActive(flatIndex({ kind: 'receiving', data: item }))"
              [class.bg-accent]="activeIndex === flatIndex({ kind: 'receiving', data: item })"
              class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
            >
              <span class="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">REC</span>
              <span class="font-mono text-xs text-foreground">{{ item.task_id || item.inbound_number }}</span>
              <span class="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{{ item.status }}</span>
            </button>
            <button
              *ngFor="let item of results.tasks.picking"
              type="button"
              (click)="navigate({ kind: 'picking', data: item })"
              (mouseenter)="setActive(flatIndex({ kind: 'picking', data: item }))"
              [class.bg-accent]="activeIndex === flatIndex({ kind: 'picking', data: item })"
              class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
            >
              <span class="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">PICK</span>
              <span class="font-mono text-xs text-foreground">{{ item.task_id || item.document_number }}</span>
              <span class="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{{ item.status }}</span>
            </button>
          </ng-container>
        </div>

        <!-- Footer hint -->
        <div *ngIf="totalCount > 0" class="flex items-center gap-3 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          <span>↑↓ {{ t('quick_search.hint.navigate') }}</span>
          <span>↵ {{ t('quick_search.hint.select') }}</span>
          <span>ESC {{ t('quick_search.hint.close') }}</span>
        </div>
      </div>
    </ng-container>
  `,
})
export class QuickSearchOverlayComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  open = false;
  query = '';
  loading = false;
  results: QuickSearchResult = { articles: [], locations: [], lots: [], tasks: { receiving: [], picking: [] } };
  activeIndex = -1;

  private debounceTimer?: ReturnType<typeof setTimeout>;
  private flatItems: ResultItem[] = [];

  constructor(
    private quickSearchService: QuickSearchService,
    private languageService: LanguageService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    document.addEventListener('keydown', this.handleGlobalKeydown);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleGlobalKeydown);
    clearTimeout(this.debounceTimer);
  }

  private handleGlobalKeydown = (event: KeyboardEvent): void => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const modKey = isMac ? event.metaKey : event.ctrlKey;

    if (modKey && event.key === 'k') {
      event.preventDefault();
      this.toggleOpen();
      return;
    }

    if (!this.open) return;

    if (event.key === 'Escape') {
      this.close();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveActive(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveActive(-1);
      return;
    }

    if (event.key === 'Enter' && this.activeIndex >= 0) {
      event.preventDefault();
      const item = this.flatItems[this.activeIndex];
      if (item) this.navigate(item);
    }
  };

  toggleOpen(): void {
    if (this.open) {
      this.close();
    } else {
      this.open = true;
      this.cdr.markForCheck();
      setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
    }
  }

  close(): void {
    this.open = false;
    this.query = '';
    this.results = { articles: [], locations: [], lots: [], tasks: { receiving: [], picking: [] } };
    this.activeIndex = -1;
    this.flatItems = [];
    clearTimeout(this.debounceTimer);
    this.cdr.markForCheck();
  }

  onQueryChange(value: string): void {
    clearTimeout(this.debounceTimer);
    this.activeIndex = -1;
    if (!value.trim()) {
      this.results = { articles: [], locations: [], lots: [], tasks: { receiving: [], picking: [] } };
      this.flatItems = [];
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    this.debounceTimer = setTimeout(() => this.runSearch(value), 200);
  }

  private async runSearch(q: string): Promise<void> {
    try {
      const result = await this.quickSearchService.search(q);
      this.results = result;
      this.flatItems = this.buildFlatItems(result);
      this.activeIndex = this.flatItems.length > 0 ? 0 : -1;
    } catch {
      this.results = { articles: [], locations: [], lots: [], tasks: { receiving: [], picking: [] } };
      this.flatItems = [];
      this.activeIndex = -1;
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private buildFlatItems(r: QuickSearchResult): ResultItem[] {
    return [
      ...r.articles.map((d) => ({ kind: 'article' as const, data: d })),
      ...r.locations.map((d) => ({ kind: 'location' as const, data: d })),
      ...r.lots.map((d) => ({ kind: 'lot' as const, data: d })),
      ...r.tasks.receiving.map((d) => ({ kind: 'receiving' as const, data: d })),
      ...r.tasks.picking.map((d) => ({ kind: 'picking' as const, data: d })),
    ];
  }

  flatIndex(item: ResultItem): number {
    return this.flatItems.indexOf(item);
  }

  setActive(idx: number): void {
    this.activeIndex = idx;
  }

  moveActive(delta: number): void {
    if (this.flatItems.length === 0) return;
    const next = this.activeIndex + delta;
    if (next < 0) this.activeIndex = this.flatItems.length - 1;
    else if (next >= this.flatItems.length) this.activeIndex = 0;
    else this.activeIndex = next;
    this.cdr.markForCheck();
  }

  navigate(item: ResultItem): void {
    this.close();
    switch (item.kind) {
      case 'article':
        this.router.navigate(['/articles', (item.data as Article).sku]);
        break;
      case 'location':
        this.router.navigate(['/inventory'], { queryParams: { location: (item.data as Location).location_code } });
        break;
      case 'lot':
        this.router.navigate(['/lots', (item.data as Lot).id, 'trace']);
        break;
      case 'receiving':
        this.router.navigate(['/receiving-tasks'], { queryParams: { id: (item.data as ReceivingTask).id } });
        break;
      case 'picking':
        this.router.navigate(['/picking-tasks'], { queryParams: { id: (item.data as PickingTask).id } });
        break;
    }
  }

  get totalCount(): number {
    return (
      this.results.articles.length +
      this.results.locations.length +
      this.results.lots.length +
      this.results.tasks.receiving.length +
      this.results.tasks.picking.length
    );
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
