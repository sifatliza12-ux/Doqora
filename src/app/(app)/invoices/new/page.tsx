"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { InvoiceForm } from "./InvoiceForm";
import { InvoicePreview } from "./InvoicePreview";

type MobileView = "edit" | "preview";

export default function NewInvoicePage() {
  const [mobileView, setMobileView] = useState<MobileView>("edit");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-foreground">New invoice</h1>

      {/* Mobile-only Edit/Preview pill toggle */}
      <div className="inline-flex w-fit items-center gap-1 rounded-full border border-border bg-surface p-1 md:hidden">
        <button
          type="button"
          onClick={() => setMobileView("edit")}
          aria-pressed={mobileView === "edit"}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            mobileView === "edit"
              ? "bg-emerald text-emerald-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setMobileView("preview")}
          aria-pressed={mobileView === "preview"}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            mobileView === "preview"
              ? "bg-emerald text-emerald-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Preview
        </button>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div
          className={cn(
            "md:w-5/12",
            mobileView === "edit" ? "block" : "hidden",
            "md:block"
          )}
        >
          <InvoiceForm />
        </div>
        <div
          className={cn(
            "md:w-7/12",
            mobileView === "preview" ? "block" : "hidden",
            "md:block"
          )}
        >
          <InvoicePreview />
        </div>
      </div>
    </div>
  );
}
