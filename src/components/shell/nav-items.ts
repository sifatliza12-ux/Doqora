import type { ComponentType, SVGProps } from "react";
import {
  CustomersIcon,
  DashboardIcon,
  InvoicesIcon,
  SettingsIcon,
} from "@/components/ui/icons";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { label: "Customers", href: "/customers", icon: CustomersIcon },
  { label: "Invoices", href: "/invoices", icon: InvoicesIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];
