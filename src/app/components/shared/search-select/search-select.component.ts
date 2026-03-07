import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, Output } from '@angular/core';
import {
  ZardComboboxComponent,
  ZardComboboxOption,
} from '../../../shared/components/combobox/combobox.component';

export interface SearchSelectOption {
  id: string;
  name: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-search-select',
  standalone: true,
  imports: [CommonModule, ZardComboboxComponent],
  template: `
    <z-combobox
      class="w-full"
      zWidth="full"
      [placeholder]="placeholder"
      [searchPlaceholder]="searchPlaceholder"
      [emptyText]="emptyText"
      [options]="comboboxOptions()"
      [value]="value"
      [disabled]="disabled || options.length === 0"
      (zValueChange)="onValueChanged($event)"
    />
  `,
})
export class SearchSelectComponent {
  @Input() options: SearchSelectOption[] = [];
  @Input() value: string | null = null;
  @Input() disabled = false;
  @Input() placeholder = 'Select an option';
  @Input() searchPlaceholder = 'Search...';
  @Input() emptyText = 'No results found';

  @Output() valueChange = new EventEmitter<string | null>();
  @Output() optionChange = new EventEmitter<SearchSelectOption | null>();

  readonly comboboxOptions = computed<ZardComboboxOption[]>(() =>
    this.options.map((option) => ({
      value: option.id,
      label: option.name,
      disabled: option.disabled ?? false,
    })),
  );

  onValueChanged(value: string | null): void {
    this.valueChange.emit(value);
    this.optionChange.emit(this.options.find((option) => option.id === value) ?? null);
  }
}
