import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MainLayoutComponent } from './main-layout.component';
import { SidebarService } from '@app/services';
import { LanguageService } from '@app/services/extras/language.service';
import { NavigationService } from '@app/services/extras/navigation.service';
import { AuthService } from '../../services/auth.service';
import { AlertService } from '../../services/extras/alert.service';
import { AuthorizationService } from '../../services/extras/authorization.service';
import { TrialService } from '@app/services/trial.service';
import { UserPreferencesService } from '@app/services/user-preferences.service';

class StubLanguageService { t(k: string) { return k; } }
class StubNavigationService { getItems() { return []; } }
class StubAuthService {
  authState$ = new BehaviorSubject<any>(null);
  getCurrentUser() { return null; }
  logout() { return Promise.resolve(); }
}
class StubAlertService { success(){} error(){} }
class StubAuthorizationService { getCurrentUser() { return null; } }
class StubTrialService { getCurrentTrialStatus() { return Promise.resolve(null); } }
class StubUserPreferencesService { load() {} }

@Component({
  standalone: true,
  imports: [MainLayoutComponent],
  template: `<app-main-layout><div class="p-4">content</div></app-main-layout>`,
})
class HostComponent {}

describe('MainLayoutComponent — S3.7 W1 mobile responsive', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        SidebarService,
        { provide: LanguageService, useClass: StubLanguageService },
        { provide: NavigationService, useClass: StubNavigationService },
        { provide: AuthService, useClass: StubAuthService },
        { provide: AlertService, useClass: StubAlertService },
        { provide: AuthorizationService, useClass: StubAuthorizationService },
        { provide: TrialService, useClass: StubTrialService },
        { provide: UserPreferencesService, useClass: StubUserPreferencesService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders main without ml-64 class on mobile (md:ml-64 only kicks in ≥768px)', () => {
    const wrapper = fixture.nativeElement.querySelector('main')?.parentElement as HTMLElement;
    expect(wrapper).toBeTruthy();
    // The mobile-relevant guarantee: there is NO non-prefixed `ml-64` (mobile would inherit it).
    expect(wrapper.className).not.toContain(' ml-64');
    expect(wrapper.className).not.toMatch(/^ml-64/);
    // And it has min-w-0 so flex children can shrink (S3.7 W1 fix for B20).
    expect(wrapper.className).toContain('min-w-0');
  });

  it('main element has min-w-0 to prevent horizontal overflow from children', () => {
    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    expect(main).toBeTruthy();
    expect(main.className).toContain('min-w-0');
  });
});
