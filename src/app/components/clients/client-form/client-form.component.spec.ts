import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ClientFormComponent } from './client-form.component';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';

const okResponse = (data: any) => Promise.resolve({ result: { success: true }, data });

const mockClientsService = {
  create: () => okResponse({}),
  update: () => okResponse({}),
};
const mockAlertService = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
const mockLanguageService = { t: (key: string) => key };

describe('ClientFormComponent — validations', () => {
  let component: ClientFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule, HttpClientTestingModule, ClientFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ClientsService, useValue: mockClientsService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ClientFormComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('form is invalid when required fields are empty', () => {
    component.form.patchValue({ code: '', name: '' });
    expect(component.form.invalid).toBe(true);
  });

  it('code field is required', () => {
    component.form.patchValue({ code: '', name: 'Test', type: 'supplier' });
    expect(component.form.get('code')?.errors?.['required']).toBeTruthy();
  });

  it('name field is required', () => {
    component.form.patchValue({ code: 'C001', name: '', type: 'supplier' });
    expect(component.form.get('name')?.errors?.['required']).toBeTruthy();
  });

  it('type field is required', () => {
    component.form.patchValue({ code: 'C001', name: 'Test', type: '' });
    expect(component.form.get('type')?.errors?.['required']).toBeTruthy();
  });

  it('email field validates format', () => {
    component.form.patchValue({ email: 'not-an-email' });
    expect(component.form.get('email')?.errors?.['email']).toBeTruthy();
  });

  it('email accepts valid format', () => {
    component.form.patchValue({ email: 'test@company.com' });
    expect(component.form.get('email')?.errors?.['email']).toBeFalsy();
  });

  it('form is valid with required fields filled', () => {
    component.form.patchValue({ type: 'supplier', code: 'PROV-001', name: 'Test Supplier', email: '' });
    expect(component.form.valid).toBe(true);
  });

  it('isEditMode is false by default', () => {
    expect(component.isEditMode).toBe(false);
  });

  it('isFieldInvalid returns false when field is untouched', () => {
    expect(component.isFieldInvalid('code')).toBe(false);
  });

  it('isFieldInvalid returns true when required field is touched and empty', () => {
    const ctrl = component.form.get('code')!;
    ctrl.markAsTouched();
    ctrl.setValue('');
    expect(component.isFieldInvalid('code')).toBe(true);
  });

  it('getFieldError returns field_required for required error', () => {
    const ctrl = component.form.get('code')!;
    ctrl.markAsTouched();
    ctrl.setValue('');
    expect(component.getFieldError('code')).toBe('field_required');
  });

  it('getFieldError returns clients.email_invalid for email error', () => {
    const ctrl = component.form.get('email')!;
    ctrl.markAsTouched();
    ctrl.setValue('invalid');
    expect(component.getFieldError('email')).toBe('clients.email_invalid');
  });
});
