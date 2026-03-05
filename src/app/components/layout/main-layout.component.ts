import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { AlertComponent } from '../shared/extras/alert/alert.component';
import { SidebarService } from '@app/services';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent, AlertComponent],
  template: `
    <div class="flex min-h-screen w-full bg-background">
      <app-alert></app-alert>
      <app-sidebar></app-sidebar>
      <div
        class="flex flex-1 flex-col transition-[margin] duration-200 ease-linear"
        [class.md:ml-64]="!sidebarCollapsed"
      >
        <header class="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4 sticky top-0 z-30 bg-background">
          <app-topbar></app-topbar>
        </header>
        <main class="flex flex-1 flex-col gap-4 p-4 pt-0">
          <ng-content></ng-content>
        </main>
      </div>
    </div>
  `,
  styles: []
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  private sub?: Subscription;

  constructor(@Inject(SidebarService) private sidebarService: SidebarService) {}

  ngOnInit(): void {
    this.sub = this.sidebarService.collapsed$.subscribe((c: boolean) => (this.sidebarCollapsed = c));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
