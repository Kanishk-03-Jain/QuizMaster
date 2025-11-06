# QuizMaster

A modern, full-stack quiz application built with Next.js and Supabase, designed for teachers to create and manage quizzes and students to take them.

## Features

### For Teachers
- **Create Quizzes**: Build quizzes with multiple question types:
  - Multiple choice questions
  - True/False questions
  - Short answer questions
- **Quiz Management**: Edit, publish, and manage your quizzes
- **Quiz Analytics**: View detailed analytics and student performance
- **Join Codes**: Generate unique join codes for students to access quizzes
- **Dashboard**: Manage all your quizzes from a centralized dashboard

### For Students
- **Take Quizzes**: Participate in quizzes using a clean, intuitive interface
- **Join Quizzes**: Use join codes to access available quizzes
- **View Results**: See detailed results and feedback for completed quizzes
- **Previous Attempts**: Review your quiz history and past attempts
- **Dashboard**: Access all available quizzes and your quiz history

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI / shadcn/ui
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Analytics**: Vercel Analytics

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18+ and npm/pnpm
- A Supabase account and project
- Git

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "st proj code"
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the database migration scripts in order:
   - `scripts/001_create_tables.sql` - Creates all tables and RLS policies
   - `scripts/002_add_quiz_join_code.sql` - Adds join code functionality
   - `scripts/003_add_question_options_insert_policy.sql` - Adds insert policy for question options
   - `scripts/004_verify_question_options_rls.sql` - Verifies RLS policies
   - `scripts/005_add_quiz_attempts_update_policy.sql` - Adds update policy for quiz attempts

3. Configure Supabase environment variables:
   - Create a `.env.local` file in the root directory
   - Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

```bash
npm run build
npm start
# or
pnpm build
pnpm start
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── student/           # Student-facing pages
│   ├── teacher/           # Teacher-facing pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── student/          # Student-specific components
│   ├── teacher/          # Teacher-specific components
│   └── ui/               # Reusable UI components
├── lib/                   # Utility functions and configurations
│   └── supabase/         # Supabase client setup
├── scripts/               # Database migration scripts
└── public/                # Static assets
```

## Database Schema

The application uses the following main tables:

- **profiles**: User profiles with roles (teacher/student)
- **quizzes**: Quiz information and metadata
- **quiz_questions**: Individual questions within quizzes
- **question_options**: Multiple choice options for questions
- **quiz_attempts**: Student quiz attempts
- **student_answers**: Individual answers submitted by students

All tables have Row Level Security (RLS) enabled to ensure data privacy and proper access control.

## Authentication

The application uses Supabase Auth with the following features:

- Email/password authentication
- OAuth callback support
- Role-based access control (teacher/student)
- Protected routes via middleware

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run info-metrics` - Compute information metrics

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue in the repository or contact the development team.

---

Built with ❤️ using Next.js and Supabase

