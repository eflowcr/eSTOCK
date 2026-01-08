import { Component, OnInit } from '@angular/core';

import { LanguageService, Language } from '../../../../services/extras/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [],
  templateUrl: './language-switcher.component.html',
  styleUrls: ['./language-switcher.component.css']
})
export class LanguageSwitcherComponent implements OnInit {
  currentLanguage: Language | undefined;
  availableLanguages: Language[] = [];
  isDropdownOpen = false;

  constructor(private languageService: LanguageService) {}

  ngOnInit(): void {
    this.availableLanguages = this.languageService.availableLanguages;
    
    // Subscribe to language changes
    this.languageService.currentLanguage$.subscribe(langCode => {
      this.currentLanguage = this.languageService.getLanguageByCode(langCode);
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectLanguage(language: Language): void {
    this.languageService.setLanguage(language.code);
    this.isDropdownOpen = false;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
