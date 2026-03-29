import { TestBed } from '@angular/core/testing';
import { PickingTaskService } from './picking-task.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('PickingTaskService', () => {
  let service: PickingTaskService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'put', 'patch']);

    TestBed.configureTestingModule({
      providers: [PickingTaskService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(PickingTaskService);
  });

  describe('getAll()', () => {
    it('calls GET /picking-tasks/', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getAll();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('picking-tasks') })
      );
    });
  });

  describe('getById()', () => {
    it('includes id in URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.getById('pt-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('pt-001') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST with task data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      const task = { outbound_number: 'OUT-001', items: [] } as any;
      await service.create(task);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: task }));
    });
  });

  describe('update()', () => {
    it('calls PUT /:id with data', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({})));
      await service.update('pt-001', { status: 'completed' } as any);
      expect(fetchSpy.put).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('pt-001') })
      );
    });
  });

  describe('start()', () => {
    it('calls PATCH /:id/start with empty body', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse({})));
      await service.start('pt-001');
      const args = fetchSpy.patch.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('pt-001/start');
      expect((args as any).values).toEqual({});
    });
  });

  describe('cancel()', () => {
    it('calls PATCH /:id/cancel with empty body', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse({})));
      await service.cancel('pt-001');
      const args = fetchSpy.patch.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('pt-001/cancel');
      expect((args as any).values).toEqual({});
    });
  });

  describe('search()', () => {
    it('appends defined params', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.search({ status: 'open', outbound_number: 'OUT-001' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('status=open');
      expect(url).toContain('outbound_number=OUT-001');
    });

    it('no query string when all params empty', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.search({});
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).not.toContain('?');
    });
  });

  describe('import()', () => {
    it('calls POST /picking-tasks/import with FormData', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      const file = new File(['data'], 'tasks.xlsx');
      await service.import(file);
      const args = fetchSpy.post.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('/import');
      expect((args as any).values instanceof FormData).toBeTrue();
    });
  });

  describe('export()', () => {
    it('calls GET /picking-tasks/export', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({})));
      await service.export();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/export') })
      );
    });
  });
});
