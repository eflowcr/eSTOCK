import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AttentionRequiredComponent } from './attention-required.component';
import { StockAlertService } from '@app/services/stock-alert.service';
import { LotService } from '@app/services/lot.service';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { PickingTaskService } from '@app/services/picking-task.service';
import { LanguageService } from '@app/services/extras/language.service';

function ok(data: any) {
  return Promise.resolve({ result: { success: true, message: 'ok' }, data }) as any;
}

describe('AttentionRequiredComponent', () => {
  let component: AttentionRequiredComponent;
  let fixture: ComponentFixture<AttentionRequiredComponent>;
  let alertSpy: jasmine.SpyObj<StockAlertService>;
  let lotSpy: jasmine.SpyObj<LotService>;
  let receivingSpy: jasmine.SpyObj<ReceivingTaskService>;
  let pickingSpy: jasmine.SpyObj<PickingTaskService>;
  let langSpy: jasmine.SpyObj<LanguageService>;

  beforeEach(async () => {
    alertSpy = jasmine.createSpyObj('StockAlertService', ['getAll']);
    lotSpy = jasmine.createSpyObj('LotService', ['getAll']);
    receivingSpy = jasmine.createSpyObj('ReceivingTaskService', ['search', 'getAll', 'getById', 'create', 'update', 'import']);
    pickingSpy = jasmine.createSpyObj('PickingTaskService', ['search', 'getAll', 'getById', 'create', 'update']);
    langSpy = jasmine.createSpyObj('LanguageService', ['t']);
    langSpy.t.and.callFake((k: string) => k);

    alertSpy.getAll.and.returnValue(ok([]));
    lotSpy.getAll.and.returnValue(ok([]));
    receivingSpy.search.and.returnValue(ok([]));
    pickingSpy.search.and.returnValue(ok([]));

    await TestBed.configureTestingModule({
      imports: [AttentionRequiredComponent, CommonModule, RouterModule],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: StockAlertService, useValue: alertSpy },
        { provide: LotService, useValue: lotSpy },
        { provide: ReceivingTaskService, useValue: receivingSpy },
        { provide: PickingTaskService, useValue: pickingSpy },
        { provide: LanguageService, useValue: langSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AttentionRequiredComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show 4 sub-cards', () => {
    expect(component.subCards.length).toBe(4);
  });

  it('should load with empty states', async () => {
    await component.ngOnInit();
    fixture.detectChanges();

    expect(component.expiringLots.items.length).toBe(0);
    expect(component.lowStock.items.length).toBe(0);
    expect(component.openTasks.items.length).toBe(0);
    expect(component.discrepancies.items.length).toBe(0);
  });

  it('should populate low stock from alerts', async () => {
    alertSpy.getAll.and.returnValue(ok([
      {
        id: 'a1', sku: 'SKU-X', alert_type: 'low_stock', is_resolved: false,
        current_stock: 5, recommended_stock: 20, alert_level: 'critical',
        message: '', created_at: new Date().toISOString(),
      }
    ]));

    await component.ngOnInit();
    expect(component.lowStock.items.length).toBe(1);
    expect(component.lowStock.items[0].urgency).toBe('critical');
  });

  it('urgencyClass returns correct class per urgency', () => {
    expect(component.urgencyClass('critical')).toContain('red');
    expect(component.urgencyClass('warning')).toContain('amber');
    expect(component.urgencyClass('info')).toContain('blue');
  });

  it('refresh() reloads data', async () => {
    await component.ngOnInit();
    await component.refresh();
    expect(alertSpy.getAll).toHaveBeenCalledTimes(2);
  });
});
