import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AlertasTabComponent } from './alertas-tab.component';
import { StockAlertService } from '@app/services';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { StockAlert } from '@app/models/stock-alert.model';

const mockAlerts: StockAlert[] = [
  {
    id: 'a1',
    sku: 'SKU-1',
    alert_type: 'low_stock',
    current_stock: 2,
    recommended_stock: 10,
    alert_level: 'critical',
    message: 'Stock bajo',
    is_resolved: false,
    created_at: '2026-04-10T00:00:00Z',
  },
  {
    id: 'a2',
    sku: 'SKU-1',
    alert_type: 'expiration',
    current_stock: 5,
    recommended_stock: 5,
    alert_level: 'medium',
    message: 'Vence pronto',
    is_resolved: true,
    created_at: '2026-04-01T00:00:00Z',
    resolved_at: '2026-04-02T00:00:00Z',
  },
  {
    id: 'a3',
    sku: 'SKU-OTHER',
    alert_type: 'low_stock',
    current_stock: 0,
    recommended_stock: 5,
    alert_level: 'high',
    message: 'Otro SKU',
    is_resolved: false,
    created_at: '2026-04-11T00:00:00Z',
  },
];

const ok = <T>(data: T): any =>
  Promise.resolve({ result: { success: true, message: '', endpoint_code: '' }, data, envelope: {} });

describe('AlertasTabComponent', () => {
  let stockAlertService: jasmine.SpyObj<StockAlertService>;

  beforeEach(async () => {
    stockAlertService = jasmine.createSpyObj<StockAlertService>('StockAlertService', [
      'getAll',
      'analyze',
      'resolve',
    ]);
    stockAlertService.getAll.and.callFake((resolved: boolean) =>
      ok(mockAlerts.filter(a => a.is_resolved === resolved))
    );
    stockAlertService.resolve.and.returnValue(ok(null as any));
    stockAlertService.analyze.and.returnValue(
      ok({ message: 'ok', alerts: mockAlerts, summary: { total: 3, critical: 1, high: 1, medium: 1, expiring: 0 } })
    );

    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([]), HttpClientTestingModule, AlertasTabComponent],
      providers: [
        provideNoopAnimations(),
        { provide: StockAlertService, useValue: stockAlertService },
        { provide: AlertService, useValue: { success: jasmine.createSpy(), error: jasmine.createSpy() } },
        { provide: LanguageService, useValue: { translate: (k: string) => k, t: (k: string) => k } },
      ],
    }).compileComponents();
  });

  it('renders alerts filtered by SKU', fakeAsync(() => {
    const fixture = TestBed.createComponent(AlertasTabComponent);
    fixture.componentInstance.sku = 'SKU-1';
    fixture.detectChanges();
    tick();
    expect(fixture.componentInstance.alerts.length).toBe(2);
    expect(fixture.componentInstance.alerts.every(a => a.sku === 'SKU-1')).toBe(true);
  }));

  it('shows empty state when no alerts for SKU', fakeAsync(() => {
    const fixture = TestBed.createComponent(AlertasTabComponent);
    fixture.componentInstance.sku = 'SKU-UNKNOWN';
    fixture.detectChanges();
    tick();
    expect(fixture.componentInstance.alerts.length).toBe(0);
    fixture.detectChanges();
    const html: string = fixture.nativeElement.innerHTML;
    expect(html).toContain('article_detail.alertas.empty_title');
  }));

  it('calls analyze when run-analysis button is clicked', fakeAsync(() => {
    const fixture = TestBed.createComponent(AlertasTabComponent);
    fixture.componentInstance.sku = 'SKU-1';
    fixture.detectChanges();
    tick();
    fixture.componentInstance.analyze();
    tick();
    expect(stockAlertService.analyze).toHaveBeenCalled();
  }));

  it('resolve updates alert state locally', fakeAsync(() => {
    const fixture = TestBed.createComponent(AlertasTabComponent);
    fixture.componentInstance.sku = 'SKU-1';
    fixture.detectChanges();
    tick();
    fixture.componentInstance.resolve('a1');
    tick();
    const a1 = fixture.componentInstance.alerts.find(a => a.id === 'a1');
    expect(a1?.is_resolved).toBe(true);
  }));
});
