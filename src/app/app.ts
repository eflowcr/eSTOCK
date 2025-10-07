import { Component, signal, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingSpinnerComponent } from './components/shared/extras/loading-spinner/loading-spinner.component';
import { WhatsNewDialogComponent } from './components/shared/dialogs/whats-new-dialog/whats-new-dialog.component';
import { KeyboardShortcutService, ShortcutEvent } from './services/extras/keyboard-shortcut.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingSpinnerComponent, WhatsNewDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('eSTOCK_frontend');
  
  @ViewChild(WhatsNewDialogComponent) whatsNewDialog!: WhatsNewDialogComponent;
  
  private shortcutSubscription?: Subscription;

  constructor(private keyboardShortcutService: KeyboardShortcutService) {}

  ngOnInit(): void {
    this.initializeKeyboardShortcuts();
  }

  ngOnDestroy(): void {
    this.shortcutSubscription?.unsubscribe();
  }

  /**
   * Inicializar sistema de atajos de teclado
   */
  private initializeKeyboardShortcuts(): void {
    this.shortcutSubscription = this.keyboardShortcutService.onShortcutTriggered.subscribe(
      (event: ShortcutEvent) => {
        this.handleShortcutEvent(event);
      }
    );
  }

  /**
   * Manejar eventos de atajos de teclado
   */
  private handleShortcutEvent(event: ShortcutEvent): void {
    
    switch (event.action) {
      case 'show-whats-new':
        this.showWhatsNewDialog();
        break;
      
      default:
        console.log('Atajo no manejado:', event.action);
    }
  }

  /**
   * Mostrar diálogo de novedades
   */
  private showWhatsNewDialog(): void {
    if (this.whatsNewDialog) {
      this.whatsNewDialog.show();
    }
  }
}
