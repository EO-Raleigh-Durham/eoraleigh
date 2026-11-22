"use client";

import { useState, useTransition } from "react";
import { updateProfile, initiateEmailChange, changePassword, signOut } from "./actions";
import { PasswordInput } from "@/components/PasswordInput";
import { CHAPTER_PHONE_EXAMPLE } from "@/kernel/config/chapter";

type Props = {
  fullName: string;
  email: string;
  phone: string;
  whatsappPhone: string;
  role: string;
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Admin",
  board: "Board",
  member: "Member",
  guest: "Guest",
};

export function ProfileForm({ fullName, email, phone, whatsappPhone, role }: Props) {
  const [name, setName] = useState(fullName);
  const [ph, setPh] = useState(phone);
  const [wa, setWa] = useState(whatsappPhone);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [isSaving, startSave] = useTransition();
  const [isEmailPending, startEmail] = useTransition();
  const [isPasswordPending, startPassword] = useTransition();
  const [isSigningOut, startSignOut] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setSaveError(null);
    startSave(async () => {
      const result = await updateProfile(name, ph, wa);
      if (!result.ok) setSaveError(result.error);
      else setSaved(true);
    });
  }

  function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSent(false);
    startEmail(async () => {
      const result = await initiateEmailChange(newEmail);
      if (!result.ok) setEmailError(result.error);
      else { setEmailSent(true); setNewEmail(""); }
    });
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    startPassword(async () => {
      const result = await changePassword(newPassword);
      if (!result.ok) setPasswordError(result.error);
      else { setPasswordSaved(true); setNewPassword(""); setConfirmPassword(""); }
    });
  }

  function handleSignOut() {
    startSignOut(async () => { await signOut(); });
  }

  return (
    <>
      <div className="profile-head-row">
        <div className="profile-role-badge">{ROLE_LABEL[role] ?? role}</div>
        <button
          type="button"
          className="profile-signout profile-signout--top"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? "Signing out..." : `Sign out (${email})`}
        </button>
      </div>

      {saved && <div className="auth-success">Profile saved.</div>}
      {saveError && <div className="auth-error">{saveError}</div>}

      <form onSubmit={handleSave} className="auth-form">
        <label className="auth-field">
          <span className="auth-label">Full name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="auth-input"
            autoComplete="name"
          />
        </label>
        <label className="auth-field">
          <span className="auth-label">Phone</span>
          <input
            type="tel"
            value={ph}
            onChange={(e) => setPh(e.target.value)}
            className="auth-input"
            placeholder={CHAPTER_PHONE_EXAMPLE}
            autoComplete="tel"
          />
        </label>
        <label className="auth-field">
          <span className="auth-label">WhatsApp</span>
          <input
            type="tel"
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            className="auth-input"
            placeholder={CHAPTER_PHONE_EXAMPLE}
          />
        </label>
        <button type="submit" className="auth-btn" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </form>

      <div className="profile-section">
        <p className="profile-section-title">Email address</p>
        <div className="profile-email-display">{email}</div>

        {emailSent ? (
          <div className="auth-success">
            Check your new email inbox to confirm the change.
          </div>
        ) : (
          <form onSubmit={handleEmailChange} className="auth-form">
            {emailError && <div className="auth-error">{emailError}</div>}
            <label className="auth-field">
              <span className="auth-label">New email address</span>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                placeholder="new@example.com"
                autoComplete="email"
                className="auth-input"
              />
            </label>
            <button type="submit" className="auth-btn" disabled={isEmailPending}>
              {isEmailPending ? "Sending..." : "Change email"}
            </button>
          </form>
        )}
      </div>

      <div className="profile-section">
        <p className="profile-section-title">Password</p>
        {passwordSaved ? (
          <div className="auth-success">Password updated.</div>
        ) : (
          <form onSubmit={handlePasswordChange} className="auth-form">
            {passwordError && <div className="auth-error">{passwordError}</div>}
            <label className="auth-field">
              <span className="auth-label">New password</span>
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="auth-field">
              <span className="auth-label">Confirm new password</span>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                required
              />
            </label>
            <button type="submit" className="auth-btn" disabled={isPasswordPending}>
              {isPasswordPending ? "Saving..." : "Update password"}
            </button>
          </form>
        )}
      </div>

      <div className="profile-section">
        <button
          type="button"
          className="profile-signout"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </>
  );
}
