import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { SidebarService } from '@app/services';
import { Subscription } from 'rxjs';
import { AlertComponent } from '../shared/extras/alert/alert.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent, AlertComponent],
  template: `
    <div class="flex min-h-screen w-full bg-background">
      <app-alert></app-alert>
      <app-sidebar></app-sidebar>
      <div
        class="flex flex-1 flex-col min-h-0 md:pl-3"
        [class.md:ml-64]="!desktopSidebarCollapsed"
      >
        <app-topbar></app-topbar>
        <main class="flex flex-1 flex-col min-h-0 gap-4 p-4">
          <ng-content></ng-content>
        </main>
      </div>
    </div>
  `,
  styles: [],
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  desktopSidebarCollapsed = false;
  private sub?: Subscription;

  constructor(@Inject(SidebarService) private sidebarService: SidebarService) {}

  ngOnInit(): void {
    this.sub = this.sidebarService.desktopCollapsed$.subscribe(
      (c: boolean) => (this.desktopSidebarCollapsed = c),
    );
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
