import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: string;
  description: string;
}

export interface ShortcutEvent {
  action: string;
  originalEvent: KeyboardEvent;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private shortcutTriggered = new Subject<ShortcutEvent>();

  constructor() {
    this.initializeGlobalListener();
    this.registerDefaultShortcuts();
  }

  /**
   * Observable para escuchar cuando se activa un atajo
   */
  get onShortcutTriggered() {
    return this.shortcutTriggered.asObservable();
  }

  /**
   * Registrar un nuevo atajo de teclado
   */
  registerShortcut(shortcut: KeyboardShortcut): void {
    const key = this.generateShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Desregistrar un atajo de teclado
   */
  unregisterShortcut(action: string): void {
    for (const [key, shortcut] of this.shortcuts.entries()) {
      if (shortcut.action === action) {
        this.shortcuts.delete(key);
        break;
      }
    }
  }

  /**
   * Obtener todos los atajos registrados
   */
  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Generar clave única para el atajo
   */
  private generateShortcutKey(shortcut: KeyboardShortcut): string {
    const modifiers = [];
    if (shortcut.ctrl) modifiers.push('ctrl');
    if (shortcut.alt) modifiers.push('alt');
    if (shortcut.shift) modifiers.push('shift');
    
    return `${modifiers.join('+')}+${shortcut.key.toLowerCase()}`;
  }

  /**
   * Inicializar listener global de teclado
   */
  private initializeGlobalListener(): void {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const shortcutKey = this.generateShortcutKeyFromEvent(event);
      
      const shortcut = this.shortcuts.get(shortcutKey);
      
      if (shortcut) {
        event.preventDefault();
        event.stopPropagation();
        
        this.shortcutTriggered.next({
          action: shortcut.action,
          originalEvent: event
        });
      }
    });
  }

  /**
   * Generar clave de atajo desde evento de teclado
   */
  private generateShortcutKeyFromEvent(event: KeyboardEvent): string {
    const modifiers = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    
    return `${modifiers.join('+')}+${event.key.toLowerCase()}`;
  }

  /**
   * Registrar atajos por defecto del sistema
   */
  private registerDefaultShortcuts(): void {
    
    // CTRL + M: Mostrar novedades
    this.registerShortcut({
      key: 'm',
      ctrl: true,
      action: 'show-whats-new',
      description: 'Mostrar novedades del sistema'
    });

  }
}
