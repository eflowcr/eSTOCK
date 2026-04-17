import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CategoriesTreeComponent } from './categories-tree.component';
import { CategoriesService } from '@app/services/categories.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { CategoryTreeNode, Category } from '@app/models/category.model';

const MOCK_TREE: CategoryTreeNode[] = [
  {
    id: 'cat-1',
    name: 'Electronics',
    children: [
      { id: 'cat-1-1', name: 'Phones', children: [] },
      { id: 'cat-1-2', name: 'Laptops', children: [] },
    ],
  },
  {
    id: 'cat-2',
    name: 'Clothing',
    children: [],
  },
];

const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', tenant_id: 't1', name: 'Electronics', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-2', tenant_id: 't1', name: 'Clothing', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-1-1', tenant_id: 't1', name: 'Phones', parent_id: 'cat-1', is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-1-2', tenant_id: 't1', name: 'Laptops', parent_id: 'cat-1', is_active: true, created_at: '', updated_at: '' },
];

const okResponse = (data: any) => Promise.resolve({ result: { success: true }, data });
const mockCategoriesService = { softDelete: () => okResponse(null) };
const mockAlertService = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
const mockAuthorizationService = { isAdmin: () => true, isAuthenticated: () => true, hasPermission: () => true };
const mockLanguageService = { t: (key: string) => key };

describe('CategoriesTreeComponent — tree rendering', () => {
  let component: CategoriesTreeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, HttpClientTestingModule, CategoriesTreeComponent],
      providers: [
        provideNoopAnimations(),
        { provide: CategoriesService, useValue: mockCategoriesService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CategoriesTreeComponent);
    component = fixture.componentInstance;
    component.tree = MOCK_TREE;
    component.categories = MOCK_CATEGORIES;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('tree input is set correctly', () => {
    expect(component.tree.length).toBe(2);
  });

  it('root nodes are expanded by default on first load', () => {
    expect(component.isExpanded('cat-1')).toBe(true);
    expect(component.isExpanded('cat-2')).toBe(true);
  });

  it('toggleExpand collapses an expanded node', () => {
    component.toggleExpand('cat-1');
    expect(component.isExpanded('cat-1')).toBe(false);
  });

  it('toggleExpand expands a collapsed node', () => {
    component.toggleExpand('cat-1');
    component.toggleExpand('cat-1');
    expect(component.isExpanded('cat-1')).toBe(true);
  });

  it('getCategoryById finds correct category', () => {
    const cat = component.getCategoryById('cat-1-1');
    expect(cat?.name).toBe('Phones');
  });

  it('getCategoryById returns undefined for unknown id', () => {
    expect(component.getCategoryById('unknown')).toBeUndefined();
  });

  it('emits editCategory when onEdit is called', () => {
    const emitSpy = spyOn(component.editCategory, 'emit');
    component.onEdit(MOCK_TREE[0]);
    expect(emitSpy).toHaveBeenCalledWith(MOCK_CATEGORIES[0]);
  });

  it('emits addChild when onAddChild is called', () => {
    const emitSpy = spyOn(component.addChild, 'emit');
    component.onAddChild('cat-1');
    expect(emitSpy).toHaveBeenCalledWith('cat-1');
  });
});
