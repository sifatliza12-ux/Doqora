import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { PlusIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { bank, company, invoiceMeta, lineItems } from "./mock-data";

export function InvoiceForm() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
        Saved 12 seconds ago
      </div>

      <FormSection
        title="Company Information"
        description="Read-only for now — editable business profile comes in a later milestone."
      >
        <div className="flex flex-col gap-1 rounded-input border border-border bg-surface p-3">
          <p className="text-sm font-medium text-foreground">{company.nameEn}</p>
          <p dir="rtl" className="text-left text-sm text-muted-foreground">
            {company.nameAr}
          </p>
          <p className="text-sm text-muted-foreground">
            VAT {company.vatNumber} · CR {company.crNumber}
          </p>
          <p className="text-sm text-muted-foreground">{company.address}</p>
        </div>
      </FormSection>

      <FormSection title="Customer Information">
        <Select label="Customer" defaultValue="saudi-radwa">
          <option value="saudi-radwa">Saudi Radwa Food Co. Ltd.</option>
        </Select>
      </FormSection>

      <FormSection title="Invoice Information">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Invoice #" defaultValue={invoiceMeta.number} />
          <Select label="Type" defaultValue="tax-invoice">
            <option value="tax-invoice">Tax Invoice</option>
            <option value="standard">Standard</option>
            <option value="proforma">Proforma</option>
          </Select>
          <Input label="Issue date" defaultValue={invoiceMeta.issueDate} />
          <Input label="Due date" defaultValue={invoiceMeta.dueDate} />
        </div>
      </FormSection>

      <FormSection title="Line Items">
        <div className="flex flex-col gap-3">
          {lineItems.map((item) => (
            <div
              key={item.descriptionEn}
              className="flex items-center justify-between gap-3 rounded-input border border-border bg-surface p-3"
            >
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-foreground">
                  {item.descriptionEn}
                </p>
                <p className="text-xs text-muted-foreground">
                  Qty {item.qty} · Rate {item.rate}
                </p>
              </div>
              <p className="text-sm font-medium text-foreground">{item.amount}</p>
            </div>
          ))}
          <Button variant="secondary" className="w-full">
            <PlusIcon className="h-4 w-4" />
            Add item
          </Button>
        </div>
      </FormSection>

      <FormSection title="Payment Information">
        <div className="flex flex-col gap-1 rounded-input border border-border bg-surface p-3">
          <p className="text-sm font-medium text-foreground">IBAN {bank.iban}</p>
          <p className="text-sm text-muted-foreground">Swift {bank.swift}</p>
        </div>
      </FormSection>

      <FormSection title="Notes">
        <Textarea placeholder="Add any notes for this invoice…" />
      </FormSection>
    </div>
  );
}
