import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
  selector: 'app-dashboard-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-container.component.html'
})
export class CardContainerComponent {
  @Input() title = '';

  constructor(private languageService: LanguageService) {}

  t(key: string): string {
    return this.languageService.t(key);
  }
}


