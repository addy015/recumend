import React from 'react'
import { Lock, ArrowLeft, ExternalLink, Mail, CheckCircle2 } from 'lucide-react'

export default function LegalView({ onBack }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 font-sans text-stone-800">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 mb-8 cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Recumend
      </button>

      <div className="space-y-8">
        <header className="border-b border-stone-200 pb-6">
          <h1 className="text-3xl font-bold font-display text-zinc-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-stone-500 mt-2 font-mono">
            Application: Recumend • Effective Date: November 2026
          </p>
        </header>

        {/* 1. Introduction */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-900">1. Introduction</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Recumend ("we", "our", or "us") operates the Recumend platform available via web. This Privacy Policy outlines how we collect, handle, protect, and process user data when you access or interact with Recumend. We are committed to transparency, minimal data collection, and end-to-end cryptographic privacy.
          </p>
        </section>

        {/* 2. Information We Collect */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-900">2. Information We Collect</h2>
          <div className="space-y-2 text-sm text-stone-600 leading-relaxed">
            <p>
              When you authenticate using <strong>Google OAuth 2.0</strong>, we receive basic identity profile details authorized by you:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Email Address:</strong> Used solely to authenticate your account and ensure secure sessions.</li>
              <li><strong>Display Name & Profile Picture:</strong> Displayed on your public community recommendations and profile leaderboard.</li>
            </ul>
            <p className="pt-1">
              We do <strong>not</strong> collect phone numbers, government IDs, physical addresses, or financial/payment information.
            </p>
          </div>
        </section>

        {/* 3. Google Drive AppData Scope & Zero-Knowledge Architecture */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-zinc-900">3. Google Drive AppData Scope Usage</h2>
          </div>
          <div className="space-y-3 text-sm text-stone-600 leading-relaxed bg-stone-50 border border-stone-200 rounded-2xl p-5">
            <p>
              Recumend requests access to the Google OAuth scope:{' '}
              <code className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 text-xs font-mono">
                https://www.googleapis.com/auth/drive.appdata
              </code>
            </p>
            <p>
              <strong>Strict Scope Isolation:</strong> This permission provides access <em>strictly and exclusively</em> to Recumend’s isolated Application Data Folder inside your Google Drive. Recumend has <strong>zero access</strong> to your personal Google Drive files, photos, folders, documents, or spreadsheets.
            </p>
            <p>
              <strong>Zero-Knowledge Client-Side Encryption:</strong> Private watchlist items are encrypted directly inside your browser using the standard Web Crypto API (AES-GCM 256-bit). The encryption keys are securely stored in your personal Google Drive AppData folder in a file named <code className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 text-xs font-mono">recumend_vault.json</code>. Unencrypted private items and private encryption keys are <strong>never</strong> transmitted to or stored on Recumend servers.
            </p>
          </div>
        </section>

        {/* 4. Google API Services User Data Policy & Limited Use Disclosure */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-900">
            4. Google API Limited Use Disclosure
          </h2>
          <div className="space-y-3 text-sm text-stone-600 leading-relaxed border-l-2 border-emerald-600 pl-4 py-1">
            <p className="font-medium text-zinc-900">
              Recumend's use and transfer of information received from Google APIs to any other app will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-700 underline font-medium hover:text-emerald-900"
              >
                Google API Services User Data Policy
                <ExternalLink className="w-3 h-3" />
              </a>
              , including the <strong>Limited Use</strong> requirements.
            </p>
            <ul className="space-y-2 pt-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>User-Facing Features Only:</strong> We only use Google user data to provide and improve user-facing features prominent in the Recumend interface (account authentication and encrypted personal watchlist synchronization).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Advertising Ban:</strong> We do not use or transfer Google user data for serving advertisements, including personalized, retargeted, or interest-based ads.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>No Human Reading:</strong> We do not allow humans to read user data obtained via Google APIs, unless we have obtained your affirmative agreement for specific troubleshooting, it is necessary for security purposes (such as investigating abuse), or to comply with applicable law.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>No AI/ML Model Training:</strong> Information received through Google APIs is never used to develop, improve, or train generalized artificial intelligence (AI) or machine learning (ML) models.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* 5. Data Sharing & Third Parties */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-900">5. Data Sharing & Third Parties</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            We do <strong>not</strong> sell, rent, monetize, or trade your personal data, Google credentials, or watchlist items to any third parties, brokers, or advertisers. Public recommendations you voluntarily share on Recumend are visible to other community members, along with your public display name and avatar.
          </p>
        </section>

        {/* 6. Local Storage & Cookies */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-900">6. Cookies & Client-Side Storage</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Recumend does not use tracking cookies, third-party analytics pixels, or advertising beacons. We use client-side local storage strictly for functional authentication sessions and local UI preferences.
          </p>
        </section>

        {/* 7. Data Retention, Revocation & Deletion */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-900">7. Data Retention & Deletion Rights</h2>
          <div className="space-y-2 text-sm text-stone-600 leading-relaxed">
            <p>
              Users have full control over their data at all times:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Revoke Access Anytime:</strong> You can disconnect Recumend and revoke OAuth permissions immediately through your{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 underline font-medium hover:text-emerald-900"
                >
                  Google Account Permissions
                  <ExternalLink className="w-3 h-3" />
                </a>.
              </li>
              <li>
                <strong>Delete Google Drive AppData:</strong> You can delete all data stored in your Google Drive AppData folder by visiting Google Drive on the web &gt; Settings &gt; Manage Apps &gt; Recumend &gt; Options &gt; "Delete hidden app data".
              </li>
              <li>
                <strong>Account & Data Deletion:</strong> You can delete any of your recommendations directly in the UI. For complete removal of your account, profile, and database records, contact us directly at the email listed below and we will process the deletion within 48 hours.
              </li>
            </ul>
          </div>
        </section>

        {/* 8. Children's Privacy */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-900">8. Children's Privacy</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Recumend is not directed to individuals under the age of 13. We do not knowingly collect personal identifiable information from children under 13.
          </p>
        </section>

        {/* 9. Contact Us */}
        <section className="space-y-3 border-t border-stone-200 pt-6">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-zinc-900">9. Contact & Inquiries</h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">
            For questions, data deletion requests, or security inquiries regarding this Privacy Policy, please contact the application maintainer:
          </p>
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs font-mono text-stone-700 space-y-1">
            <div><strong>Application:</strong> Recumend</div>
            <div><strong>Developer Contact:</strong> abhshekmaurya1999@gmail.com</div>
            <div><strong>Project Repository:</strong> github.com/addy015/recumend</div>
          </div>
        </section>
      </div>
    </div>
  )
}

