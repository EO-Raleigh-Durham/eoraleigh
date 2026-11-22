type FieldProps = {
  label: string;
  full?: boolean;
  children: React.ReactNode;
};

export function Field({ label, full = false, children }: FieldProps) {
  return (
    <label className={`field ${full ? "field--full" : ""}`.trim()}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
