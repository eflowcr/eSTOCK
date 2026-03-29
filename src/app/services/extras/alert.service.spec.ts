import { TestBed } from '@angular/core/testing';
import { AlertService } from './alert.service';
import { toast } from 'ngx-sonner';

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AlertService] });
    service = TestBed.inject(AlertService);

    spyOn(toast, 'success');
    spyOn(toast, 'error');
    spyOn(toast, 'warning');
    spyOn(toast, 'info');
    spyOn(toast, 'dismiss');
  });

  describe('success()', () => {
    it('calls toast.success', () => {
      service.success('Item created');
      expect(toast.success).toHaveBeenCalled();
    });

    it('uses message as title when no title given', () => {
      service.success('Item created');
      const callArgs = (toast.success as jasmine.Spy).calls.mostRecent().args;
      expect(callArgs[0]).toBe('Item created');
    });
  });

  describe('error()', () => {
    it('calls toast.error', () => {
      service.error('Something failed');
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('warning()', () => {
    it('calls toast.warning', () => {
      service.warning('Low stock');
      expect(toast.warning).toHaveBeenCalled();
    });
  });

  describe('info()', () => {
    it('calls toast.info', () => {
      service.info('FYI');
      expect(toast.info).toHaveBeenCalled();
    });
  });

  describe('dismiss()', () => {
    it('calls toast.dismiss with id', () => {
      service.dismiss('toast-123');
      expect(toast.dismiss).toHaveBeenCalledWith('toast-123');
    });
  });

  describe('clear()', () => {
    it('calls toast.dismiss without id', () => {
      service.clear();
      expect(toast.dismiss).toHaveBeenCalledWith();
    });
  });

  describe('normalizeToastContent logic', () => {
    it('swaps message/title when message is a generic label', () => {
      // success('Success', 'Entity was created') → title='Success', desc='Entity was created'
      // But generic label logic: message 'success' is generic, title 'Entity was created' is not
      // So result: title=message('success'), desc=title('Entity was created') ... actually re-read
      // normalizeToastContent: if messageIsGeneric && !titleIsGeneric → { title: message, description: title }
      service.success('Success', 'Entity was created successfully');
      const callArgs = (toast.success as jasmine.Spy).calls.mostRecent().args;
      expect(callArgs[0]).toBe('Success');
      expect(callArgs[1].description).toBe('Entity was created successfully');
    });

    it('uses title as toast title when title is the meaningful text', () => {
      // success('Entity created', 'Success') → messageIsGeneric=false, titleIsGeneric=true
      // Default path: title=title, desc=message
      service.success('Entity created', 'Success');
      const callArgs = (toast.success as jasmine.Spy).calls.mostRecent().args;
      expect(callArgs[0]).toBe('Success');
      expect(callArgs[1].description).toBe('Entity created');
    });
  });
});
