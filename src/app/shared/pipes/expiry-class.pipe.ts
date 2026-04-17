import { Pipe, PipeTransform } from '@angular/core';

/**
 * Returns a Tailwind CSS class string based on days until expiration.
 * > 60d → green, 30-60d → amber, 1-30d → red, ≤ 0d → dark (expired), null → neutral
 */
@Pipe({ name: 'expiryClass', standalone: true, pure: true })
export class ExpiryClassPipe implements PipeTransform {
  transform(expirationDate: string | null | undefined): string {
    if (!expirationDate) return 'text-muted-foreground';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);
    const days = Math.ceil((expDate.getTime() - today.getTime()) / 86_400_000);
    if (days < 0)  return 'text-gray-900 dark:text-gray-100 bg-gray-300 dark:bg-gray-600';
    if (days < 30) return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30';
    if (days < 60) return 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30';
    return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30';
  }
}

/** Returns an integer: days until expiration (negative = already expired). */
export function daysUntilExpiry(expirationDate: string | null | undefined): number | null {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  return Math.ceil((expDate.getTime() - today.getTime()) / 86_400_000);
}
