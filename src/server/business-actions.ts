"use server";

import { revalidatePath } from "next/cache";
import type { LanguageMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentBusinessId } from "@/server/business";

const LANGUAGE_MODES: LanguageMode[] = ["ENGLISH", "ARABIC", "BILINGUAL"];
function isLanguageMode(value: string): value is LanguageMode {
  return (LANGUAGE_MODES as string[]).includes(value);
}

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

export type BusinessProfileState = { status: "idle" | "success" | "error"; message?: string };

export async function updateBusinessProfile(
  _prevState: BusinessProfileState,
  formData: FormData
): Promise<BusinessProfileState> {
  const businessId = await requireCurrentBusinessId();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { status: "error", message: "Business name is required." };
  }

  const languageModeRaw = String(formData.get("defaultLanguageMode") ?? "");
  const defaultLanguageMode = isLanguageMode(languageModeRaw) ? languageModeRaw : "BILINGUAL";

  await prisma.business.update({
    where: { id: businessId },
    data: {
      name,
      nameAr: optionalText(formData, "nameAr"),
      address: optionalText(formData, "address"),
      addressAr: optionalText(formData, "addressAr"),
      city: optionalText(formData, "city"),
      country: optionalText(formData, "country"),
      phone: optionalText(formData, "phone"),
      email: optionalText(formData, "email"),
      website: optionalText(formData, "website"),
      crNumber: optionalText(formData, "crNumber"),
      vatNumber: optionalText(formData, "vatNumber"),
      businessActivity: optionalText(formData, "businessActivity"),
      invoicePrefix: String(formData.get("invoicePrefix") ?? "").trim() || "INV-",
      currencyCode: String(formData.get("currencyCode") ?? "").trim() || "SAR",
      defaultLanguageMode,
      // A save through this action — whether from the full Settings form or
      // the first-run onboarding modal (a thin wrapper around the same
      // action) — always counts as the business having engaged with its
      // profile, so the onboarding modal never needs to show again either
      // way. See dismissOnboarding() below for the other half (Skip).
      onboardingDismissedAt: new Date(),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { status: "success", message: "Business profile saved." };
}

// Records that the first-run onboarding modal was dismissed WITHOUT saving
// (the "Skip for now" path, and closing the modal any other way — backdrop
// click, Escape). Intentionally separate from updateBusinessProfile: it
// touches none of the profile fields, only the dismissal marker.
export async function dismissOnboarding(): Promise<void> {
  const businessId = await requireCurrentBusinessId();
  await prisma.business.update({
    where: { id: businessId },
    data: { onboardingDismissedAt: new Date() },
  });
  revalidatePath("/dashboard");
}

export type BankDetailsState = { status: "idle" | "success" | "error"; message?: string };

export async function updateBankAccount(
  _prevState: BankDetailsState,
  formData: FormData
): Promise<BankDetailsState> {
  const businessId = await requireCurrentBusinessId();

  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountName = String(formData.get("accountName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const iban = String(formData.get("iban") ?? "").trim();
  const swiftCode = String(formData.get("swiftCode") ?? "").trim();

  if (!bankName || !accountName || !accountNumber || !iban) {
    return {
      status: "error",
      message: "Bank name, account name, account number, and IBAN are required.",
    };
  }

  const existing = await prisma.businessBankAccount.findFirst({ where: { businessId } });

  if (existing) {
    await prisma.businessBankAccount.update({
      where: { id: existing.id },
      data: { bankName, accountName, accountNumber, iban, swiftCode: swiftCode || null },
    });
  } else {
    await prisma.businessBankAccount.create({
      data: {
        businessId,
        bankName,
        accountName,
        accountNumber,
        iban,
        swiftCode: swiftCode || null,
        isDefault: true,
      },
    });
  }

  revalidatePath("/settings");
  return { status: "success", message: "Bank details saved." };
}
