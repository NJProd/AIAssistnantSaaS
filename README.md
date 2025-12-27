# 🏪 KatzAI - Retail AI Assistant

AI-powered assistant for hardware retail employees. Ask questions, get product recommendations from your actual inventory.

## Stack

- **Next.js 14** - Frontend + API (one app)
- **Vercel** - Hosting (free)
- **PostgreSQL** - Database (Neon.tech free tier)
- **Gemini** - AI (free tier)

## Deploy to Vercel (5 minutes)

### 1. Setup Database

1. Go to [neon.tech](https://neon.tech) → Create account
2. Create project "katzai"
3. Copy connection string

### 2. Get Gemini API Key

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create API key

### 3. Deploy

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Add environment variables:
   - `DATABASE_URL` = your Neon connection string
   - `JWT_SECRET` = any 32+ character string
   - `GEMINI_API_KEY` = your Gemini key
4. Deploy

### 4. Seed Database

After deploy, run in Vercel dashboard → Functions → Console:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

Or locally:
```bash
npm install
npx prisma db push
npm run db:seed
```

## Login

| Role | Email | Password |
|------|-------|----------|
| Employee | employee@demo-store.com | Demo123! |
| Manager | manager@demo-store.com | Demo123! |

## Local Development

```bash
npm install
cp .env.example .env.local  # Add your keys
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Project Structure

```
KatzAI/
├── app/
│   ├── page.tsx           # Login
│   ├── assistant/         # Chat UI
│   └── api/               # API routes
│       ├── auth/
│       ├── assistant/
│       └── inventory/
├── lib/
│   ├── db.ts              # Prisma client
│   ├── auth.ts            # JWT helpers
│   └── ai.ts              # Gemini
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── package.json
```
