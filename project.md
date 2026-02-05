# Library Project — Product Spec

> **Status:** Setup started. React + Vite app in `app/` with Supabase client; login/sign-up (same screen) and main page (building + status controls) in place. Database tables and Realtime not yet added.

---

## 1. Overview

- **Project name:** (TBD)
- **One-line description:** A simple library location finder for BYU students—see who’s at the campus library and which floor they’re on, without texting everyone or sharing full device location.
- **Target users:** BYU students (and students from nearby schools who come to study) who want to find friends at the campus library by floor.
- **Platform:** Web app

---

## 2. Goals & Success

- **Problem we’re solving:** The campus library has 5 levels. When you go, you have to text a bunch of people to see if they’re there and which floor. Phone location sharing only shows *that* someone is in the library, not which level—and you don’t want to share location with lots of people all the time; you only care when they’re at the library.
- **Solution direction:** Users voluntarily report “I’m at the library” + which floor. Others can see who’s there and on which level—no mass texting, no full location sharing, only floor-level info when someone chooses to share it.
- **Success:** (TBD — e.g. “I can open the app and see which friends are on which floor without texting.”)

---

## 3. Core Functionality

*(To be filled from our conversations — as granular as possible.)*

### 3.1 Features (high level)

- User can set/update “I’m at the library” + which floor (1–5).
- User can see who else is at the library and which floor each person is on.
- No full device location—only voluntary “at library + floor” status.
- **Identity:** Username only for sign-in (see §4).
- **Who you see:** Friends only—mutual connections (they must accept); add by search by username. Can remove friends.
- **Privacy:** Only friends can see your “here” status.
- **Status:** Manual “here” / “not here” toggle; when “here,” user selects floor. You can change floor without toggling “not here” first. No auto-expiry.
- **Scope:** BYU campus library only (one venue). Floors: “Level 1” through “Level 5.”
- **Multi-device:** Last update wins if the same user updates from multiple devices.

### 3.2 User flows

- **Main view:** See a cartoon 5-story building with friends’ icons/avatars on the floor they’re on (§5).
- Set my status: toggle “here” → select Level 1–5; change floor anytime; toggle “not here” when leaving.
- Add friends: search by username → send request → they accept → mutual connection. Can remove a friend later.

### 3.3 Edge cases & rules

- Status is manual only: no automatic “left” or timeout—if someone forgets to toggle off, they may appear “here” until they fix it.
- Floor selection only relevant when status is “here”; when “not here,” floor is cleared/ignored.
- Friends list: mutual (both must be connected); either party can remove the connection. 

---

## 4. Data & Content

- **Track/display:** Who is “at the library” right now; which floor (Level 1–5) each person is on. Only friends see each other’s status.
- **User creates/updates:** Their own status: “here” or “not here”; when “here,” which floor (Level 1–5). Can change floor without toggling off. No full location—voluntary only.
- **Identity:** **Username only** for sign-in (no phone number).
- **Friends:** Mutual connections only (request → accept). Add by **search by username**. Either party can remove the connection. Only friends see your “here” status.
- **External data:** None in v1 (no library hours, etc.).

---

## 5. UI & Experience

- **Pages (few):**
  1. **Login page** — sign in and sign up on the same screen (username); e.g. form to log in with a link like “Don’t have an account? Sign up” that reveals or switches to sign-up on the same page.
  2. **Main page** — (a) A **cartoon 5-story building** with **friends’ avatars (initials)** on the floor they’re on; (b) controls for **your status:** say which floor you’re on or that you’re not there. So: one page for auth, one main page for the building + your floor / not-here status.
- **Avatars:** **Initials** for now (e.g. “JD” for John Doe).
- Must-have interactions on main page: Toggle here/not here, select floor (Level 1–5), add/accept/remove friends via search by username. (Friend list / add-friend UI can be a section or modal on the main page so we stay to a few pages.)

---

## 6. Technical Constraints & Preferences

- **Cost:** No paid services for this project—everything must be free (hosting, APIs, etc.).
- Must work on: (browsers, devices — TBD)
- Offline needed? Auth needed? (TBD)
- No phone number or contact sync in v1 (username-only).

### 6.1 Recommended tech stack (simple & free)

- **Frontend:** **React + Vite** — fast dev experience, simple to build the 5-story building UI, forms (login/sign-up, status, add friend), and friend list. Runs in any modern browser.
- **Backend / data:** **Supabase** (free tier) — PostgreSQL for users, friendships, and “here + floor” status; built-in **Realtime** so the building view updates when a friend changes floor without refreshing; **Auth** for sign-in/sign-up. Username-only login: use Supabase email/password auth under the hood with a generated email (e.g. `username@libraryapp.local`) so the user only types username + password; store display username in a `profiles` table.
- **Hosting:** **Vercel** (free) for the React app; Supabase hosts database, auth, and realtime.
- **Why this stack:** One backend (Supabase), one frontend (React), everything has a free tier, and Realtime gives a smooth “see who’s on which floor” experience without polling. Minimal moving parts.

---

## 7. Out of Scope (for now)

- Notifications (e.g. “a friend just arrived” or “on your floor”).
- Library hours / open-closed display.
- Phone number, contact sync, and SMS verification.
- Paid services or APIs.
- Other venues beyond BYU campus library.

---

## 8. Open Questions

- **Friends UI:** Add friend / friend requests / remove friend—all as part of the main page (e.g. sidebar, modal, or section) so we don't add extra pages.
- (Other details TBD when building.)

---

## 9. Setup / First steps (for development)

- **Run the app:** From repo root, `cd app && npm install && npm run dev`. Open the URL shown (e.g. http://localhost:5173).
- **Supabase:** Create a free project at [supabase.com](https://supabase.com), copy Project URL and anon key into `app/.env` (see `app/.env.example`). Optional: disable "Confirm email" in Auth settings so sign-up works without verification.
- **Next implementation:** Add tables (`profiles`, `friendships`, `library_status`), RLS, and Realtime subscription so the building and friends list use live data.

---

## Changelog

- **2026-02-04** — Created project.md; planning started.
- **2026-02-04** — Added overview, problem statement (5-level library, texting to find friends, want floor-only sharing), solution direction, initial features and data; added open questions (identity, who you see, leaving/expiry, floor labels).
- **2026-02-04** — Identity: username or phone number (support BYU + nearby schools). Who you see: friends you add or contact sync (contact sync only if free). Status: manual “here”/“not here” toggle + floor selection when here; floors “Level 1”–“Level 5”. Constraint: no paid services. Open question: contact sync on web for free vs add-by-number.
- **2026-02-04** — Sign-in: both username and phone number; no phone verification. Friends: mutual (accept required); add via contact sync (if free) or search by username; can remove. Privacy: only friends see “here” status. Scope: BYU library only. Can change floor without toggling off; last update wins. Out of scope: notifications, library hours. **Main UI:** cartoon 5-story building with friends’ icons on the floor they’re on. Open: contact sync feasibility, screen list, how avatars work.
- **2026-02-04** — **Username only** (no phone number). **Pages:** (1) Login, (2) Main page = building + your status (which floor or not there). **Avatars:** initials for now. Contact sync dropped. Open: sign-up on same page as login, friends UI as part of main page.
- **2026-02-04** — Sign-up on the same screen as login (e.g. “Don’t have an account? Sign up” on same page).
- **2026-02-04** — Tech stack chosen: React + Vite, Supabase, Vercel (§6.1). Setup: app in \`app/\`, Supabase client, LoginPage, MainPage, useAuth, §9 setup notes.
