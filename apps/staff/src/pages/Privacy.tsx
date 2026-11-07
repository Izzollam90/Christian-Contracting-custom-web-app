export default function Privacy() {
  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Privacy</div>
          <h2>Privacy policy</h2>
        </div>
      </div>
      <div className="glass pad stack" style={{ maxWidth: 720 }}>
        <p>Herkey Maintenance respects your privacy. This page explains what we collect and how we use it.</p>
        <h3>What we collect</h3>
        <p>Staff names, emails, phone numbers, and work records (time entries, expenses). Customer contact and service address information.</p>
        <h3>How we use it</h3>
        <p>To schedule jobs, track time and expenses, send estimates and invoices, and manage team access. We never sell this information.</p>
        <h3>How we protect it</h3>
        <p>Accounts use Google sign-in and optional passkeys. Admin and Finance roles require two-factor authentication. Money and access changes require a verified 2FA session, enforced at the database level. Customer data is protected by row-level security — crew only see customers of jobs they hold.</p>
        <h3>Your choices</h3>
        <p>Add or remove passkeys and two-factor factors from the Security page. Sign out from the sidebar.</p>
        <h3>Contact</h3>
        <p>Questions about data? Talk to an Admin.</p>
        <p className="muted" style={{ fontSize: '.85rem' }}>This is a draft policy for review. Last updated November 2026.</p>
      </div>
    </div>
  );
}
