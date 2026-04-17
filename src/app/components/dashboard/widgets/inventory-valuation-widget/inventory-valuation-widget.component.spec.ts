import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { provideRouter } from '@angular/router';
import { InventoryValuationWidgetComponent } from './inventory-valuation-widget.component';
import { InventoryValuationService } from '@app/services/inventory-valuation.service';
import { LanguageService } from '@app/services/extras/language.service';
import { InventoryValuation } from '@app/models/inventory-valuation.model';

const mockValuation: InventoryValuation = {
  total_value: 12500,
  breakdown: [
    { id: '1', label: 'SKU-001', total_value: 7000, quantity: 20 },
    { id: '2', label: 'SKU-002', total_value: 3500, quantity: 10 },
    { id: '3', label: 'SKU-003', total_value: 2000, quantity: 5 },
  ],
  group_by: 'article',
};

describe('InventoryValuationWidgetComponent', () => {
  let component: InventoryValuationWidgetComponent;
  let fixture: ComponentFixture<InventoryValuationWidgetComponent>;
  let valuationSpy: jasmine.SpyObj<InventoryValuationService>;
  let langSpy: jasmine.SpyObj<LanguageService>;

  beforeEach(async () => {
    valuationSpy = jasmine.createSpyObj('InventoryValuationService', ['get', 'invalidateCache']);
    langSpy = jasmine.createSpyObj('LanguageService', ['t']);
    langSpy.t.and.callFake((k: string) => k);

    valuationSpy.get.and.returnValue(
      Promise.resolve({ result: { success: true, message: 'ok' }, data: mockValuation }) as any
    );

    await TestBed.configureTestingModule({
      imports: [InventoryValuationWidgetComponent, CommonModule, RouterModule],
      providers: [
        provideRouter([]),
        { provide: InventoryValuationService, useValue: valuationSpy },
        { provide: LanguageService, useValue: langSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryValuationWidgetComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render total value after load', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.valuation?.total_value).toBe(12500);
    expect(component.isLoading).toBeFalse();
  });

  it('topBreakdown returns first 3 items', async () => {
    await component.ngOnInit();
    expect(component.topBreakdown.length).toBe(3);
  });

  it('should call service again on groupBy change', async () => {
    await component.ngOnInit();
    valuationSpy.get.and.returnValue(
      Promise.resolve({ result: { success: true, message: 'ok' }, data: { ...mockValuation, group_by: 'location' } }) as any
    );

    await component.onGroupByChange('location');
    expect(valuationSpy.get).toHaveBeenCalledWith('location');
  });

  it('should set hasError on failure', async () => {
    valuationSpy.get.and.returnValue(Promise.resolve({ result: { success: false, message: 'err' }, data: null as any }) as any);
    await component.load();
    expect(component.hasError).toBeTrue();
  });

  it('formatCurrency formats CRC correctly', () => {
    const formatted = component.formatCurrency(1000);
    expect(formatted).toContain('1');
  });
});
