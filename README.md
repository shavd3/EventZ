<div align="center">

# EventZ

### Event Planning Timeline & Budget Organiser

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)

A full-stack web application for planning and coordinating events end-to-end — from timeline and task management to budget tracking and guest organisation.

</div>

---

## Features

| Module | Description |
|---|---|
| **Timeline** | Visual event timeline with milestone tracking |
| **Schedule** | Day-of schedule builder with time slots |
| **Tasks** | Task list with assignments and completion tracking |
| **Assignments** | Delegate responsibilities to team members |
| **Budget** | Expense tracking and budget overview |
| **Guest Management** | Separate guest lists per venue |
| **Settings** | Event configuration and preferences |

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router) with TypeScript
- **UI**: React 19 + [Tailwind CSS v4](https://tailwindcss.com) + [Lucide Icons](https://lucide.dev)
- **Database**: [Supabase](https://supabase.com) (PostgreSQL with Row Level Security)
- **Utilities**: [date-fns](https://date-fns.org), [react-select](https://react-select.com)
- **Deployment**: [Vercel](https://vercel.com)

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

```bash
# Clone the repo
git clone https://github.com/shavd3/EventZ.git
cd EventZ

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Add your Supabase URL and anon key to .env.local

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ADMIN_PASSWORD=choose_a_strong_password
```

> `ADMIN_PASSWORD` gates the entire app via `src/proxy.ts`. It is **required** — if it is unset the
> app fails closed and every route redirects to `/login`, which will report the missing config.
> Set it locally and in your Vercel project settings.

---

## Project Structure

```
src/
├── app/
│   ├── timeline/          # Event timeline view
│   ├── schedule/          # Day-of schedule
│   ├── tasks/             # Task management
│   ├── assignments/       # Role assignments
│   ├── budget/            # Budget tracker
│   ├── church-guests/     # Venue A guest list
│   ├── cinnamon-grand-guests/ # Venue B guest list
│   └── settings/          # App settings
├── components/            # Shared UI components
└── lib/
    ├── supabase.ts        # Supabase client
    └── types.ts           # TypeScript types
```

---

<div align="center">
Made with Next.js + Supabase
</div>
