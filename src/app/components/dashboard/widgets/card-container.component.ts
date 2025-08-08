import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
  selector: 'app-dashboard-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg border border-border shadow-sm">
      <div *ngIf="title" class="p-4 border-b border-border">
        <h3 class="text-base font-semibold text-primary">{{ t(title) }}</h3>
      </div>
      <div class="p-4">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class CardContainerComponent {
  @Input() title = '';

  constructor(private languageService: LanguageService) {}

  t(key: string): string {
    return this.languageService.t(key);
  }
}


