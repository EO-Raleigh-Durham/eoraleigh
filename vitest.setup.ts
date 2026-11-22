// Identity values the ported edge8 code reads from the environment, set to
// neutral test values so a suite never depends on a developer's .env.local.
process.env.EMAIL_FROM ??= "Test Sender <notifications@example.com>";
process.env.OPS_EMAIL ??= "mai@example.com";
process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??= "hello@example.com";
process.env.NEXT_PUBLIC_SITE_URL ??= "https://www.example.com";
process.env.MARKETING_POSTAL_ADDRESS ??= "Acme Inc, 1 Example Street, Springfield";
process.env.NEXT_PUBLIC_ORG_NAME ??= "Acme Inc";
