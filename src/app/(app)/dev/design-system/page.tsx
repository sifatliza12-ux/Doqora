"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";

export default function StyleGuidePage() {
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Component foundation
        </h1>
        <p className="text-sm text-muted-foreground">
          Internal review page for Milestone 1 — not part of the product
          navigation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Create Invoice</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="danger">Delete</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge status="draft" />
          <Badge status="sent" />
          <Badge status="paid" />
          <Badge status="overdue" />
          <Badge status="cancelled" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form fields</CardTitle>
        </CardHeader>
        <CardContent>
          <FormSection title="Customer details" description="Example field grouping.">
            <Input label="Customer name" placeholder="Acme Trading Co." />
            <Select label="Currency" defaultValue="SAR">
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
              <option value="USD">USD</option>
            </Select>
            <Textarea label="Notes" placeholder="Optional notes for this invoice" />
            <Input label="With error" error="This field is required" />
          </FormSection>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>INV-00042</TableCell>
                <TableCell>Al Bilad Trading</TableCell>
                <TableCell>
                  <Badge status="paid" />
                </TableCell>
                <TableCell>SAR 4,500.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>INV-00043</TableCell>
                <TableCell>Noor Retail LLC</TableCell>
                <TableCell>
                  <Badge status="overdue" />
                </TableCell>
                <TableCell>SAR 1,250.00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modal</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Modal
            isOpen={isModalOpen}
            onClose={() => setModalOpen(false)}
            title="Example modal"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>
                  Confirm
                </Button>
              </>
            }
          >
            <p className="text-sm text-muted-foreground">
              This is placeholder modal content for the Milestone 1 component
              review.
            </p>
          </Modal>
        </CardContent>
      </Card>
    </div>
  );
}
