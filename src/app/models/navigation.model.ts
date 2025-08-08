export interface NavigationItem {
  name: string; // translation key
  href: string; // router link
  icon: string; // icon identifier used by sidebar
}

export type NavigationItems = ReadonlyArray<NavigationItem>;


