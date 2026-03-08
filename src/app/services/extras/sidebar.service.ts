import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export const SIDEBAR_WIDTH_REM = 16; // 16rem like shadcn

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private desktopCollapsedSubject = new BehaviorSubject<boolean>(false);
  private mobileOpenSubject = new BehaviorSubject<boolean>(false);

  desktopCollapsed$ = this.desktopCollapsedSubject.asObservable();
  mobileOpen$ = this.mobileOpenSubject.asObservable();

  get desktopCollapsed(): boolean {
    return this.desktopCollapsedSubject.value;
  }

  get mobileOpen(): boolean {
    return this.mobileOpenSubject.value;
  }

  toggleDesktop(): void {
    this.desktopCollapsedSubject.next(!this.desktopCollapsedSubject.value);
  }

  setDesktopCollapsed(value: boolean): void {
    this.desktopCollapsedSubject.next(value);
  }

  toggleMobile(): void {
    this.mobileOpenSubject.next(!this.mobileOpenSubject.value);
  }

  openMobile(): void {
    this.mobileOpenSubject.next(true);
  }

  closeMobile(): void {
    this.mobileOpenSubject.next(false);
  }
}
