"use server";

import { duesUsd, duesYearLabel } from "@/lib/dues";
import { getOpenDuesYear } from "@/lib/dues-server";
import { sendDuesBankTransferEmail } from "@/lib/email";
import { CHAPTER_CONTACT_EMAIL } from "@/kernel/config/chapter";

export type BankTransferFields = {
  memberName: string;
  representativeName: string;
  companyName: string;
  title: string;
  taxId: string;
  address: string;
  accountantEmail: string;
  accountantPhone: string;
};

type Result = { ok: true } | { ok: false; error: string };

function s(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function submitSecondaryBankTransferRequest(
  formData: FormData,
): Promise<Result> {
  const fields: BankTransferFields = {
    memberName: s(formData, "memberName"),
    representativeName: s(formData, "representativeName"),
    companyName: s(formData, "companyName"),
    title: s(formData, "title"),
    taxId: s(formData, "taxId"),
    address: s(formData, "address"),
    accountantEmail: s(formData, "accountantEmail"),
    accountantPhone: s(formData, "accountantPhone"),
  };

  for (const [key, value] of Object.entries(fields)) {
    if (!value) {
      return { ok: false, error: `Please fill in all required fields (missing: ${key}).` };
    }
  }

  if (!fields.accountantEmail.includes("@")) {
    return { ok: false, error: "Please enter a valid accountant email." };
  }

  // The email is the whole request: nothing is saved anywhere else. If it
  // was not sent, say so rather than showing a confirmation.
  const dues = await getOpenDuesYear();
  const amount = dues ? dues.secondaryCents : null;
  const sent = await sendDuesBankTransferEmail({
    ...fields,
    duesSummary: dues && amount != null ? `FY ${duesYearLabel(dues.fyStart)} · ${duesUsd(amount)}` : undefined,
  });
  if (!sent) {
    return {
      ok: false,
      error:
        `We could not send your request just now. Please try again, or email ${CHAPTER_CONTACT_EMAIL}.`,
    };
  }

  return { ok: true };
}
