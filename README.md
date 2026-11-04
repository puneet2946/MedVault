# MedVault AI — Secure Medical Records Vault & Clinical Intelligence

> **Hackathon Project Submission**  
> **Repository:** [https://github.com/puneet2946/MedVault](https://github.com/puneet2946/MedVault)  
> **Application Package:** `medvault_patient`

---

## 1. Project Introduction & Problem Statement

### The Problem
Patients and caregivers frequently struggle with fragmented medical records scattered across paper receipts, PDF attachments, laboratory portals, and physical envelopes. When patients attempt to review their own lab results:
- Clinical reports are dense with medical jargon and confusing abbreviations.
- Reference ranges, abnormal flags, and physiological implications are difficult to interpret without guidance.
- Patients often feel anxious or unprepared when discussing reports during brief clinical appointments.
- Existing consumer health apps frequently mishandle privacy, upload unprotected files to public buckets, or employ brittle client-side API keys.

### The Solution: MedVault AI
**MedVault AI** is a privacy-first, zero-trust personal health records vault and clinical document intelligence assistant. It enables patients to securely upload, organize, view, and analyze medical records (laboratory blood panels, diagnostic imaging reports, pathology results, and clinical summaries). 

Using Google Gemini Multimodal AI (`gemini-2.5-flash`) hosted behind an authenticated serverless Supabase Edge Function, MedVault extracts structured observations, explains complex terms in plain language, highlights out-of-range parameters, and prepares thoughtful questions for the patient's next clinical visit—all while strictly enforcing medical safety guardrails (no diagnosing, no medication changes, and mandatory clinician disclaimers).

---

## 2. Key Features

- **End-to-End Authenticated Vault**:
  - Secure authentication via Google OAuth 2.0 and Email/Password with PKCE flow.
  - Multi-tab navigation with animated transitions: Home, Health Insights, Document Vault, Vitals Tracker, and Profile.
- **Private Document Management**:
  - Direct upload of multi-format medical reports (PDF, PNG, JPEG, WebP) up to 20MB.
  - Private Supabase Storage bucket with strict per-user folder isolation (`<patient_uuid>/records/<record_uuid>.<ext>`).
  - Row Level Security (RLS) guaranteeing that patients can only access their own records.
- **In-App Document Viewer & Secure Downloads**:
  - Short-lived signed URLs (`createSignedUrl`) generated dynamically on demand.
  - Embedded PDF and image viewer with inline zoom, full-screen capability, and authenticated download triggers.
- **Multimodal Clinical Extraction (Gemini 2.5 Flash)**:
  - Multimodal document analysis via Supabase Edge Runtime (`analyze-medical-report`).
  - Strict medical safety prompt rules: no medical diagnoses, no therapy changes, no assumed values, and strict laboratory reference range boundaries.
  - Extracts document type, observation date, high-level summary, key findings, and clinical measurement tables.
  - Generates patient-friendly explanations for medical jargon and suggested questions to ask physicians.
- **Database Caching & Reopening**:
  - Completed extractions are persisted in `public.report_analyses`.
  - Reopening an analyzed document displays the saved analysis instantly without redundant inference calls or additional API token consumption.
- **Multi-Language Support**:
  - Built-in internationalization supporting English, Hindi, Spanish, French, and German.
- **Emergency SOS Quick-Dial**:
  - Immediate emergency alert countdown with audio siren cues and emergency dispatch linking (`112`).
- **Capacitor Mobile Ready**:
  - Configured for cross-platform deployment to Android devices via `@capacitor/android`.

---

## 3. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | Next.js 16 (App Router), React 19 |
| **Styling & Icons** | Tailwind CSS 4, Google Material Symbols, Plus Jakarta Sans |
| **Backend & Database** | Supabase (PostgreSQL 15, PostgREST, GoTrue Auth) |
| **Object Storage** | Supabase Storage (Private bucket: `medical-records`) |
| **Authorization & Security** | PostgreSQL Row Level Security (RLS) with UUID ownership |
| **Edge Functions** | Supabase Edge Runtime (Deno, TypeScript) |
| **AI Inference** | Google Gemini Developer REST API (`gemini-2.5-flash`), `@google/genai` SDK |
| **Mobile Runtime** | Capacitor 8 (Android build support) |

---

## 4. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MedVault Client (Next.js)                       │
│      Google OAuth / PKCE Auth  │  Tailwind CSS 4  │  Capacitor         │
└───────────────┬───────────────────────────────┬────────────────────────┘
                │                               │
        1. Auth & Metadata               2. Signed URLs / Upload
                │                               │
                ▼                               ▼
┌───────────────────────────────┐     ┌──────────────────────────────────┐
│     Supabase PostgreSQL       │     │     Supabase Storage (Private)   │
│  - public.profiles            │     │  Bucket: medical-records         │
│  - public.medical_records     │     │  Path: <user_id>/records/<doc_id>│
│  - public.report_analyses     │     │  Access: Authenticated RLS only  │
│  RLS: auth.uid() = patient_id │     └─────────────────┬────────────────┘
└───────────────▲───────────────┘                       │
                │                                       │
         5. Store Analysis                       4. Download File
                │                                       │
                └───────────────┐       ┌───────────────┘
                                │       │
                    ┌───────────┴───────▼───────────┐
                    │     Supabase Edge Function    │
                    │   (analyze-medical-report)    │
                    │  - Verifies Caller JWT        │
                    │  - Confirms Record Ownership  │
                    │  - Zero PHI Logging           │
                    └───────────────┬───────────────┘
                                    │
                             3. REST Payload (Base64)
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │    Google Gemini API Engine   │
                    │      Model: gemini-2.5-flash  │
                    │    Multimodal Document Parser │
                    └───────────────────────────────┘
```

### Architectural Principles:
1. **Zero Client Secret Exposure**: Neither `GEMINI_API_KEY` nor Supabase `service_role` keys are ever shipped to the browser or bundled in client-side code.
2. **Server-Enforced Ownership**: The Edge Function validates the caller's JWT directly against Supabase Auth. It verifies that `medical_records.patient_id === auth.uid()` before retrieving files or initiating analysis.
3. **Private Object Storage**: Raw medical records are never publicly reachable. Access is granted strictly via short-lived signed URLs generated through authenticated RPCs.
4. **Resilient Dual-Mode Build**: Supports full-stack Next.js development and dynamic routes, while seamlessly generating static assets for Capacitor mobile builds (`OUTPUT_EXPORT=true`).

---

## 5. Project Structure

```text
MedVault/
├── .env                                  # Root environment variables (git-ignored)
├── .gitignore                            # Repository ignore rules (protects all .env*)
├── README.md                             # Repository submission documentation
│
└── medvault_patient/                     # Main Next.js + Capacitor Application
    ├── package.json                      # Project dependencies & build scripts
    ├── next.config.mjs                   # Conditional export configuration
    ├── jsconfig.json                     # Path alias configuration (@/* -> ./src/*)
    ├── test-gemini.js                    # Standalone Gemini connectivity test script
    │
    ├── src/
    │   ├── app/                          # Next.js App Router
    │   │   ├── page.js                   # Landing page, authentication tabs & guest mode
    │   │   ├── layout.js                 # Root HTML shell & viewport metadata
    │   │   ├── home/page.js              # Home dashboard, health metrics & quick actions
    │   │   ├── health/page.js            # Medical report upload, vault cards, sample previews
    │   │   ├── vault/page.js             # Encrypted records vault, search, View/Download/AI
    │   │   ├── tracker/page.js           # Vital signs tracker & device logs
    │   │   ├── profile/page.js           # Patient profile, emergency contacts & settings
    │   │   ├── auth/
    │   │   │   ├── callback/page.js      # Robust PKCE deduplicated exchange handler
    │   │   │   └── reset-password/page.js# Password reset interface
    │   │   └── api/
    │   │       └── gemini/health/route.js# Server-side Gemini API connectivity check
    │   │
    │   ├── components/
    │   │   ├── AuthGuard.js              # Protected route gatekeeper
    │   │   ├── DocumentViewerModal.js    # Secure signed-URL document preview modal
    │   │   └── ReportAnalysisModal.js    # Gemini clinical extraction & cache display modal
    │   │
    │   ├── context/
    │   │   ├── AuthContext.js            # Supabase Auth provider (Google OAuth, PKCE, Email)
    │   │   └── LanguageContext.js        # Multi-language localization state
    │   │
    │   ├── lib/
    │   │   └── gemini.js                 # Centralized Gemini SDK, safety prompts & health check
    │   │
    │   └── utils/
    │       ├── aiAnalysis.js             # Edge Function invocation & database cache queries
    │       ├── documentAccess.js         # Short-lived signed URL generator & download trigger
    │       ├── uploadRecord.js           # Storage upload & medical_records table insertion
    │       └── supabase/
    │           ├── client.js             # Browser Supabase client singleton (@supabase/ssr)
    │           └── server.js             # Server-side Supabase client factory
    │
    ├── supabase/
    │   ├── functions/
    │   │   └── analyze-medical-report/   # Production Deno Edge Function
    │   │       └── index.ts              # Gemini 2.5 Flash multimodal extraction backend
    │   └── migrations/
    │       └── 20261102000000_initial_schema.sql # Complete PostgreSQL schema, RLS & tables
    │
    └── android/                          # Native Android Capacitor wrapper project
```

---

## 6. Prerequisites

Ensure you have the following installed on your local machine:
- **Node.js**: `v20.x` or later (tested on Node v20 - v24)
- **npm**: `v10.x` or later
- **Supabase Account**: A free Supabase project ([supabase.com](https://supabase.com))
- **Google Gemini API Key**: A valid key from Google AI Studio ([aistudio.google.com](https://aistudio.google.com/))
- **Git**: For version control

---

## 7. Step-by-Step Local Installation & Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/puneet2946/MedVault.git
cd MedVault/medvault_patient
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Create your local environment configuration file in `medvault_patient/.env.local`:
```bash
cp .env.example .env.local  # or create manually as shown in Section 8
```

Also create a `.env` file in `medvault_patient/.env` to configure your server-side Gemini key:
```bash
echo "GEMINI_API_KEY=your_gemini_api_key_here" >> .env
```

---

## 8. Environment Variables

> [!IMPORTANT]
> Never commit real secrets or `.env` files to Git. All `.env*` files are strictly ignored by `.gitignore`.

### `medvault_patient/.env.local` (Client & Next.js Server)
```env
# Supabase Public Configuration (Safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key-here
```

### `medvault_patient/.env` (Server-Side Only)
```env
# Google Gemini Developer API Key (Never exposed to browser or client bundle)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Override Gemini Model (Defaults to gemini-2.5-flash)
GEMINI_MODEL=gemini-2.5-flash
```

---

## 9. Supabase Configuration, Migrations & Storage

### 1. Execute Database Migrations
In your Supabase project dashboard, open the **SQL Editor** and run the contents of:
`medvault_patient/supabase/migrations/20261102000000_initial_schema.sql`

This script establishes:
- `public.profiles`: Patient profile records automatically provisioned on user signup.
- `public.medical_records`: Document records with file size, MIME type, storage path, and processing status.
- `public.report_analyses`: Extracted clinical findings, summaries, and parameters with foreign key constraints.
- `public.medications`, `public.vitals`, `public.health_events`, `public.emergency_contacts`.
- Strict PostgreSQL **Row Level Security (RLS)** policies ensuring authenticated users can only view and mutate their own data.

### 2. Configure Storage Bucket
1. Go to **Storage** > **Buckets** in your Supabase Dashboard.
2. Ensure a bucket named **`medical-records`** exists.
3. Configure the bucket as **Private** (Public access disabled).
4. Apply the following Storage RLS policies (included in the migration file):
   - **SELECT**: Allow users to read objects in their own folder:
     ```sql
     (bucket_id = 'medical-records' AND auth.uid()::text = (storage.foldername(name))[1])
     ```
   - **INSERT**: Allow authenticated users to upload to their own folder:
     ```sql
     (bucket_id = 'medical-records' AND auth.uid()::text = (storage.foldername(name))[1])
     ```

### 3. Configure Authentication Redirects
In **Authentication** > **URL Configuration**:
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - `https://your-production-domain.com/auth/callback`

---

## 10. Gemini AI Integration & Edge Function Deployment

MedVault uses Google's officially supported `gemini-2.5-flash` model for document interpretation. The inference runs securely inside the Supabase Edge Function `analyze-medical-report`.

### 1. Test Local Gemini Connectivity
Verify your Gemini API key and model connectivity using the included standalone script:
```bash
cd medvault_patient
node --env-file=.env test-gemini.js
```
*Expected output: `SUCCESS: PONG`*

### 2. Set the Gemini Secret in Supabase
Run the following Supabase CLI command (replace `<project-ref>` with your Supabase Project ID):
```bash
npx supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here --project-ref <project-ref>
```

### 3. Deploy the Edge Function
Deploy the `analyze-medical-report` function to your Supabase project:
```bash
cd medvault_patient
npx supabase functions deploy analyze-medical-report --project-ref <project-ref>
```

---

## 11. Development & Production Commands

### Run Development Server
```bash
cd medvault_patient
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Verify Gemini Server Health Endpoint
```bash
curl http://localhost:3000/api/gemini/health
```

### Run Code Quality & Lint Checks
```bash
npm run lint
```

### Build for Web Production
```bash
npm run build
```

### Build for Capacitor Mobile Export
```bash
OUTPUT_EXPORT=true npm run build
```

---

## 12. Security Considerations

- **Private Storage Isolation**: Files are stored under `<auth.uid()>/records/<record_id>.<ext>`. Storage RLS checks the first folder segment against the authenticated caller's UID.
- **Signed URL Access**: Document binaries are never publicly accessible via direct URL. Temporary signed URLs expire in 60 seconds.
- **Zero Client Credential Leakage**: No Gemini API keys or Supabase service-role keys are prefixed with `NEXT_PUBLIC_` or included in frontend code.
- **Medical AI Guardrails**:
  - Strict prompts prohibit automated clinical diagnosis or prescriptions.
  - Extracted lab measurements are classified strictly as `normal`, `high`, `low`, or `inconclusive` according to the printed reference range on the report itself.
  - Prominent clinical disclaimers remind patients that AI summaries are organization aids and require clinician review.
- **Stateless Privacy**: Analysis payloads are transmitted directly to the model over HTTPS and saved strictly to the patient's private database row. No patient data is logged to server stdout or analytics tools.

---

## 13. Known Limitations

- **Maximum Document Size**: File uploads are restricted to a maximum of 20MB per document to ensure reliable client upload and edge processing.
- **Supported File Types**: Supports single-document or multi-page PDFs, JPEGs, PNGs, and WebP images. Specialized DICOM radiology archives require conversion to standard imaging formats prior to upload.
- **Edge Function Cold Starts**: Initial invocation of a Supabase Edge Function may incur a 1-2 second cold start latency before multimodal streaming begins.
- **Connectivity Prerequisite**: Live AI document extraction requires an active internet connection to communicate with the Supabase Edge Runtime and Google Gemini Developer API.

---

## License

This project is submitted for hackathon evaluation and licensed under the [MIT License](LICENSE).

