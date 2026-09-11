"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { PeriodPreset } from "@/lib/tax-report-period";

export function TaxReportPeriodPicker({
  preset,
  fromInput,
  toInput,
}: {
  preset: PeriodPreset;
  fromInput: string;
  toInput: string;
}) {
  const router = useRouter();

  function handlePresetChange(event: React.ChangeEvent<HTMLSelectElement>) {
    // "This month" / "last month" apply immediately; "custom" waits for the
    // user to pick real dates and hit Apply.
    if (event.target.value !== "custom") {
      event.currentTarget.form?.requestSubmit();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const period = String(formData.get("period") ?? "this-month");
    const params = new URLSearchParams({ period });
    if (period === "custom") {
      params.set("from", String(formData.get("from") ?? ""));
      params.set("to", String(formData.get("to") ?? ""));
    }
    router.push(`/tax-report?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <Select
        label="Period"
        name="period"
        defaultValue={preset}
        onChange={handlePresetChange}
        className="w-40"
      >
        <option value="this-month">This month</option>
        <option value="last-month">Last month</option>
        <option value="custom">Custom range</option>
      </Select>
      <Input label="From" type="date" name="from" defaultValue={fromInput} required />
      <Input label="To" type="date" name="to" defaultValue={toInput} required />
      <Button type="submit" variant="secondary">
        Apply
      </Button>
    </form>
  );
}
