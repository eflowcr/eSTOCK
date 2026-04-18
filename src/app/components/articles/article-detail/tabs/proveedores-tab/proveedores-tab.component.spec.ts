import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ProveedoresTabComponent } from './proveedores-tab.component';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { LanguageService } from '@app/services/extras/language.service';
import { ReceivingTask } from '@app/models/receiving-task.model';

const makeTask = (over: Partial<ReceivingTask>): ReceivingTask => ({
  id: 1,
  task_id: 't1',
  inbound_number: 'IB-001',
  created_by: 'u',
  assigned_to: 'u',
  status: 'completed',
  priority: 'normal',
  items: [],
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
  ...over,
});

const ok = <T>(data: T): any =>
  Promise.resolve({ result: { success: true, message: '', endpoint_code: '' }, data, envelope: {} });

describe('ProveedoresTabComponent', () => {
  let receivingSvc: jasmine.SpyObj<ReceivingTaskService>;

  const setupTasks = (tasks: ReceivingTask[]) => {
    receivingSvc.getAll.and.returnValue(ok(tasks));
  };

  beforeEach(async () => {
    receivingSvc = jasmine.createSpyObj<ReceivingTaskService>('ReceivingTaskService', ['getAll']);

    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([]), HttpClientTestingModule, ProveedoresTabComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ReceivingTaskService, useValue: receivingSvc },
        { provide: LanguageService, useValue: { translate: (k: string) => k, t: (k: string) => k } },
      ],
    }).compileComponents();
  });

  it('shows last reception when a matching completed task exists', fakeAsync(() => {
    const task = makeTask({
      id: 5,
      inbound_number: 'IB-005',
      status: 'completed',
      completed_at: '2026-04-15T00:00:00Z',
      supplier: { id: 's1', code: 'ACME', name: 'Acme SA' },
      items: [{ sku: 'SKU-1', expected_qty: 10, received_qty: 10, location: 'A1' }],
    });
    setupTasks([task]);

    const fixture = TestBed.createComponent(ProveedoresTabComponent);
    fixture.componentInstance.sku = 'SKU-1';
    fixture.detectChanges();
    tick();
    expect(fixture.componentInstance.lastTask).toBeTruthy();
    expect(fixture.componentInstance.supplierName).toBe('Acme SA');
    expect(fixture.componentInstance.supplierCode).toBe('ACME');
    expect(fixture.componentInstance.lastQty).toBe(10);
  }));

  it('shows no-history placeholder when no matching task', fakeAsync(() => {
    setupTasks([
      makeTask({ status: 'completed', items: [{ sku: 'OTHER', expected_qty: 1, received_qty: 1, location: 'A1' }] }),
    ]);
    const fixture = TestBed.createComponent(ProveedoresTabComponent);
    fixture.componentInstance.sku = 'SKU-1';
    fixture.detectChanges();
    tick();
    expect(fixture.componentInstance.lastTask).toBeNull();
  }));

  it('ignores non-completed tasks', fakeAsync(() => {
    setupTasks([
      makeTask({ status: 'in_progress', items: [{ sku: 'SKU-1', expected_qty: 1, received_qty: 1, location: 'A1' }] }),
    ]);
    const fixture = TestBed.createComponent(ProveedoresTabComponent);
    fixture.componentInstance.sku = 'SKU-1';
    fixture.detectChanges();
    tick();
    expect(fixture.componentInstance.lastTask).toBeNull();
  }));

  it('renders S3 roadmap placeholder', fakeAsync(() => {
    setupTasks([]);
    const fixture = TestBed.createComponent(ProveedoresTabComponent);
    fixture.componentInstance.sku = 'SKU-1';
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const html: string = fixture.nativeElement.innerHTML;
    expect(html).toContain('article_detail.proveedores.s3_title');
    expect(html).toContain('article_detail.proveedores.s3_feature_1');
  }));

  it('picks the most recent completed task when multiple match', fakeAsync(() => {
    setupTasks([
      makeTask({
        id: 1,
        inbound_number: 'IB-1',
        status: 'completed',
        completed_at: '2026-03-01T00:00:00Z',
        supplier: { id: 's1', code: 'OLD', name: 'Old' },
        items: [{ sku: 'SKU-1', expected_qty: 1, received_qty: 1, location: 'A1' }],
      }),
      makeTask({
        id: 2,
        inbound_number: 'IB-2',
        status: 'completed',
        completed_at: '2026-04-10T00:00:00Z',
        supplier: { id: 's2', code: 'NEW', name: 'New' },
        items: [{ sku: 'SKU-1', expected_qty: 2, received_qty: 2, location: 'A1' }],
      }),
    ]);

    const fixture = TestBed.createComponent(ProveedoresTabComponent);
    fixture.componentInstance.sku = 'SKU-1';
    fixture.detectChanges();
    tick();
    expect(fixture.componentInstance.supplierCode).toBe('NEW');
  }));
});
