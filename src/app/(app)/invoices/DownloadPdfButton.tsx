"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DownloadIcon, SpinnerIcon } from "@/components/ui/icons";

type State = { status: "idle" | "loading" | "error"; message?: string };

// Cold-start headless Chromium (see src/lib/launch-browser.ts) typically
// takes 2-5s before the first byte comes back — long enough that a plain
// disabled button reads as a hang. The spinner + "Generating…" label make
// that wait feel intentional instead.
export function DownloadPdfButton({ invoiceId, invoiceNumber }: { invoiceId: string; invoiceNumber: string }) {
  const [state, setState] = useState<State>({ status: "idle" });

  async function handleClick() {
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!response.ok) {
        throw new Error(`Failed to generate PDF (${response.status}).`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setState({ status: "idle" });
    } catch {
      setState({ status: "error", message: "Couldn't generate the PDF. Try again." });
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={handleClick}
        disabled={state.status === "loading"}
      >
        {state.status === "loading" ? (
          <>
            <SpinnerIcon className="h-4 w-4" />
            Generating PDF…
          </>
        ) : (
          <>
            <DownloadIcon className="h-4 w-4" />
            Download PDF
          </>
        )}
      </Button>
      {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
    </div>
  );
}
