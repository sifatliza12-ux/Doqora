import { OrganizationSwitcher } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getInvoicesForCurrentBusiness } from "@/server/invoices";
import { InvoicesView } from "./InvoicesView";

export const metadata = {
  title: "Invoices — Doqora",
};

export default async function InvoicesPage() {
  const result = await getInvoicesForCurrentBusiness();

  if (result.status === "no-organization") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active organization</CardTitle>
          <CardDescription>
            Select an existing organization or create a new one to manage invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/invoices"
            afterSelectOrganizationUrl="/invoices"
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

  return <InvoicesView invoices={result.invoices} />;
}
