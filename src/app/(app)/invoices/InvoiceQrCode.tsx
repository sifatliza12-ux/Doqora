"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

// Renders `data` as a real scannable QR SVG, sized to fill its container
// (same box the old decorative placeholder occupied). Generation is async
// (qrcode's browser build only exposes toString as a Promise), so the box
// stays empty for the one render tick it takes to compute — no network
// involved, so in practice this resolves before the user notices.
export function InvoiceQrCode({ data, className }: { data: string; className?: string }) {
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(data, {
      type: "svg",
      margin: 0,
      color: { dark: "#000000", light: "#00000000" },
    })
      .then((markup) => {
        if (!cancelled) setSvgMarkup(markup);
      })
      .catch(() => {
        if (!cancelled) setSvgMarkup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [data]);

  if (!svgMarkup) {
    return <div aria-hidden="true" className={className} />;
  }

  return (
    <div
      aria-hidden="true"
      className={cn("[&>svg]:h-full [&>svg]:w-full", className)}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
