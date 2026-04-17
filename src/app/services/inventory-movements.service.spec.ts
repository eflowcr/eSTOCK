import { TestBed } from '@angular/core/testing';
import { InventoryMovementsService } from './inventory-movements.service';
import { FetchService } from './extras/fetch.service';
import { InventoryMovement } from '@app/models/inventory-movement.model';

function mockMovement(overrides: Partial<InventoryMovement> = {}): InventoryMovement {
  return {
    id: 'mv-1',
    sku: 'SKU-001',
    location_code: 'A1',
    quantity: 10,
    movement_type: 'INBOUND',
    reference_type: 'receiving_task',
    reference_id: 'rt-1',
    unit_cost: 100,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function mockResponse(data: any) {
  return Promise.resolve({ result: { success: true, message: 'ok' }, data }) as any;
}

describe('InventoryMovementsService', () => {
  let service: InventoryMovementsService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'patch', 'delete']);
    TestBed.configureTestingModule({
      providers: [
        InventoryMovementsService,
        { provide: FetchService, useValue: fetchSpy },
      ],
    });
    service = TestBed.inject(InventoryMovementsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all movements', async () => {
    fetchSpy.get.and.returnValue(mockResponse([mockMovement()]));
    const response = await service.getAll();
    expect(response.result.success).toBeTrue();
    expect(response.data?.length).toBe(1);
  });

  it('getMovementsByMonth returns correct buckets count', async () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const movements = [
      mockMovement({ movement_type: 'INBOUND', reference_type: 'receiving_task', unit_cost: 50, quantity: 10, created_at: `${thisMonth}-15T00:00:00Z` }),
      mockMovement({ movement_type: 'OUTBOUND', reference_type: 'picking_task', unit_cost: 50, quantity: 5, created_at: `${thisMonth}-16T00:00:00Z` }),
      mockMovement({ movement_type: 'ADJUSTMENT', reference_type: 'adjustment', unit_cost: null, quantity: 2, created_at: `${thisMonth}-17T00:00:00Z` }),
    ];
    fetchSpy.get.and.returnValue(mockResponse(movements));

    const result = await service.getMovementsByMonth(6);

    expect(result.length).toBe(6);
    const current = result[result.length - 1];
    expect(current.receiving).toBe(500);
    expect(current.picking).toBe(250);
    expect(current.adjustment).toBe(2);
  });

  it('getMovementsByMonth returns empty months when no data', async () => {
    fetchSpy.get.and.returnValue(mockResponse([]));
    const result = await service.getMovementsByMonth(3);
    expect(result.length).toBe(3);
    expect(result.every(m => m.receiving === 0 && m.picking === 0 && m.adjustment === 0)).toBeTrue();
  });

  it('aggregation skips movements outside the 6-month window', async () => {
    fetchSpy.get.and.returnValue(mockResponse([
      mockMovement({ movement_type: 'INBOUND', reference_type: 'receiving_task', unit_cost: 100, quantity: 5, created_at: '2000-01-01T00:00:00Z' }),
    ]));
    const result = await service.getMovementsByMonth(6);
    expect(result.every(m => m.receiving === 0)).toBeTrue();
  });
});
