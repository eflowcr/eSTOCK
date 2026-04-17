import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Category, CategoryTreeNode } from '@app/models/category.model';
import { CategoriesService } from '@app/services/categories.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { handleApiError } from '@app/utils';
import { MainLayoutComponent } from '../../layout/main-layout.component';
import { CategoriesTreeComponent } from '../categories-tree/categories-tree.component';
import { CategoryFormComponent } from '../category-form/category-form.component';

@Component({
  selector: 'app-categories-management',
  standalone: true,
  imports: [CommonModule, MainLayoutComponent, CategoriesTreeComponent, CategoryFormComponent],
  templateUrl: './categories-management.component.html',
})
export class CategoriesManagementComponent implements OnInit {
  tree: CategoryTreeNode[] = [];
  categories: Category[] = [];
  isLoading = false;
  isFormOpen = false;
  selectedCategory: Category | null = null;
  parentIdForNew: string | null = null;

  constructor(
    private categoriesService: CategoriesService,
    private alertService: AlertService,
    private authorizationService: AuthorizationService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      const [treeRes, listRes] = await Promise.all([
        this.categoriesService.tree(),
        this.categoriesService.list(),
      ]);
      this.tree = treeRes.data ?? [];
      this.categories = listRes.data ?? [];
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('categories.error_loading')));
    } finally {
      this.isLoading = false;
    }
  }

  isAdmin(): boolean {
    return this.authorizationService.isAdmin();
  }

  openCreateRoot(): void {
    this.selectedCategory = null;
    this.parentIdForNew = null;
    this.isFormOpen = true;
  }

  openCreateChild(parentId: string): void {
    this.selectedCategory = null;
    this.parentIdForNew = parentId;
    this.isFormOpen = true;
  }

  openEdit(category: Category): void {
    this.selectedCategory = { ...category };
    this.parentIdForNew = null;
    this.isFormOpen = true;
  }

  closeForm(): void {
    this.isFormOpen = false;
    this.selectedCategory = null;
    this.parentIdForNew = null;
  }

  onCategorySaved(): void {
    this.closeForm();
    this.loadData();
  }

  onCategoryArchived(): void {
    this.loadData();
  }
}
