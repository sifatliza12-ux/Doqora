import { OrganizationSwitcher } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getInvoiceBuilderContext } from "@/server/invoices";
import { InvoiceBuilder } from "../InvoiceBuilder";

export const metadata = {
  title: "New invoice — Doqora",
};

export default async function NewInvoicePage() {
  const result = await getInvoiceBuilderContext();

  if (result.status === "no-organization") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active organization</CardTitle>
          <CardDescription>
            Select an existing organization or create a new one to create invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/invoices/new"
            afterSelectOrganizationUrl="/invoices/new"
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

  return <InvoiceBuilder context={result.context} />;
}
