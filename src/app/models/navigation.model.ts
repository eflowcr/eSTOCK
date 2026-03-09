/** Required permission for a nav item; if not set, only auth is required. */
export interface NavPermission {
  resource: string;
  action: string;
}

export interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  /** Required permission (resource/action). Omit for dashboard. */
  permission?: NavPermission;
  /** If true, only admin can see this item. */
  adminOnly?: boolean;
}

export type NavigationItems = ReadonlyArray<NavigationItem>;


