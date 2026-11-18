# recumend

A privacy-first recommendation platform and personal curation vault. Curate what you love, explore community endorsements, share privately peer-to-peer, and lock personal picks in an encrypted client-side vault.

Website: [recumend.vercel.app](https://recumend.vercel.app)  
Android App: [Download latest APK](https://github.com/addy015/recumend/releases/latest)

---

## Features

- **Public Leaderboard:** Upvote-driven community recommendations across Movies, TV, Books, Anime, Games, YouTube channels, and Apps/Websites.
- **E2EE Private Vault:** Zero-knowledge vault encrypted in-browser using Web Crypto API (`AES-GCM-256`). Plaintext never hits the database.
- **P2P Recommendation Sharing:** Direct, encrypted recommendation sharing between friends using ephemeral `ECDH P-256` key exchange.
- **Custom Watch Order:** Reorder personal queues with boundary-safe touch drag on mobile and mouse drag on desktop.
- **Direct Export:** Clean, centered `.pdf` and `.txt` exports with zero telemetry or third-party wrappers.
- **Cross-Platform:** Available as a web app and an Android app (Capacitor) with offline fallback handling.

---

## Tech Stack

- **Frontend:** React 19, Tailwind CSS, Lucide Icons, Vite
- **Backend & Auth:** Supabase (PostgreSQL, Row-Level Security, Realtime) + Google OAuth
- **Cryptography:** Native Web Crypto API (`SubtleCrypto` — AES-GCM, ECDH P-256, PBKDF2)
- **Mobile:** Capacitor 8 (Android)

---

## Local Setup

### 1. Clone & Install
```bash
git clone https://github.com/addy015/recumend.git
cd recumend
npm install
```

### 2. Environment Variables
Create a `.env` file in the root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Test Suites
```bash
npm test
```
Runs 6 automated security, cryptographic vault, P2P sharing, feature, and Capacitor integration suites.

---

## Android Build (Capacitor)

```bash
# Build web assets and sync to native Android project
npm run build
npx cap copy android

# Open Android Studio or assemble APK
npx cap open android
```

---

## License

MIT
