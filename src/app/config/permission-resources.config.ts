/**
 * Permission resources for the roles permissions grid.
 * Grouped for display (General Management, Administration).
 */
export interface PermissionResourceGroup {
  titleKey: string;
  resources: { key: string; labelKey: string }[];
}

export const PERMISSION_RESOURCE_GROUPS: PermissionResourceGroup[] = [
  {
    titleKey: 'roles.permissions.general_management',
    resources: [
      { key: 'articles', labelKey: 'roles.permissions.articles' },
      { key: 'inventory', labelKey: 'roles.permissions.inventory' },
      { key: 'locations', labelKey: 'roles.permissions.locations' },
      { key: 'lots', labelKey: 'roles.permissions.lots' },
      { key: 'serials', labelKey: 'roles.permissions.serials' },
    ],
  },
  {
    titleKey: 'roles.permissions.administration',
    resources: [
      { key: 'users', labelKey: 'roles.permissions.users' },
      { key: 'roles', labelKey: 'roles.permissions.roles' },
      { key: 'gamification', labelKey: 'roles.permissions.gamification' },
      { key: 'stock_alerts', labelKey: 'roles.permissions.stock_alerts' },
    ],
  },
];

export const PERMISSION_ACTIONS = [
  { key: 'read', labelKey: 'roles.permissions.view' },
  { key: 'create', labelKey: 'roles.permissions.create' },
  { key: 'update', labelKey: 'roles.permissions.edit' },
  { key: 'delete', labelKey: 'roles.permissions.delete' },
] as const;
