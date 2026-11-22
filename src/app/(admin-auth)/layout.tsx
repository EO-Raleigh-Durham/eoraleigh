// Route group layout for admin auth pages (/admin/login).
// Sits at the root level so it does NOT inherit admin/layout.tsx
// (which adds the sidebar shell). MarketingChrome already opts out
// of topbar/footer for /admin/* paths.

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
