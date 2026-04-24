import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryPickerComponent } from './category-picker.component';
import { CategoriesService } from '@app/services/categories.service';
import { CategoryTreeNode } from '@app/models/category.model';

const MOCK_TREE: CategoryTreeNode[] = [
  { id: 'cat-1', name: 'Electronics', children: [{ id: 'cat-1-1', name: 'Phones', children: [] }] },
  { id: 'cat-2', name: 'Clothing', children: [] },
];

const okResponse = (data: any) => Promise.resolve({ result: { success: true }, data });
const mockCategoriesService = { tree: () => okResponse(MOCK_TREE) };

describe('CategoryPickerComponent', () => {
  let component: CategoryPickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, CategoryPickerComponent],
      providers: [{ provide: CategoriesService, useValue: mockCategoriesService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(CategoryPickerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads tree on init', () => {
    expect(component.tree.length).toBe(2);
  });

  it('dropdown is closed by default', () => {
    expect(component.isOpen).toBe(false);
  });

  it('toggleDropdown opens the dropdown', () => {
    component.toggleDropdown();
    expect(component.isOpen).toBe(true);
  });

  it('toggleDropdown closes when already open', () => {
    component.toggleDropdown();
    component.toggleDropdown();
    expect(component.isOpen).toBe(false);
  });

  it('disabled picker does not open dropdown', () => {
    component.disabled = true;
    component.toggleDropdown();
    expect(component.isOpen).toBe(false);
  });

  it('select emits selectionChange with id and name', () => {
    const emitSpy = spyOn(component.selectionChange, 'emit');
    component.select('cat-1', 'Electronics');
    expect(emitSpy).toHaveBeenCalledWith({ id: 'cat-1', name: 'Electronics' });
  });

  it('select closes the dropdown', () => {
    component.isOpen = true;
    component.select('cat-1', 'Electronics');
    expect(component.isOpen).toBe(false);
  });

  it('select sets selectedId and selectedLabel', () => {
    component.select('cat-2', 'Clothing');
    expect(component.selectedId).toBe('cat-2');
    expect(component.selectedLabel).toBe('Clothing');
  });

  it('clear resets selection and emits null', () => {
    const emitSpy = spyOn(component.selectionChange, 'emit');
    component.selectedId = 'cat-1';
    component.selectedLabel = 'Electronics';
    component.clear();
    expect(component.selectedId).toBeNull();
    expect(component.selectedLabel).toBeNull();
    expect(emitSpy).toHaveBeenCalledWith({ id: null, name: null });
  });

  it('closeDropdown closes the dropdown', () => {
    component.isOpen = true;
    component.closeDropdown();
    expect(component.isOpen).toBe(false);
  });
});
