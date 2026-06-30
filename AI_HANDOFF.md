# Fulbari Restora Attendance - Project Context & Handoff

This document is intended for future developers or AI agents (like Antigravity) working on this project. It provides a high-level overview of the architecture, recent completed tasks, and strict coding rules to maintain the integrity and aesthetic of the application.

## 📌 Project Overview
**Fulbari Restora Attendance** is a modern, precision-engineered terminal for restaurant staff management. 
- **Kiosk Portal (`/kiosk`)**: A touch-optimized terminal for daily staff clock-ins and attendance logging via secure PINs (and potentially biometrics/fingerprints).
- **Admin Portal (`/admin`)**: A control center to manage operations, staff profiles, slots, financials, and automated payroll records.

### Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Database Provider:** PostgreSQL (hosted on Supabase)
- **Styling:** Vanilla CSS (Glassmorphism design system)
- **Deployment:** Vercel

---

## ✅ Recently Completed Tasks
As of the last development session, the following major tasks have been completed:
1. **TypeScript Fixes:** Resolved build errors in the Kiosk page regarding potentially null fingerprint templates during array filtering.
2. **Secure Authentication Migration:** 
   - Moved PIN validation for Admin and Kiosk access from the client-side to a secure backend API (`/api/v1/auth-portal`).
   - Prevented PIN exposure in the frontend JavaScript bundle.
   - Ensured `sessionStorage` tracks auth state to prevent double-prompting between the homepage and protected routes.
3. **Database-Backed PIN Management:**
   - Updated the Prisma Schema with a `SystemConfig` model to store `adminPin` and `kioskPin`.
   - Created a secure API (`/api/v1/settings/pins`) to update these PINs.
   - Built a new UI in the Admin Dashboard (`/admin/settings`) to allow dynamic PIN updates without touching environment variables.

---

## 🛑 Strict Rules & Conventions for AI Agents

When contributing to this project, adhere to the following rules unconditionally:

### 1. Styling & Aesthetics (CRITICAL)
- **DO NOT USE TAILWIND CSS** unless explicitly requested by the user. The project relies on Vanilla CSS to maintain exact control over the design system.
- **Glassmorphism & Premium Feel:** The UI must feel state-of-the-art. Use glassmorphism (translucent backgrounds with blur), subtle gradients, vibrant accent colors, and dark mode optimizations.
- **Micro-animations:** Interactive elements must have smooth hover effects and transitions. Do not create static, boring interfaces. 

### 2. Security
- **Client vs. Server:** Never expose sensitive logic (like PIN checks, passwords, or raw database queries) in `"use client"` components. Always use secure Next.js API Routes (`/api/v1/...`) or Server Actions.
- **Auth State:** Admin and Kiosk access rely on verifying a PIN against the database and storing a temporary flag (`admin_auth` or `kiosk_auth`) in the browser's `sessionStorage`.

### 3. Database Operations (Prisma)
- The database is PostgreSQL hosted on Supabase, utilizing connection pooling (Transaction mode for queries, Session mode for schema changes).
- When altering the database schema (`prisma/schema.prisma`), you must apply changes using:
  ```bash
  npx prisma generate
  npx prisma db push
  ```
  *(Note: The project currently uses `db push` for rapid prototyping instead of formal migrations).*

### 4. File Structure
- `src/app/api/*`: Backend API routes.
- `src/app/admin/*`: Admin dashboard pages and layouts.
- `src/app/kiosk/*`: Kiosk terminal pages.
- `src/lib/*`: Shared utilities (e.g., `prisma.ts` for the singleton DB client).
- `globals.css`: Contains the core design system variables, animations, and utility classes (like `.glass`, `.glass-hover`, `.input-modern`). Leverage these existing classes before writing new CSS.
