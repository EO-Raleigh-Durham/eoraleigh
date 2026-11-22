"use client";

import { useState } from "react";
import { submitSecondaryBankTransferRequest } from "./actions";

const FIELDS: { name: string; label: string; type?: string; autoComplete?: string }[] = [
  { name: "memberName",         label: "Your name",                     autoComplete: "name" },
  { name: "representativeName", label: "Company representative's name"  },
  { name: "companyName",        label: "Company name",                   autoComplete: "organization" },
  { name: "title",              label: "Your title at the company",      autoComplete: "organization-title" },
  { name: "taxId",              label: "Company tax ID"                  },
  { name: "address",            label: "Company address",                autoComplete: "street-address" },
  { name: "accountantEmail",    label: "Accountant's email",             type: "email", autoComplete: "email" },
  { name: "accountantPhone",    label: "Accountant's phone number",      type: "tel",   autoComplete: "tel" },
];

export function SecondaryBankTransferForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await submitSecondaryBankTransferRequest(new FormData(e.currentTarget));
      if (!res.ok) {
        setError(res.error);
        setStatus("error");
        return;
      }
      window.location.href = "/secondary-chapter-dues/bank-transfer?submitted=1";
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="dur-form" noValidate>
      {error && (
        <div className="dur-form-error" role="alert">{error}</div>
      )}

      {FIELDS.map((f, i) => (
        <label key={f.name} className="dur-field">
          <span className="dur-label">
            <span className="dur-step">{i + 1}</span>
            {f.label} <span aria-hidden="true" className="dur-req">*</span>
          </span>
          <input
            name={f.name}
            type={f.type ?? "text"}
            required
            autoComplete={f.autoComplete}
            className="dur-input"
          />
        </label>
      ))}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="dur-submit"
      >
        {status === "submitting" ? "Submitting..." : "Submit request"}
      </button>

      <p className="dur-footnote">
        Our team will be in touch with contract and invoice details.
      </p>
    </form>
  );
}
