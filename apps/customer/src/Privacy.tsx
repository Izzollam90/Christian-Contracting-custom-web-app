export default function Privacy() {
  return (
    <section className="wrap section stack">
      <div>
        <div className="eyebrow">Privacy</div>
        <h2 style={{ fontSize: 'clamp(1.7rem,4vw,2.6rem)', marginTop: 6 }}>Privacy policy</h2>
      </div>
      <div className="glass pad stack" style={{ maxWidth: 720 }}>
        <p>Herkey Maintenance respects your privacy. This page explains what we collect and how we use it.</p>
        <h3>What we collect</h3>
        <p>Your name, email, phone number, and service address — only what's needed to schedule and complete maintenance work.</p>
        <h3>How we use it</h3>
        <p>To schedule jobs, send estimates and invoices, and coordinate crew. We never sell your information.</p>
        <h3>How we protect it</h3>
        <p>Your account is protected by Google sign-in and optional passkeys. Money and account changes require two-factor authentication. Access to your data is enforced at the database level — not just hidden in the app.</p>
        <h3>Your choices</h3>
        <p>You can add or remove passkeys and two-factor factors from the Security page at any time. You can sign out from any screen.</p>
        <h3>Contact</h3>
        <p>Questions about your data? Call the office and we'll help.</p>
        <p className="muted" style={{ fontSize: '.85rem' }}>This is a draft policy for review. Last updated November 2026.</p>
      </div>
    </section>
  );
}
