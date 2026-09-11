import type { ComponentType, SVGProps } from "react";
import {
  CustomersIcon,
  DashboardIcon,
  InvoicesIcon,
  SettingsIcon,
  TaxReportIcon,
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
  { label: "Tax Report", href: "/tax-report", icon: TaxReportIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];
