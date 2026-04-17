import { TestBed } from '@angular/core/testing';
import { ClientsService } from './clients.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('ClientsService', () => {
  let service: ClientsService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'patch', 'delete']);
    TestBed.configureTestingModule({
      providers: [ClientsService, { provide: FetchService, useValue: fetchSpy }],
    });
    service = TestBed.inject(ClientsService);
  });

  describe('list()', () => {
    it('calls GET /clients without query string when no filters', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list();
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('/clients');
      expect(url).not.toContain('?');
    });

    it('appends filter params as query string', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ type: 'supplier', is_active: true });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('type=supplier');
      expect(url).toContain('is_active=true');
    });
  });

  describe('getById()', () => {
    it('includes id in URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.getById('client-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('client-001') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST /clients with payload', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({} as any)));
      const payload = { type: 'supplier' as const, code: 'SUP-01', name: 'Proveedor', is_active: true };
      await service.create(payload);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: payload }));
    });
  });

  describe('update()', () => {
    it('calls PATCH /clients/:id with payload', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.update('client-001', { name: 'Updated' });
      const args = fetchSpy.patch.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('client-001');
      expect((args as any).values).toEqual({ name: 'Updated' });
    });
  });

  describe('softDelete()', () => {
    it('calls DELETE /clients/:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse(undefined)));
      await service.softDelete('client-001');
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('client-001') })
      );
    });
  });

  describe('linkSupplier()', () => {
    it('calls PATCH /receiving-tasks/:id/supplier with supplier_id', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse(undefined)));
      await service.linkSupplier('rt-001', 'sup-abc');
      const args = fetchSpy.patch.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('receiving-tasks/rt-001/supplier');
      expect((args as any).values).toEqual({ supplier_id: 'sup-abc' });
    });

    it('allows null supplier_id to unlink', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse(undefined)));
      await service.linkSupplier('rt-001', null);
      const args = fetchSpy.patch.calls.mostRecent().args[0];
      expect((args as any).values).toEqual({ supplier_id: null });
    });
  });

  describe('linkCustomer()', () => {
    it('calls PATCH /picking-tasks/:id/customer with customer_id', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse(undefined)));
      await service.linkCustomer('pt-001', 'cust-xyz');
      const args = fetchSpy.patch.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('picking-tasks/pt-001/customer');
      expect((args as any).values).toEqual({ customer_id: 'cust-xyz' });
    });
  });
});
