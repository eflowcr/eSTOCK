import { TestBed } from '@angular/core/testing';
import { ReceivingTaskService } from './receiving-task.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('ReceivingTaskService', () => {
  let service: ReceivingTaskService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'put']);

    TestBed.configureTestingModule({
      providers: [ReceivingTaskService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(ReceivingTaskService);
  });

  describe('getAll()', () => {
    it('calls GET /receiving-tasks/', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getAll();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('receiving-tasks') })
      );
    });
  });

  describe('getById()', () => {
    it('includes id in URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.getById(10);
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('10') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST with task data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      const task = { inbound_number: 'IN-001', items: [] } as any;
      await service.create(task);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: task }));
    });
  });

  describe('update()', () => {
    it('calls PUT /:id with data', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({})));
      await service.update(10, { status: 'completed' } as any);
      expect(fetchSpy.put).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('10') })
      );
    });
  });

  describe('search()', () => {
    it('appends defined params', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.search({ status: 'open', inbound_number: 'IN-001' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('status=open');
      expect(url).toContain('inbound_number=IN-001');
    });

    it('no query string when all params empty', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.search({});
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).not.toContain('?');
    });
  });

  describe('import()', () => {
    it('calls POST /receiving-tasks/import with FormData', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      const file = new File(['data'], 'receiving.xlsx');
      await service.import(file);
      const args = fetchSpy.post.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('/import');
      expect((args as any).values instanceof FormData).toBeTrue();
    });
  });
});
