import { TestBed } from '@angular/core/testing';
import { QuickSearchService, QuickSearchResult } from './quick-search.service';
import { ArticleService } from './article.service';
import { LocationService } from './location.service';
import { LotService } from './lot.service';
import { ReceivingTaskService } from './receiving-task.service';
import { PickingTaskService } from './picking-task.service';

function makeRes<T>(data: T) {
  return { result: { success: true, endpoint_code: '' }, data };
}

describe('QuickSearchService', () => {
  let service: QuickSearchService;
  let articleSpy: jasmine.SpyObj<ArticleService>;
  let locationSpy: jasmine.SpyObj<LocationService>;
  let lotSpy: jasmine.SpyObj<LotService>;
  let receivingSpy: jasmine.SpyObj<ReceivingTaskService>;
  let pickingSpy: jasmine.SpyObj<PickingTaskService>;

  beforeEach(() => {
    articleSpy = jasmine.createSpyObj('ArticleService', ['search']);
    locationSpy = jasmine.createSpyObj('LocationService', ['getAll']);
    lotSpy = jasmine.createSpyObj('LotService', ['search']);
    receivingSpy = jasmine.createSpyObj('ReceivingTaskService', ['search']);
    pickingSpy = jasmine.createSpyObj('PickingTaskService', ['search']);

    TestBed.configureTestingModule({
      providers: [
        QuickSearchService,
        { provide: ArticleService, useValue: articleSpy },
        { provide: LocationService, useValue: locationSpy },
        { provide: LotService, useValue: lotSpy },
        { provide: ReceivingTaskService, useValue: receivingSpy },
        { provide: PickingTaskService, useValue: pickingSpy },
      ],
    });
    service = TestBed.inject(QuickSearchService);
  });

  it('aggregates results from all 5 services', async () => {
    const article = { id: '1', sku: 'ABC', name: 'Test', presentation: 'unit', track_by_lot: false, track_by_serial: false, track_expiration: false, created_at: '', updated_at: '' };
    const location = { id: 1, location_code: 'A-01', type: 'rack', is_active: true, created_at: '', updated_at: '' };
    const lot = { id: 1, lot_number: 'LOT-001', sku: 'ABC', quantity: 10, created_at: '', updated_at: '' };
    const receiving = { id: 1, task_id: 'RT-001', inbound_number: '001', created_by: '', assigned_to: '', status: 'open', priority: 'normal', items: [], created_at: '', updated_at: '' } as any;
    const picking = { id: 1, task_id: 'PT-001', document_number: '001', created_by: '', assigned_to: '', status: 'open', priority: 'normal', items: [], created_at: '', updated_at: '' } as any;

    articleSpy.search.and.returnValue(Promise.resolve(makeRes([article]) as any));
    locationSpy.getAll.and.returnValue(Promise.resolve(makeRes([location]) as any));
    lotSpy.search.and.returnValue(Promise.resolve(makeRes([lot]) as any));
    receivingSpy.search.and.returnValue(Promise.resolve(makeRes([receiving]) as any));
    pickingSpy.search.and.returnValue(Promise.resolve(makeRes([picking]) as any));

    const result = await service.search('ABC');

    expect(result.articles.length).toBe(1);
    expect(result.locations.length).toBe(1);
    expect(result.lots.length).toBe(1);
    expect(result.tasks.receiving.length).toBe(1);
    expect(result.tasks.picking.length).toBe(1);
  });

  it('returns empty result for empty query', async () => {
    const result = await service.search('');
    expect(result.articles).toEqual([]);
    expect(result.locations).toEqual([]);
    expect(result.lots).toEqual([]);
    expect(result.tasks.receiving).toEqual([]);
    expect(result.tasks.picking).toEqual([]);
  });

  it('uses cache for repeated queries', async () => {
    articleSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
    locationSpy.getAll.and.returnValue(Promise.resolve(makeRes([]) as any));
    lotSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
    receivingSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
    pickingSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));

    await service.search('test');
    await service.search('test');

    expect(articleSpy.search).toHaveBeenCalledTimes(1);
  });

  it('filters locations client-side by location_code', async () => {
    const matching = { id: 1, location_code: 'RACK-01', type: 'rack', is_active: true, created_at: '', updated_at: '' };
    const nonMatching = { id: 2, location_code: 'COLD-01', type: 'cold', is_active: true, created_at: '', updated_at: '' };

    articleSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
    locationSpy.getAll.and.returnValue(Promise.resolve(makeRes([matching, nonMatching]) as any));
    lotSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
    receivingSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
    pickingSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));

    const result = await service.search('RACK');
    expect(result.locations.length).toBe(1);
    expect(result.locations[0].location_code).toBe('RACK-01');
  });

  it('handles service failures gracefully', async () => {
    articleSpy.search.and.returnValue(Promise.reject(new Error('network error')));
    locationSpy.getAll.and.returnValue(Promise.resolve(makeRes([]) as any));
    lotSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
    receivingSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
    pickingSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));

    const result = await service.search('error-test');
    expect(result.articles).toEqual([]);
    expect(result.locations).toEqual([]);
  });
});
