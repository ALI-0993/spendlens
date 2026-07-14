# SpendLens

**AI-powered personal finance dashboard for Indian users** — upload bank and UPI statements, automatically categorize transactions, and get clear visual insights into your spending.

🔗 **Live Demo:**

---

## Overview

SpendLens takes raw bank/UPI statement exports (CSV and PDF) and turns them into an interactive dashboard — showing where your money actually goes, month over month, category by category. Built specifically with Indian banking and UPI transaction formats in mind (Swiggy, Zomato, Paytm, GPay, etc.).

## Features

- 📂 **CSV or PDF Upload** — drag and drop bank/UPI statement exports
- 🏷️ **Auto-Categorization** — transactions sorted into spending categories automatically
- 📊 **Interactive Dashboard** — visual breakdown of spending via charts
- 💰 **INR-Native** — built around Indian currency formatting and transaction patterns
- ⚡ **Fast & Local-First** — all parsing happens client-side, no data leaves your browser (Phase 1)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| State Management | Zustand |
| Charts | Recharts |
| CSV Parsing | Papa Parse |
| Testing | Vitest, Playwright |

## Project Status

🚧 **Actively in development.** Currently in **Phase 1** — core CSV or PDF upload, parsing, categorization, and dashboard functionality.

**Roadmap:**
- [x] Phase 1 — CSV upload, parsing, categorization, dashboard & charts
- [ ] Phase 2 — Google OAuth, JWT auth, AI-powered chat insights
- [ ] Phase 3 — Migrate to Next.js (SSR)
- [ ] Phase 4 — PWA support, offline mode
- [ ] Phase 5 — Desktop app (Tauri)
- [ ] Phase 6 — Mobile app (React Native / Expo)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/ALI-0993/spendlens.git
cd spendlens

# Install dependencies
npm install

# Run the dev server
npm run dev
```

## Author

Built by Ali Asgar Ora Wala — https://www.linkedin.com/in/ali-asgar-ora-wala/