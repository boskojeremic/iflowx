// types/nav.ts
export type NavItem = { label: string; href: string };

export type NavGroup = {
  title: string;     // Platform name npr "Oil & Gas Portal"
  items: NavItem[];  // modules
};