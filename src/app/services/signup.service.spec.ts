import { TestBed } from '@angular/core/testing';
import { SignupService } from './signup.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('SignupService', () => {
  let service: SignupService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['post']);

    TestBed.configureTestingModule({
      providers: [
        SignupService,
        { provide: FetchService, useValue: fetchSpy },
      ],
    });

    service = TestBed.inject(SignupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initiateSignup', () => {
    it('calls post with correct payload', async () => {
      const payload = {
        email: 'admin@acme.com',
        company_name: 'ACME Corp',
        tenant_slug: 'acme-corp',
        admin_name: 'Admin User',
        admin_password: 'SecurePass123!',
      };
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({ message: 'Signup initiated' })));

      const response = await service.initiateSignup(payload);

      expect(fetchSpy.post).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ values: payload }),
      );
      expect(response.result.success).toBeTrue();
    });
  });

  describe('verifySignup', () => {
    it('calls post with token in body', async () => {
      const token = 'abc123';
      const verifyData = { token: 'jwt-token', tenant_id: 'tenant1', email: 'a@b.com', name: 'Admin' };
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(verifyData)));

      const response = await service.verifySignup(token);

      expect(fetchSpy.post).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ values: { token } }),
      );
      expect(response.data.token).toBe('jwt-token');
    });
  });
});
