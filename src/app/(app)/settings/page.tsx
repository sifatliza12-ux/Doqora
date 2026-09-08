import { OrganizationSwitcher } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getCurrentBusiness } from "@/server/business";
import { BankDetailsForm } from "./BankDetailsForm";
import { BusinessProfileForm } from "./BusinessProfileForm";

export const metadata = {
  title: "Settings — Doqora",
};

export default async function SettingsPage() {
  const result = await getCurrentBusiness();

  if (result.status === "no-organization") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active organization</CardTitle>
          <CardDescription>
            Business Profile settings apply to your active organization. Select an
            existing one or create a new one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/settings"
            afterSelectOrganizationUrl="/settings"
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
            We&apos;re still finishing setup for this organization. Try refreshing in
            a moment.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-foreground">Settings</h1>
      <BusinessProfileForm business={result.business} />
      <BankDetailsForm bankAccount={result.bankAccount} />
    </div>
  );
}
