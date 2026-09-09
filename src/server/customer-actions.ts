"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentBusinessId } from "@/server/business";

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function customerFieldsFromFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    nameAr: optionalText(formData, "nameAr"),
    companyName: optionalText(formData, "companyName"),
    companyNameAr: optionalText(formData, "companyNameAr"),
    vatNumber: optionalText(formData, "vatNumber"),
    crNumber: optionalText(formData, "crNumber"),
    address: optionalText(formData, "address"),
    addressAr: optionalText(formData, "addressAr"),
    city: optionalText(formData, "city"),
    country: optionalText(formData, "country"),
    phone: optionalText(formData, "phone"),
    email: optionalText(formData, "email"),
    poBox: optionalText(formData, "poBox"),
    notes: optionalText(formData, "notes"),
  };
}

export type CustomerFormState = { status: "idle" | "success" | "error"; message?: string };

export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const businessId = await requireCurrentBusinessId();
  const fields = customerFieldsFromFormData(formData);

  if (!fields.name) {
    return { status: "error", message: "Customer name is required." };
  }

  await prisma.customer.create({ data: { businessId, ...fields } });

  revalidatePath("/customers");
  return { status: "success", message: "Customer created." };
}

export async function updateCustomer(
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const businessId = await requireCurrentBusinessId();
  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId) {
    return { status: "error", message: "Missing customer." };
  }

  const fields = customerFieldsFromFormData(formData);
  if (!fields.name) {
    return { status: "error", message: "Customer name is required." };
  }

  // Ownership check happens in the same query as the write: matching on
  // both id and businessId means a customerId from another business simply
  // updates zero rows, never someone else's record.
  const result = await prisma.customer.updateMany({
    where: { id: customerId, businessId },
    data: fields,
  });

  if (result.count === 0) {
    return { status: "error", message: "Customer not found." };
  }

  revalidatePath("/customers");
  return { status: "success", message: "Customer updated." };
}

export type DeleteCustomerState = { status: "idle" | "success" | "error"; message?: string };

export async function deleteCustomer(customerId: string): Promise<DeleteCustomerState> {
  const businessId = await requireCurrentBusinessId();

  const result = await prisma.customer.deleteMany({
    where: { id: customerId, businessId },
  });

  if (result.count === 0) {
    return { status: "error", message: "Customer not found." };
  }

  revalidatePath("/customers");
  return { status: "success", message: "Customer deleted." };
}
