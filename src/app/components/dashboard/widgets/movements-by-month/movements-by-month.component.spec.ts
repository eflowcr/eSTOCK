import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MovementsByMonthComponent } from './movements-by-month.component';
import { InventoryMovementsService } from '@app/services/inventory-movements.service';
import { LanguageService } from '@app/services/extras/language.service';
import { MonthlyMovements } from '@app/models/inventory-movement.model';

const mockMonths: MonthlyMovements[] = [
  { month: '2026-01', receiving: 1000, picking: 500, adjustment: 100 },
  { month: '2026-02', receiving: 2000, picking: 800, adjustment: 200 },
  { month: '2026-03', receiving: 1500, picking: 600, adjustment: 50 },
  { month: '2026-04', receiving: 3000, picking: 1200, adjustment: 300 },
  { month: '2026-05', receiving: 0,    picking: 0,    adjustment: 0 },
  { month: '2026-06', receiving: 500,  picking: 200,  adjustment: 0 },
];

describe('MovementsByMonthComponent', () => {
  let component: MovementsByMonthComponent;
  let fixture: ComponentFixture<MovementsByMonthComponent>;
  let movementsSpy: jasmine.SpyObj<InventoryMovementsService>;
  let langSpy: jasmine.SpyObj<LanguageService>;

  beforeEach(async () => {
    movementsSpy = jasmine.createSpyObj('InventoryMovementsService', ['getMovementsByMonth', 'getAll']);
    langSpy = jasmine.createSpyObj('LanguageService', ['t']);
    langSpy.t.and.callFake((k: string) => k);

    movementsSpy.getMovementsByMonth.and.returnValue(Promise.resolve(mockMonths));

    await TestBed.configureTestingModule({
      imports: [MovementsByMonthComponent, CommonModule, RouterModule],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: InventoryMovementsService, useValue: movementsSpy },
        { provide: LanguageService, useValue: langSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MovementsByMonthComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load bars from service', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.bars.length).toBe(6);
    expect(component.isLoading).toBeFalse();
  });

  it('bar totals sum correctly', async () => {
    await component.ngOnInit();
    const bar = component.bars[0];
    expect(bar.total).toBe(1000 + 500 + 100);
  });

  it('bar with max value has 100% height', async () => {
    await component.ngOnInit();
    const maxBar = component.bars.reduce((a, b) => a.total > b.total ? a : b);
    const totalPct = maxBar.receivingPct + maxBar.pickingPct + maxBar.adjustmentPct;
    expect(totalPct).toBeCloseTo(100, 0);
  });

  it('formatCurrency returns M suffix for millions', () => {
    expect(component.formatCurrency(1_500_000)).toBe('₡1.5M');
  });

  it('formatCurrency returns K suffix for thousands', () => {
    expect(component.formatCurrency(2500)).toBe('₡3K');
  });

  it('should set hasError on service failure', async () => {
    movementsSpy.getMovementsByMonth.and.returnValue(Promise.reject('err'));
    await component.load();
    expect(component.hasError).toBeTrue();
  });
});
