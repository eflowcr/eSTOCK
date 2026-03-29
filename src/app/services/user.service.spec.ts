import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('UserService', () => {
  let service: UserService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'put', 'delete', 'download']);

    TestBed.configureTestingModule({
      providers: [UserService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(UserService);
  });

  // ─── getAll ───────────────────────────────────────────────────────────────

  describe('getAll()', () => {
    it('calls GET /users/', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getAll();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/users') })
      );
    });
  });

  // ─── getById ──────────────────────────────────────────────────────────────

  describe('getById()', () => {
    it('calls GET /users/:id', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({})));
      await service.getById('user-123');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('user-123') })
      );
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /users/ with user data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      await service.create({ email: 'test@estock.com' });
      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({ values: jasmine.objectContaining({ email: 'test@estock.com' }) })
      );
    });
  });

  // ─── register ─────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('calls POST /users/register', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      await service.register({ email: 'test@estock.com' });
      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/register') })
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /users/:id with data', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({})));
      await service.update('user-abc', { email: 'new@estock.com' });
      const args = fetchSpy.put.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('user-abc');
      expect((args as any).values).toEqual(jasmine.objectContaining({ email: 'new@estock.com' }));
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /users/:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse({})));
      await service.delete('user-del');
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('user-del') })
      );
    });
  });

  // ─── updatePassword ───────────────────────────────────────────────────────

  describe('updatePassword()', () => {
    it('calls PUT /users/:id/password', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({})));
      await service.updatePassword('user-pwd', 'newP@ss1');
      const args = fetchSpy.put.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('user-pwd/password');
      expect((args as any).values).toEqual({ newPassword: 'newP@ss1' });
    });
  });

  // ─── importFile ───────────────────────────────────────────────────────────

  describe('importFile()', () => {
    it('calls POST /users/import with FormData', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      const file = new File(['data'], 'users.xlsx');
      await service.importFile(file);
      const args = fetchSpy.post.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('/import');
      expect((args as any).values instanceof FormData).toBeTrue();
    });
  });

  // ─── exportFile ───────────────────────────────────────────────────────────

  describe('exportFile()', () => {
    it('calls download with xlsx format by default', async () => {
      const blob = new Blob(['binary']);
      fetchSpy.download.and.returnValue(Promise.resolve(blob));
      const result = await service.exportFile();
      expect(fetchSpy.download).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('format=xlsx') })
      );
      expect(result).toBe(blob);
    });

    it('uses provided format', async () => {
      fetchSpy.download.and.returnValue(Promise.resolve(new Blob()));
      await service.exportFile('csv');
      expect(fetchSpy.download).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('format=csv') })
      );
    });
  });
});
