import React from 'react'
import { Lock, ArrowLeft, ExternalLink, Mail, CheckCircle2, ShieldCheck } from 'lucide-react'

export default function LegalView({ onBack }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans text-stone-300">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-white mb-8 cursor-pointer transition-colors min-h-[40px]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Recumend
      </button>

      <div className="space-y-8 bg-[#141414] border border-white/[0.08] rounded-2xl p-6 sm:p-10 shadow-sm">
        <header className="border-b border-white/[0.08] pb-6">
          <h1 className="text-2xl sm:text-4xl font-bold font-display text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-zinc-400 mt-2 font-mono">
            Application: Recumend • Effective Date: November 2026
          </p>
        </header>

        {/* 1. Introduction */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">1. Introduction</h2>
          <p className="text-sm text-stone-400 leading-relaxed">
            Recumend ("we", "our", or "us") is a human-curated recommendation platform designed to help people discover and share their favorite culture, books, cinema, anime, and tools. We believe in minimal data footprint, zero advertising, and client-side cryptographic privacy for personal recommendations.
          </p>
        </section>

        {/* 2. Information We Collect */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">2. Information We Collect</h2>
          <div className="space-y-2 text-sm text-zinc-400 leading-relaxed">
            <p>
              When you choose to sign in using <strong className="text-white">Google OAuth 2.0</strong>, we request only basic, standard identity profile scopes (<code className="px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-200 text-xs font-mono">openid</code>, <code className="px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-200 text-xs font-mono">userinfo.email</code>, and <code className="px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-200 text-xs font-mono">userinfo.profile</code>):
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-zinc-200">Email Address:</strong> Used solely to identify your account and maintain authenticated sessions.</li>
              <li><strong className="text-zinc-200">Display Name & Profile Picture:</strong> Displayed alongside your voluntary public recommendations and community profile.</li>
            </ul>
            <p className="pt-2">
              <strong className="text-white">What We Do NOT Collect or Access:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>We do <strong>not</strong> request or access your Google Drive, personal files, photos, contacts, or documents.</li>
              <li>We do <strong>not</strong> collect phone numbers, physical addresses, financial details, or government IDs.</li>
            </ul>
          </div>
        </section>

        {/* 3. Client-Side Vault & Cryptographic Architecture */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-zinc-300" />
            <h2 className="text-lg font-bold text-white">3. Private Vault & Cryptographic Architecture</h2>
          </div>
          <div className="space-y-3 text-sm text-zinc-400 leading-relaxed bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <p>
              <strong className="text-zinc-200">Client-Side Authenticated Encryption:</strong> When you save an item to your "Private Vault", it is encrypted directly in your browser using the standard Web Crypto API with authenticated AES-GCM 256-bit encryption before any network transmission.
            </p>
            <p>
              <strong className="text-zinc-200">Zero Server Plaintext:</strong> Database records for private items store only random initialization vectors (IV) and scrambled ciphertext. Unencrypted titles, notes, and custom metadata are never accessible or readable by other users or database administrators.
            </p>
            <p>
              <strong className="text-zinc-200">Zero External Cloud Reliance:</strong> Encryption keys are derived mathematically inside your browser session using deterministic PBKDF2 cryptography (100,000 iterations of SHA-256). No external cloud drive access or file storage permissions are required.
            </p>
          </div>
        </section>

        {/* 4. Google API User Data & Limited Use Compliance */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-zinc-300" />
            <h2 className="text-lg font-bold text-white">4. Google API Compliance & Limited Use</h2>
          </div>
          <div className="space-y-3 text-sm text-zinc-400 leading-relaxed border-l border-white/20 pl-4 py-1">
            <p className="font-medium text-zinc-200">
              Recumend adheres strictly to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-white underline font-medium hover:text-zinc-300"
              >
                Google API Services User Data Policy
                <ExternalLink className="w-3 h-3" />
              </a>
              , including the Limited Use requirements:
            </p>
            <ul className="space-y-2 pt-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-stone-200">Functional Authentication Only:</strong> Google identity information is used exclusively to sign you in and display your public author handle.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-stone-200">Strict Advertising Ban:</strong> We do not use, transfer, or sell Google user data for advertising, remarketing, or broker profiling.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-stone-200">No Human Reading:</strong> No person reads your private items or profile data, except where required by law or requested explicitly by you for technical support.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-stone-200">No AI/ML Training:</strong> Your data is never used to train or refine artificial intelligence (AI) or machine learning (ML) models.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* 5. Data Sharing & Third Parties */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">5. Data Sharing & Third Parties</h2>
          <p className="text-sm text-stone-400 leading-relaxed">
            We do <strong>not</strong> sell, rent, monetize, or trade your personal information with third parties. Content you voluntarily publish to the Community Leaderboard is publicly visible to all visitors along with your chosen display name and username.
          </p>
        </section>

        {/* 6. Cookies & Client-Side Storage */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">6. Cookies & Client-Side Storage</h2>
          <p className="text-sm text-stone-400 leading-relaxed">
            Recumend does not use tracking cookies, advertising beacons, or third-party behavioral trackers. We use standard browser local storage strictly to keep your session authenticated and preserve UI preferences.
          </p>
        </section>

        {/* 7. Data Retention & Deletion Rights */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">7. Data Retention & Deletion Rights</h2>
          <div className="space-y-2 text-sm text-stone-400 leading-relaxed">
            <p>
              You maintain complete ownership and control over your content:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-stone-200">Item Deletion:</strong> You can delete any public or private recommendation directly from your dashboard at any time.
              </li>
              <li>
                <strong className="text-zinc-200">Revoke Google Access:</strong> You can revoke Recumend's access to your Google account at any moment through your{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-white underline font-medium hover:text-zinc-300"
                >
                  Google Account Permissions
                  <ExternalLink className="w-3 h-3" />
                </a>.
              </li>
              <li>
                <strong className="text-zinc-200">Full Account Deletion:</strong> To request permanent deletion of your profile and all associated database records, email us at the contact address below; requests are fulfilled within 48 hours.
              </li>
            </ul>
          </div>
        </section>

        {/* 8. Children's Privacy */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">8. Children's Privacy</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Recumend is not directed to children under the age of 13. We do not knowingly collect personal identifiable information from children under 13.
          </p>
        </section>

        {/* 9. Contact Us */}
        <section className="space-y-3 border-t border-white/[0.08] pt-6">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-zinc-400" />
            <h2 className="text-lg font-bold text-white">9. Contact & Inquiries</h2>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            For questions, security disclosures, or data deletion inquiries, please reach out to the developer:
          </p>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-xs font-mono text-zinc-300 space-y-1">
            <div><strong className="text-white">Application:</strong> Recumend</div>
            <div><strong className="text-white">Developer:</strong> abhshekmaurya1999@gmail.com</div>
          </div>
        </section>
      </div>
    </div>
  )
}
