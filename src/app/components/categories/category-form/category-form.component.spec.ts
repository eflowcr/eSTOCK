import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CategoryFormComponent } from './category-form.component';
import { CategoriesService } from '@app/services/categories.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { Category } from '@app/models/category.model';

const okResponse = (data: any) => Promise.resolve({ result: { success: true }, data });

const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', tenant_id: 't1', name: 'Electronics', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-1-1', tenant_id: 't1', name: 'Phones', parent_id: 'cat-1', is_active: true, created_at: '', updated_at: '' },
];

const mockCategoriesService = {
  create: () => okResponse({}),
  update: () => okResponse({}),
};
const mockAlertService = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
const mockLanguageService = { t: (key: string) => key };

describe('CategoryFormComponent — validations & 2-level constraint', () => {
  let component: CategoryFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule, HttpClientTestingModule, CategoryFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: CategoriesService, useValue: mockCategoriesService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CategoryFormComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    component.allCategories = MOCK_CATEGORIES;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('form is invalid when name is empty', () => {
    component.form.patchValue({ name: '' });
    expect(component.form.invalid).toBe(true);
  });

  it('form is valid with name filled', () => {
    component.form.patchValue({ name: 'Test Category' });
    expect(component.form.valid).toBe(true);
  });

  it('name field is required', () => {
    component.form.patchValue({ name: '' });
    expect(component.form.get('name')?.errors?.['required']).toBeTruthy();
  });

  it('isEditMode is false by default', () => {
    expect(component.isEditMode).toBe(false);
  });

  it('rootCategories returns only root (no parent_id) active categories', () => {
    const roots = component.rootCategories;
    expect(roots.every((c) => !c.parent_id)).toBe(true);
    expect(roots.length).toBe(1);
    expect(roots[0].id).toBe('cat-1');
  });

  it('isFieldInvalid returns false when field is untouched', () => {
    expect(component.isFieldInvalid('name')).toBe(false);
  });

  it('isFieldInvalid returns true when required field is touched and empty', () => {
    const ctrl = component.form.get('name')!;
    ctrl.markAsTouched();
    ctrl.setValue('');
    expect(component.isFieldInvalid('name')).toBe(true);
  });

  it('getFieldError returns field_required for required error', () => {
    const ctrl = component.form.get('name')!;
    ctrl.markAsTouched();
    ctrl.setValue('');
    expect(component.getFieldError('name')).toBe('field_required');
  });

  it('parent_id is set when parentId input is provided', () => {
    component.parentId = 'cat-1';
    component.ngOnChanges({ parentId: { currentValue: 'cat-1', previousValue: null, firstChange: true, isFirstChange: () => true } });
    expect(component.form.get('parent_id')?.value).toBe('cat-1');
  });

  it('defaults to is_active=true', () => {
    expect(component.form.get('is_active')?.value).toBe(true);
  });
});
