"use client";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import type { CalculatedLineItem } from "@/lib/invoice-calculations";
import type { LineItemDraft } from "./line-item-draft";

function formatMoney(value: CalculatedLineItem["amount"]): string {
  return Number(value.toFixed(2)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function LineItemsEditor({
  lineItems,
  calculatedLines,
  onChange,
  onAdd,
  onRemove,
  disabled = false,
}: {
  lineItems: LineItemDraft[];
  calculatedLines: CalculatedLineItem[];
  onChange: (key: string, field: keyof LineItemDraft, value: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {lineItems.map((item, index) => {
        const calc = calculatedLines[index];
        return (
          <div
            key={item.key}
            className="flex flex-col gap-3 rounded-input border border-border bg-surface p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid flex-1 grid-cols-2 gap-3">
                <Input
                  label="Description"
                  value={item.description}
                  onChange={(event) => onChange(item.key, "description", event.target.value)}
                  disabled={disabled}
                />
                <Input
                  label="Description (Arabic)"
                  value={item.descriptionAr}
                  onChange={(event) => onChange(item.key, "descriptionAr", event.target.value)}
                  dir="rtl"
                  disabled={disabled}
                />
              </div>
              {!disabled && (
                <IconButton
                  aria-label="Remove line item"
                  className="mt-6 shrink-0"
                  onClick={() => onRemove(item.key)}
                >
                  <TrashIcon className="h-4 w-4" />
                </IconButton>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Input
                label="Qty"
                type="number"
                step="0.001"
                min="0"
                value={item.quantity}
                onChange={(event) => onChange(item.key, "quantity", event.target.value)}
                disabled={disabled}
              />
              <Input
                label="Unit"
                value={item.unit}
                onChange={(event) => onChange(item.key, "unit", event.target.value)}
                disabled={disabled}
              />
              <Input
                label="Rate"
                type="number"
                step="0.01"
                min="0"
                value={item.rate}
                onChange={(event) => onChange(item.key, "rate", event.target.value)}
                disabled={disabled}
              />
              <Input
                label="Discount"
                type="number"
                step="0.01"
                min="0"
                value={item.discount}
                onChange={(event) => onChange(item.key, "discount", event.target.value)}
                disabled={disabled}
              />
              <Input
                label="VAT %"
                type="number"
                step="0.01"
                min="0"
                value={item.vatRate}
                onChange={(event) => onChange(item.key, "vatRate", event.target.value)}
                disabled={disabled}
              />
            </div>

            {calc && (
              <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>Amount: {formatMoney(calc.amount)}</span>
                <span>VAT: {formatMoney(calc.vatAmount)}</span>
                <span className="font-medium text-foreground">
                  Line total: {formatMoney(calc.lineTotal)}
                </span>
              </div>
            )}
          </div>
        );
      })}
      {!disabled && (
        <Button type="button" variant="secondary" className="w-full" onClick={onAdd}>
          <PlusIcon className="h-4 w-4" />
          Add item
        </Button>
      )}
    </div>
  );
}
