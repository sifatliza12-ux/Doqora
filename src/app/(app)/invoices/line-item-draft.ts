// Shared shape between the client-only builder state (InvoiceBuilder,
// LineItemsEditor) and the live preview (InvoiceSheetPreview) — both read
// the exact same draft rows so the preview never drifts from the form.
export interface LineItemDraft {
  /** Stable React key: the DB InvoiceItem id for existing rows, a "line-N"/"new-N" tag for client-added ones. */
  key: string;
  description: string;
  descriptionAr: string;
  quantity: string;
  unit: string;
  rate: string;
  discount: string;
  vatRate: string;
}

export function makeEmptyLineItem(key: string): LineItemDraft {
  return {
    key,
    description: "",
    descriptionAr: "",
    quantity: "1",
    unit: "",
    rate: "0",
    discount: "0",
    vatRate: "15",
  };
}
