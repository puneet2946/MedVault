# MedVault AI — Patient Application

This directory contains the primary Next.js + Capacitor application for **MedVault AI**.

For complete architecture, setup instructions, database schema details, security audit notes, and deployment commands, please see the primary repository documentation:

👉 **[MedVault Primary README](../README.md)**

---

### Quick Commands Reference

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run linting check
npm run lint

# Production web build
npm run build

# Mobile static export (Capacitor target)
OUTPUT_EXPORT=true npm run build

# Standalone Gemini connectivity test
node --env-file=.env test-gemini.js
```

### Environment Configuration

Configure your local environment files before running:
- `medvault_patient/.env.local`:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
  ```
- `medvault_patient/.env`:
  ```env
  GEMINI_API_KEY=your-gemini-api-key
  ```
