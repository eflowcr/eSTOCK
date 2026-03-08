import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZardToastComponent } from '../../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule, ZardToastComponent],
  template: `
    <z-toast
      position="bottom-right"
      theme="system"
      [richColors]="true"
      [closeButton]="true"
      [visibleToasts]="4"
      [duration]="4500"
    />
  `,
})
export class AlertComponent {}
