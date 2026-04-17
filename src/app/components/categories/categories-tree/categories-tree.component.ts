import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Category, CategoryTreeNode } from '@app/models/category.model';
import { CategoriesService } from '@app/services/categories.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { handleApiError } from '@app/utils';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-categories-tree',
  standalone: true,
  imports: [CommonModule, ConfirmationDialogComponent],
  templateUrl: './categories-tree.component.html',
})
export class CategoriesTreeComponent {
  @Input() set tree(value: CategoryTreeNode[]) {
    this._tree = value ?? [];
    if (this._tree.length > 0 && this.expandedNodes.size === 0) {
      this._tree.forEach((n) => this.expandedNodes.add(n.id));
    }
  }
  get tree(): CategoryTreeNode[] { return this._tree; }
  private _tree: CategoryTreeNode[] = [];

  @Input() categories: Category[] = [];
  @Input() isLoading = false;
  @Output() editCategory = new EventEmitter<Category>();
  @Output() addChild = new EventEmitter<string>();
  @Output() categoryArchived = new EventEmitter<void>();

  expandedNodes = new Set<string>();
  confirmArchiveOpen = false;
  nodeToArchive: CategoryTreeNode | null = null;
  isArchiving = false;

  constructor(
    private categoriesService: CategoriesService,
    private alertService: AlertService,
    private authorizationService: AuthorizationService,
    private languageService: LanguageService,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  isAdmin(): boolean {
    return this.authorizationService.isAdmin();
  }

  toggleExpand(id: string): void {
    if (this.expandedNodes.has(id)) {
      this.expandedNodes.delete(id);
    } else {
      this.expandedNodes.add(id);
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedNodes.has(id);
  }

  getCategoryById(id: string): Category | undefined {
    return this.categories.find((c) => c.id === id);
  }

  onEdit(node: CategoryTreeNode): void {
    const cat = this.getCategoryById(node.id);
    if (cat) this.editCategory.emit(cat);
  }

  onAddChild(nodeId: string): void {
    this.addChild.emit(nodeId);
  }

  openArchiveConfirm(node: CategoryTreeNode): void {
    this.nodeToArchive = node;
    this.confirmArchiveOpen = true;
  }

  cancelArchive(): void {
    this.confirmArchiveOpen = false;
    this.nodeToArchive = null;
  }

  async confirmArchive(): Promise<void> {
    if (!this.nodeToArchive) return;
    this.isArchiving = true;
    try {
      await this.categoriesService.softDelete(this.nodeToArchive.id);
      this.alertService.success(this.t('categories.archived_success'));
      this.categoryArchived.emit();
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('categories.error_archiving')));
    } finally {
      this.isArchiving = false;
      this.confirmArchiveOpen = false;
      this.nodeToArchive = null;
    }
  }

  archiveConfirmMessage(): string {
    if (!this.nodeToArchive) return '';
    const hasChildren = this.nodeToArchive.children.length > 0;
    if (hasChildren) {
      return this.t('categories.archive_confirm_has_children').replace('{{name}}', this.nodeToArchive.name);
    }
    return this.t('categories.archive_confirm_message').replace('{{name}}', this.nodeToArchive.name);
  }
}
