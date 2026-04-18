import { QuickSearchService } from './quick-search.service';
import { ArticleService } from './article.service';
import { LocationService } from './location.service';
import { LotService } from './lot.service';
import { ReceivingTaskService } from './receiving-task.service';
import { PickingTaskService } from './picking-task.service';

function makeRes<T>(data: T) {
  return { result: { success: true, endpoint_code: '' }, data };
}

function makeService(): {
  service: QuickSearchService;
  articleSpy: jasmine.SpyObj<ArticleService>;
  locationSpy: jasmine.SpyObj<LocationService>;
  lotSpy: jasmine.SpyObj<LotService>;
  receivingSpy: jasmine.SpyObj<ReceivingTaskService>;
  pickingSpy: jasmine.SpyObj<PickingTaskService>;
} {
  const articleSpy = jasmine.createSpyObj<ArticleService>('ArticleService', ['search']);
  const locationSpy = jasmine.createSpyObj<LocationService>('LocationService', ['getAll']);
  const lotSpy = jasmine.createSpyObj<LotService>('LotService', ['search']);
  const receivingSpy = jasmine.createSpyObj<ReceivingTaskService>('ReceivingTaskService', ['search']);
  const pickingSpy = jasmine.createSpyObj<PickingTaskService>('PickingTaskService', ['search']);

  const service = new QuickSearchService(
    articleSpy as any,
    locationSpy as any,
    lotSpy as any,
    receivingSpy as any,
    pickingSpy as any,
  );

  return { service, articleSpy, locationSpy, lotSpy, receivingSpy, pickingSpy };
}

function setupEmpty(spies: ReturnType<typeof makeService>) {
  spies.articleSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
  spies.locationSpy.getAll.and.returnValue(Promise.resolve(makeRes([]) as any));
  spies.lotSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
  spies.receivingSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
  spies.pickingSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
}

describe('QuickSearchService', () => {
  it('aggregates results from all 5 services', async () => {
    const { service, articleSpy, locationSpy, lotSpy, receivingSpy, pickingSpy } = makeService();

    const article = { id: '1', sku: 'ABC', name: 'Test', presentation: 'unit', track_by_lot: false, track_by_serial: false, track_expiration: false, created_at: '', updated_at: '' };
    // Location code must match query 'ABC' for the client-side filter to include it
    const location = { id: 1, location_code: 'ABC-01', type: 'rack', is_active: true, created_at: '', updated_at: '' };
    const lot = { id: 1, lot_number: 'LOT-001', sku: 'ABC', quantity: 10, created_at: '', updated_at: '' };
    const receiving = { id: 1, task_id: 'RT-001', inbound_number: '001', created_by: '', assigned_to: '', status: 'open', priority: 'normal', items: [] } as any;
    const picking = { id: '1', task_id: 'PT-001', created_by: '', assigned_to: '', status: 'open', priority: 'normal', items: [] } as any;

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
    const { service } = makeService();
    const result = await service.search('');
    expect(result.articles).toEqual([]);
    expect(result.locations).toEqual([]);
    expect(result.lots).toEqual([]);
    expect(result.tasks.receiving).toEqual([]);
    expect(result.tasks.picking).toEqual([]);
  });

  it('returns empty result for whitespace-only query', async () => {
    const { service } = makeService();
    const result = await service.search('   ');
    expect(result.articles).toEqual([]);
  });

  it('uses cache for repeated queries', async () => {
    const spies = makeService();
    const { service, articleSpy } = spies;
    setupEmpty(spies);

    await service.search('test');
    await service.search('test');

    expect(articleSpy.search).toHaveBeenCalledTimes(1);
  });

  it('filters locations client-side by location_code', async () => {
    const spies = makeService();
    const { service, locationSpy } = spies;

    const matching = { id: 1, location_code: 'RACK-01', type: 'rack', is_active: true, created_at: '', updated_at: '' };
    const nonMatching = { id: 2, location_code: 'COLD-01', type: 'cold', is_active: true, created_at: '', updated_at: '' };

    spies.articleSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
    locationSpy.getAll.and.returnValue(Promise.resolve(makeRes([matching, nonMatching]) as any));
    spies.lotSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
    spies.receivingSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
    spies.pickingSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));

    const result = await service.search('RACK');
    expect(result.locations.length).toBe(1);
    expect(result.locations[0].location_code).toBe('RACK-01');
  });

  it('handles service failures gracefully', async () => {
    const spies = makeService();
    const { service, locationSpy } = spies;

    spies.articleSpy.search.and.returnValue(Promise.reject(new Error('network error')));
    locationSpy.getAll.and.returnValue(Promise.resolve(makeRes([]) as any));
    spies.lotSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
    spies.receivingSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));
    spies.pickingSpy.search.and.returnValue(Promise.resolve(makeRes([]) as any));

    const result = await service.search('error-test');
    expect(result.articles).toEqual([]);
    expect(result.locations).toEqual([]);
  });

  it('invalidate clears cache', async () => {
    const spies = makeService();
    const { service, articleSpy } = spies;
    setupEmpty(spies);

    await service.search('test');
    service.invalidate();
    await service.search('test');

    expect(articleSpy.search).toHaveBeenCalledTimes(2);
  });
});
