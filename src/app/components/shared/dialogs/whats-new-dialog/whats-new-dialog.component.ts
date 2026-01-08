import { Component, signal } from '@angular/core';

import { LanguageService } from '@app/services/extras/language.service';
import { environment } from '@environment';

export interface WhatsNewItem {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'improvement' | 'fix';
  date: string;
}

@Component({
  selector: 'app-whats-new-dialog',
  standalone: true,
  imports: [],
  templateUrl: './whats-new-dialog.component.html',
  styleUrl: './whats-new-dialog.component.css'
})
export class WhatsNewDialogComponent {

  version: string = environment.version;
  protected readonly isVisible = signal(false);
  protected readonly whatsNewItems = signal<WhatsNewItem[]>([]);

  constructor(private languageService: LanguageService) {
    this.loadWhatsNewContent();
  }

  show(): void {
    this.isVisible.set(true);
    document.body.style.overflow = 'hidden';
  }

  hide(): void {
    this.isVisible.set(false);
    document.body.style.overflow = 'auto';
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.hide();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.hide();
    }
  }

  protected t(key: string): string {
    return this.languageService.t(key);
  }

  protected getTypeClass(type: string): string {
    switch (type) {
      case 'feature':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'improvement':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'fix':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  protected trackByItemId(index: number, item: WhatsNewItem): string {
    return item.id;
  }

  /**
   * Aqui se pone el tema de novedades y eso que se veran en el dialogo
   */
  private loadWhatsNewContent(): void {
    const items: WhatsNewItem[] = [
      {
        id: 'inventory-movements',
        title: "Historial de movimientos",
        description: "Se ha implementado un nuevo botón en la pantalla de inventario que permite visualizar los movimientos del inventario. El botón se encuentra a la derecha de 'Filtros'",
        type: 'improvement',
        date: '07/10/2025'
      },
      {
        id: 'presentations-system',
        title: "Control de Presentaciones",
        description: "Se ha implementado un nuevo botón en la pantalla de artículos que permite gestionar las presentaciones al crear artículos. El botón se encuentra a la derecha de 'Filtros'",
        type: 'improvement',
        date: '07/10/2025'
      },
      {
        id: 'improvements-system',
        title: "Corrección de errores",
        description: "",
        type: 'fix',
        date: '06/10/2025'
      }
    ];

    this.whatsNewItems.set(items);
  }
}
