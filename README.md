# 🚀 CareerOS — AI-Powered Career Intelligence Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-orange?logo=google)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-green?logo=supabase)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-blue?logo=tailwindcss)

**AI-driven career analysis • Resume parsing • Job matching • Career simulations**

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Career Agent** | Conversational AI conducts structured career interviews using Gemini 2.5 Flash |
| 📄 **Resume Intelligence** | Upload PDF → AI parsing → skill extraction → ATS scoring |
| 💼 **Smart Job Matching** | Aggregates from LinkedIn, Indeed, Naukri via RapidAPI |
| 📊 **Career Simulations** | Interactive salary projections, market demand, risk indicators |
| 🎯 **Semantic Matching** | Vector embeddings + cosine similarity for job-resume matching |
| 🗺️ **Career Roadmaps** | AI-generated career progression paths with timelines |

## 🏗️ Architecture

```
User → Next.js Frontend (React 19 + TailwindCSS 4)
           ↓
      API Routes (Node.js)
           ↓
    ├── Google Gemini API (AI Chat + Resume Parsing)
    ├── RapidAPI (Job Aggregation)
    ├── Supabase (Postgres + pgvector)
    └── AWS S3 (Resume Storage)
```

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Language:** TypeScript 5
- **Styling:** TailwindCSS 4 + shadcn/ui
- **Animation:** Framer Motion
- **Charts:** Recharts
- **State:** Zustand
- **Data Fetching:** TanStack React Query
- **AI:** Google Gemini 2.5 Flash
- **Database:** Supabase (Postgres + pgvector)
- **Storage:** AWS S3
- **Job APIs:** RapidAPI (LinkedIn, Indeed, Naukri)

## 📁 Project Structure

```
careeros/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── layout.tsx               # Root layout
│   │   ├── globals.css              # Global styles + glassmorphism
│   │   ├── api/
│   │   │   ├── chat/route.ts        # AI chat (streaming)
│   │   │   ├── resume/route.ts      # Resume upload + parse
│   │   │   ├── jobs/route.ts        # Job search aggregation
│   │   │   └── match/route.ts       # Semantic matching
│   │   └── dashboard/
│   │       ├── layout.tsx           # Dashboard shell
│   │       ├── page.tsx             # Simulation dashboard
│   │       ├── chat/page.tsx        # AI career agent
│   │       ├── resume/page.tsx      # Resume analysis
│   │       └── jobs/page.tsx        # Job matches
│   ├── components/
│   │   ├── providers/               # React Query provider
│   │   └── ui/                      # shadcn/ui components
│   ├── lib/
│   │   ├── constants.ts             # Role configs, salary simulation, ATS scoring
│   │   ├── gemini.ts                # Gemini AI client
│   │   ├── s3.ts                    # AWS S3 client
│   │   ├── supabase.ts              # Supabase client
│   │   ├── types.ts                 # TypeScript types
│   │   └── utils.ts                 # Utilities
│   └── stores/
│       ├── chat-store.ts            # Chat state (Zustand)
│       ├── jobs-store.ts            # Jobs state (Zustand)
│       └── profile-store.ts         # Profile state (Zustand)
└── supabase/
    └── schema.sql                   # Database schema + pgvector
```

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd careeros
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable | Service | Required |
|----------|---------|----------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/) | ✅ |
| `RAPIDAPI_KEY` | [RapidAPI](https://rapidapi.com/) | Optional (mock data fallback) |
| `NEXT_PUBLIC_SUPABASE_URL` | [Supabase](https://supabase.com/) | For persistence |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | For persistence |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | For persistence |
| `AWS_ACCESS_KEY_ID` | AWS | For resume storage |
| `AWS_SECRET_ACCESS_KEY` | AWS | For resume storage |
| `AWS_REGION` | AWS | For resume storage |
| `S3_BUCKET_NAME` | AWS | For resume storage |

### 3. Database Setup

Run `supabase/schema.sql` in your Supabase SQL Editor to create tables, indexes, and RLS policies.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Build for Production

```bash
npm run build
npm start
```

## 🎨 Design System

- **White-tone professional** theme (Glassdoor-inspired)
- **Glassmorphism** effects throughout (glass cards, frosted navbars)
- **Gradient accents** (indigo → purple)
- **Framer Motion** animations and transitions
- **Responsive** mobile-first design

## 📊 Key Formulas

**Salary Projection:**
```
salary_year_n = base_salary × (1 + growth_rate)^n
```

**ATS Score:**
```
score = keyword_coverage × 0.5 + role_alignment × 0.3 + experience_weight × 0.2
```

**Job Matching:**
```
match_score = cosine_similarity(resume_embedding, job_embedding)
```

## 🚢 Deployment

### Vercel (Recommended)

```bash
npx vercel
```

Set environment variables in Vercel dashboard.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## 📜 License

MIT

---

<div align="center">
Built with ❤️ using Next.js, Gemini AI, and TypeScript
</div>
