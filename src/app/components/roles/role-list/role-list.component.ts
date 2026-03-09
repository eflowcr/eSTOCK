import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Role } from '@app/models/role.model';
import { LanguageService } from '@app/services/extras/language.service';
@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-list.component.html',
  styleUrls: ['./role-list.component.css'],
})
export class RoleListComponent {
  @Input() set roles(value: Role[]) {
    this._roles = value ?? [];
    this.filteredRoles = this.applyFilters();
  }
  @Input() isLoading = false;
  @Output() refresh = new EventEmitter<void>();

  private _roles: Role[] = [];
  filteredRoles: Role[] = [];
  searchTerm = '';
  sortBy: 'name' | 'created_at' = 'name';
  sortAsc = true;
  selectedIds = new Set<string>();

  constructor(
    private languageService: LanguageService,
    private router: Router,
  ) {}

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  private applyFilters(): Role[] {
    let list = [...this._roles];
    const search = this.searchTerm.trim().toLowerCase();
    if (search) {
      list = list.filter(
        (r) =>
          r.name?.toLowerCase().includes(search) ||
          (r.description && r.description.toLowerCase().includes(search))
      );
    }
    list.sort((a, b) => {
      const aVal = this.sortBy === 'name' ? (a.name ?? '') : (a.created_at ?? '');
      const bVal = this.sortBy === 'name' ? (b.name ?? '') : (b.created_at ?? '');
      const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
      return this.sortAsc ? cmp : -cmp;
    });
    return list;
  }

  onSearch(): void {
    this.filteredRoles = this.applyFilters();
  }

  setSort(field: 'name' | 'created_at'): void {
    if (this.sortBy === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortBy = field;
      this.sortAsc = true;
    }
    this.filteredRoles = this.applyFilters();
  }

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      this.filteredRoles.forEach((r) => this.selectedIds.add(r.id));
    } else {
      this.selectedIds.clear();
    }
  }

  toggleSelect(id: string, checked: boolean): void {
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  get allSelected(): boolean {
    return this.filteredRoles.length > 0 && this.filteredRoles.every((r) => this.selectedIds.has(r.id));
  }

  managePermissions(role: Role): void {
    this.router.navigate(['/roles', role.id]);
  }

  formatDate(value: string | undefined): string {
    if (!value) return '—';
    try {
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : d.toLocaleDateString(this.languageService.getCurrentLanguage() === 'es' ? 'es' : 'en', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return value;
    }
  }
}
