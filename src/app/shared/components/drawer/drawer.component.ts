import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { trigger, transition, style, animate, state } from '@angular/animations';

/** Which edge the drawer slides in from: left, right, top, or bottom. */
export type DrawerDirection = 'left' | 'right' | 'top' | 'bottom';

const EASE_PANEL = 'cubic-bezier(0.32, 0.72, 0, 1)';
const DURATION_ENTER = 250;
const DURATION_LEAVE = 200;
const OVERLAY_ENTER_MS = 200;
const OVERLAY_LEAVE_MS = 150;

/**
 * Drawer component (shadcn/Vaul-style) for Angular.
 * Slides in from the specified edge with enter/leave transitions.
 * Use content projection: [drawerHeader], [drawerContent], [drawerFooter].
 */
@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.css',
  animations: [
    trigger('overlay', [
      state('open', style({ opacity: 1 })),
      state('closed', style({ opacity: 0 })),
      transition('* => open', [
        style({ opacity: 0 }),
        animate(`${OVERLAY_ENTER_MS}ms ease-out`, style({ opacity: 1 })),
      ]),
      transition('open => closed', [
        animate(`${OVERLAY_LEAVE_MS}ms ease-in`, style({ opacity: 0 })),
      ]),
    ]),
    trigger('panelSlide', [
      state('open', style({ transform: '{{ to }}' }), { params: { to: 'translateX(0)' } }),
      state('closed', style({ transform: '{{ from }}' }), { params: { from: 'translateX(100%)' } }),
      transition('* => open', [
        style({ transform: '{{ from }}' }),
        animate(`${DURATION_ENTER}ms ${EASE_PANEL}`, style({ transform: '{{ to }}' })),
      ], { params: { from: 'translateX(100%)', to: 'translateX(0)' } }),
      transition('open => closed', [
        animate(`${DURATION_LEAVE}ms ${EASE_PANEL}`, style({ transform: '{{ from }}' })),
      ], { params: { from: 'translateX(100%)' } }),
    ]),
  ],
})
export class DrawerComponent {
  @Input() isOpen = false;
  /** Side the drawer slides from: 'left' | 'right' | 'top' | 'bottom'. */
  @Input() direction: DrawerDirection = 'right';
  /** Optional extra CSS classes for the panel (e.g. max width). */
  @Input() panelClass = '';

  @Output() closed = new EventEmitter<void>();

  _closing = false;

  /** Current overlay state for animation. */
  get overlayState(): 'open' | 'closed' {
    return this._closing ? 'closed' : 'open';
  }

  /** Current panel state for animation. */
  get panelState(): 'open' | 'closed' {
    return this._closing ? 'closed' : 'open';
  }

  /** Animation params for slide direction (all four sides supported). */
  get panelParams(): { from: string; to: string } {
    const map: Record<DrawerDirection, { from: string; to: string }> = {
      right: { from: 'translateX(100%)', to: 'translateX(0)' },
      left: { from: 'translateX(-100%)', to: 'translateX(0)' },
      top: { from: 'translateY(-100%)', to: 'translateY(0)' },
      bottom: { from: 'translateY(100%)', to: 'translateY(0)' },
    };
    return map[this.direction];
  }

  /** Keep drawer in DOM until leave animation finishes. */
  get isVisible(): boolean {
    return this.isOpen || this._closing;
  }

  onBackdropClick(): void {
    this._closing = true;
  }

  close(): void {
    this._closing = true;
  }

  onPanelSlideDone(event: { toState: string }): void {
    if (event.toState === 'closed') {
      this.closed.emit();
      this._closing = false;
    }
  }
}
