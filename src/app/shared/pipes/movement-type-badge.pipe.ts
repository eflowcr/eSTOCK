import { Pipe, PipeTransform } from '@angular/core';
import { MovementType } from '@app/models/inventory-movement.model';

/** CSS class map for badge background + text colors per movement type. */
const BADGE_COLORS: Record<string, string> = {
  inbound:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  outbound:   'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  adjustment: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  transfer:   'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  rejected:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const BADGE_BASE = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';

/**
 * Returns Tailwind CSS classes for a movement-type badge.
 *
 * @param type  The MovementType value.
 * @param shape 'pill' (default) — includes rounded-full badge shape classes.
 *              'color' — returns only color (bg + text) classes, useful when
 *              the host element already defines its own shape (e.g. lot-trace timeline dot).
 *
 * Usage:
 *   {{ mv.movement_type | movementTypeBadge }}          → full pill badge classes
 *   {{ mv.movement_type | movementTypeBadge:'color' }}  → color classes only
 */
@Pipe({ name: 'movementTypeBadge', standalone: true, pure: true })
export class MovementTypeBadgePipe implements PipeTransform {
  transform(type: MovementType | string | null | undefined, shape: 'pill' | 'color' = 'pill'): string {
    const colors = BADGE_COLORS[type ?? ''] ?? 'bg-muted text-muted-foreground';
    return shape === 'color' ? colors : `${BADGE_BASE} ${colors}`;
  }
}
