"use client";

import { useState, useTransition } from "react";
import type { updateUserAction, toggleActiveAction } from "../actions";

type Props = {
  profileId: string;
  currentRole: string;
  currentActive: boolean;
  roleLabels: Record<string, string>;
  updateAction: typeof updateUserAction;
  toggleAction: typeof toggleActiveAction;
};

export function EditUserForm({
  profileId,
  currentRole,
  currentActive,
  roleLabels,
  updateAction,
  toggleAction,
}: Props) {
  const [role, setRole] = useState(currentRole);
  const [active, setActive] = useState(currentActive);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [isPendingRole, startRoleTransition] = useTransition();
  const [isPendingToggle, startToggleTransition] = useTransition();

  function handleRoleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRoleError(null);
    setRoleSuccess(false);
    const formData = new FormData(e.currentTarget);
    startRoleTransition(async () => {
      const result = await updateAction(profileId, formData);
      if (!result.ok) {
        setRoleError(result.error);
      } else {
        setRoleSuccess(true);
      }
    });
  }

  function handleToggle() {
    setToggleError(null);
    startToggleTransition(async () => {
      const result = await toggleAction(profileId, active);
      if (!result.ok) {
        setToggleError(result.error);
      } else {
        setActive((prev) => !prev);
      }
    });
  }

  return (
    <>
      {/* Role section */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#04102D", margin: "0 0 12px" }}>Role</h2>
        {roleError && (
          <div style={{ padding: "10px 14px", background: "rgba(220,38,38,0.07)", color: "#991B1B", borderRadius: 6, fontSize: 14, marginBottom: 12 }}>
            {roleError}
          </div>
        )}
        {roleSuccess && (
          <div style={{ padding: "10px 14px", background: "#D1FAE5", color: "#065F46", borderRadius: 6, fontSize: 14, marginBottom: 12 }}>
            Role updated.
          </div>
        )}
        <form onSubmit={handleRoleSubmit} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Role</span>
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ padding: "10px 12px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 15, fontFamily: "inherit", background: "#fff" }}
            >
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={isPendingRole}
            style={{ padding: "10px 18px", background: "#287BE8", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", opacity: isPendingRole ? 0.6 : 1, whiteSpace: "nowrap" }}
          >
            {isPendingRole ? "Saving..." : "Save role"}
          </button>
        </form>
      </div>

      {/* Active status section */}
      <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#04102D", margin: "0 0 8px" }}>Account status</h2>
        <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 12px" }}>
          {active
            ? "This user can currently sign in."
            : "This user is deactivated. They cannot sign in."}
        </p>
        {toggleError && (
          <div style={{ padding: "10px 14px", background: "rgba(220,38,38,0.07)", color: "#991B1B", borderRadius: 6, fontSize: 14, marginBottom: 12 }}>
            {toggleError}
          </div>
        )}
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPendingToggle}
          style={{
            padding: "9px 18px",
            background: active ? "rgba(220,38,38,0.08)" : "#D1FAE5",
            color: active ? "#991B1B" : "#065F46",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            opacity: isPendingToggle ? 0.6 : 1,
          }}
        >
          {isPendingToggle
            ? "Updating..."
            : active
              ? "Deactivate account"
              : "Reactivate account"}
        </button>
      </div>
    </>
  );
}
