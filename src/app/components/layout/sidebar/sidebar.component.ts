import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterModule} from '@angular/router';
import {filter} from 'rxjs/operators';

import {NavigationItems} from '../../../models/navigation.model';
import {LanguageService} from '../../../services/extras/language.service';
import {NavigationService} from '../../../services/extras/navigation.service';

// moved to shared model

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styles: []
})
export class SidebarComponent implements OnInit {
  navigation: NavigationItems = [];

  appVersion = 'v1.0.0';
  currentLocation: string = '/';

  constructor(
      private languageService: LanguageService,
      private router: Router,
      private navigationService: NavigationService,
  ) {
    // Subscribe to router events to track current location
    this.router.events.pipe(filter(event => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          this.currentLocation = event.url;
        });
  }

  ngOnInit(): void {
    this.currentLocation = this.router.url;
    this.navigation = this.navigationService.getItems();
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  getItemClasses(href: string): string {
    const isActive = this.currentLocation === href;
    return isActive ?
        'bg-[#3e66ea] text-white shadow-lg transform scale-105' :
        'text-white hover:text-white hover:bg-[#3e66ea]/30 hover:rounded-xl hover:transform hover:scale-105';
  }
}
