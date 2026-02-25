# Allekirjoitus (Signature Service) 🖋️

Allekirjoitus is a modern, serverless Proof-of-Concept (PoC) for an electronic signature pipeline. It is designed around an **Ephemeral Pipeline** architecture, meaning it acts as a temporary processor for documents rather than a permanent storage vault. 

This approach guarantees zero storage costs at scale and maximizes privacy, while delivering a seamless, "DocuSign-like" user experience.

## The Architecture

1. **Frontend**: React + TypeScript + Vite. Deployed to GitHub Pages.
2. **PDF Processing**: All heavy PDF manipulation (stamping signatures, timestamps, and IP addresses) is offloaded to the user's browser using `pdf-lib`.
3. **Storage & Database**: Supabase (PostgreSQL + S3-compatible Storage).
4. **Email Delivery**: Supabase Edge Functions + Resend API.

## How the Pipeline Works

1. **Upload**: A user selects a PDF and inputs sender/recipient emails. The PDF is temporarily uploaded to a secure Supabase bucket.
2. **Notification**: A Supabase Edge Function emails the recipient a secure link to the application.
3. **Authentication**: The recipient opens the link and authenticates (currently simulated with `MockBankAuth.tsx`).
4. **Client-Side Stamping**: Upon successful login, the React app securely downloads the PDF, visually stamps it with the recipient's details using `pdf-lib`, and uploads the final version back to Supabase.
5. **Distribution**: The Edge function generates a 24-hour signed download URL for the finalized PDF and emails it to both parties.
6. **Auto-Purge**: (Future capability) A cron job/lifecycle hook deletes the PDF from the bucket after the 24-hour download window, freeing up the space. The text-based audit trail remains in the `documents` table.

## Local Development

**Prerequisites:**
You need a Supabase project and a Resend API key.

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   RESEND_API_KEY=your_resend_api_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Deploying

The frontend is deployed to GitHub Pages using the `npm run deploy` script (via the `gh-pages` package).

The email dispatch function is deployed to Supabase Edge Functions:
```bash
npx supabase functions deploy send-email --project-ref your_project_ref
npx supabase secrets set RESEND_API_KEY=your_resend_api_key --project-ref your_project_ref
```
