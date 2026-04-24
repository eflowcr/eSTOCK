import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LanguageService } from '../../../services/extras/language.service';

@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './check-email.component.html',
  styleUrl: './check-email.component.css',
})
export class CheckEmailComponent implements OnInit {
  email = '';

  constructor(
    private route: ActivatedRoute,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
