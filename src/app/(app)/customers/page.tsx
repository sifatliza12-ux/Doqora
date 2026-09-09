import { OrganizationSwitcher } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getCustomersForCurrentBusiness } from "@/server/customers";
import { CustomersView } from "./CustomersView";

export const metadata = {
  title: "Customers — Doqora",
};

export default async function CustomersPage() {
  const result = await getCustomersForCurrentBusiness();

  if (result.status === "no-organization") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active organization</CardTitle>
          <CardDescription>
            Select an existing organization or create a new one to manage customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/customers"
            afterSelectOrganizationUrl="/customers"
          />
        </CardContent>
      </Card>
    );
  }

  if (result.status === "not-found") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Setting up your workspace</CardTitle>
          <CardDescription>
            We&apos;re still finishing setup for this organization. Try refreshing in a
            moment.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <CustomersView customers={result.customers} />;
}
