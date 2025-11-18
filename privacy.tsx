export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <h1>Privacy Policy</h1>
      <p>Last Updated: November 18, 2025</p>

      <h2>1. Introduction</h2>
      <p>
        Floors Unlimited USA ("we", "our", "us") operates FloCon, an internal
        business management application. This Privacy Policy explains how we
        collect, use, and protect information when you use our Application.
      </p>

      <h2>2. Information We Collect</h2>
      <p>FloCon collects and processes the following types of information:</p>
      <ul>
        <li>
          <strong>User Authentication Data:</strong> Email addresses, names, and
          authentication credentials managed through Supabase Auth
        </li>
        <li>
          <strong>Business Data:</strong> Project information, contacts,
          companies, financial records, scheduling data, and other business
          operations data
        </li>
        <li>
          <strong>QuickBooks Data:</strong> Financial transactions, invoices,
          bills, vendor information, and customer data synchronized from
          QuickBooks Online
        </li>
        <li>
          <strong>Usage Data:</strong> Application access logs and activity
          records
        </li>
      </ul>

      <h2>3. How We Use Information</h2>
      <p>We use collected information to:</p>
      <ul>
        <li>Provide and maintain the Application's functionality</li>
        <li>Manage projects, billing, and business operations</li>
        <li>Synchronize data with QuickBooks Online</li>
        <li>Generate reports and financial summaries</li>
        <li>Ensure security and prevent unauthorized access</li>
      </ul>

      <h2>4. Data Storage and Security</h2>
      <p>
        All data is stored securely in Supabase's PostgreSQL database with
        row-level security policies. QuickBooks integration uses OAuth 2.0 for
        secure authentication. We implement industry-standard security measures
        to protect your data.
      </p>

      <h2>5. Data Sharing</h2>
      <p>We do not sell or share your data with third parties, except:</p>
      <ul>
        <li>
          <strong>QuickBooks Online:</strong> For accounting and financial data
          synchronization
        </li>
        <li>
          <strong>Supabase:</strong> Our database and authentication provider
        </li>
        <li>
          <strong>Vercel:</strong> Our hosting platform
        </li>
      </ul>

      <h2>6. Data Retention</h2>
      <p>
        We retain business data as long as necessary for business operations and
        legal compliance. User accounts and associated data are retained while
        the user is an active employee or contractor.
      </p>

      <h2>7. Your Rights</h2>
      <p>As an authorized user, you have the right to:</p>
      <ul>
        <li>Access your personal data</li>
        <li>Request corrections to inaccurate data</li>
        <li>
          Request data deletion (subject to business record retention policies)
        </li>
      </ul>

      <h2>8. Third-Party Services</h2>
      <p>
        FloCon integrates with QuickBooks Online. Please review Intuit's Privacy
        Policy for information about how QuickBooks handles data.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Changes will be
        posted on this page with an updated revision date.
      </p>

      <h2>10. Contact Us</h2>
      <p>
        For questions about this Privacy Policy or data handling practices,
        please contact Floors Unlimited USA management.
      </p>

      <h2>11. Compliance</h2>
      <p>
        This Application is intended for internal business use by Floors
        Unlimited USA. We comply with applicable data protection laws and
        regulations.
      </p>
    </div>
  );
}
