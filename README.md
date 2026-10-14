# Club Reclamation Platform

React + TypeScript + Vite + Tailwind + Supabase (Auth, Postgres, RLS). Deploy on Vercel.

## 1. Supabase setup
1. Create a project at supabase.com.
2. **SQL Editor** → paste all of `supabase/schema.sql` → Run (safe to re-run).
3. **Authentication → Providers**: keep Email enabled. Keep **Confirm email** ON for production.
4. **Authentication → URL Configuration**: set *Site URL* to your Vercel URL (and add `http://localhost:5173` to *Redirect URLs* for local dev).
5. **Project Settings → API**: copy the *Project URL* and the *anon public* key. Never use or share the `service_role` key.

## 2. Local development
```bash
npm install
cp .env.example .env   # fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
npm run build          # production build (type-check + bundle)
```

## 3. Roles and privileges (trusted workflow, admin only)
Roles: `member`, `executive_member`, `dean`. Sign-up always creates a **member**; choosing "Executive member" only creates a pending request. Run these in the SQL Editor:
```sql
select id, username, role, department from public.profiles;       -- find the user
select public.approve_executive_request('<user-uuid>');           -- executive + the position requested at sign-up
select public.reject_executive_request('<user-uuid>');
select public.make_dean('<user-uuid>');                           -- the dean (never selectable in the UI)
```
Promoting someone by editing `role` in the Table Editor also works: the position they requested at sign-up is applied automatically (role `dean` always gets department `dean`).

**One-time fix for executives created before v2** (stuck in "Event"):
```sql
update public.profiles p set department = r.requested_department
from public.executive_requests r
where r.user_id = p.id and p.role = 'executive_member';
```
Users must sign out and in again to see a role change.

## 4. Security model and visibility rules
| | Complaints | Ideas |
|---|---|---|
| Member | submit, read own | submit, read own |
| Executive | submit, read own **+ all members' complaints** (only HR replies) | submit, read own |
| Executive HR | replies to **members'** complaints | — |
| Executive President | as executive | **reads all ideas, only one who replies** |
| Dean | **reads and replies to executives' complaints only** | reads all ideas (no reply) |
The dean does not submit complaints or ideas. Executives' own complaints are invisible to other executives.

- RLS on all tables; no UPDATE/DELETE granted to API roles; no INSERT/UPDATE policy on `profiles`.
- The client sends only `content` (+ the parent id for replies); sender, role, department, color, responder and responder title are set by triggers.
- Helper functions are `SECURITY DEFINER` with `search_path = ''`. Only the public anon key is used in the frontend.
- Colors: `department_colors` table + fallback map in `src/lib/config.ts`. Home image: replace `src/assets/home-hero.webp`.

## 5. GitHub
```bash
git init && git add . && git commit -m "Club reclamation platform"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## 6. Vercel
1. Vercel → Add New Project → import the GitHub repo (framework: Vite, build `npm run build`, output `dist`).
2. Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Deploy, then put the Vercel URL in Supabase *Site URL* (step 1.4).

## 7. Permission matrix
| Action | Member | Exec (non-HR) | Exec HR |
|---|---|---|---|
| Submit complaint | ✅ own | ✅ own | ✅ own |
| Read complaints | own only | all | all |
| Read replies | on own complaints | all | all |
| Reply | ❌ | ❌ | ✅ |
| Edit/delete complaint or reply | ❌ | ❌ | ❌ |
| Change own role/department | ❌ | ❌ | ❌ |

## 8. Test checklist (run after setup — "Actual" is yours to fill)
| # | Test | Expected | Actual |
|---|---|---|---|
| 1 | Register member with Event/Communication/HR | Account + member profile | |
| 2 | Choose Executive | 8 options listed; switching back to Member clears invalid choice | |
| 3 | `insert into profiles` / `update profiles set role='executive_member'` via API as user | Permission denied | |
| 4 | Register via API with `department='president'`, `requested_role='member'` | Rejected ("Invalid department for a member") | |
| 5 | Member submits + opens complaint | Visible with right color | |
| 6 | Member selects other users' complaints via API | 0 rows | |
| 7 | Any executive opens dashboard | Sees all complaints | |
| 8 | Non-HR exec / regular HR member inserts complaint reply via API | RLS violation | |
| 8b | Exec A reads exec B's complaints via API | 0 rows (only the dean sees them) | |
| 8c | Dean replies to a member's complaint | RLS violation | |
| 8d | Non-president/dean reads others' ideas; anyone but the president replies to an idea | 0 rows / RLS violation | |
| 8e | Approve a "president" request | Profile shows Executive · President | |
| 9 | Approved HR exec replies | Reply shown to sender and executives | |
| 10 | Insert complaint with forged `sender_id`/`color_code` | Column privilege denied | |
| 11 | Insert reply with forged `responder_id` | Column privilege denied | |
| 12 | `grep -r service_role src dist` | No match | |
| 13 | `npm run build` | ✅ verified in this environment | ✅ |
| 14 | Desktop and mobile layouts | Usable on both | |

## 9. Troubleshooting
- **"Supabase is not configured"** → `.env` missing/incorrect; restart `npm run dev`.
- **Profile could not be loaded** → `schema.sql` not run, or user created before the trigger existed (insert a profile manually or recreate the user).
- **No confirmation email** → check spam; Supabase's built-in mailer is rate-limited; configure custom SMTP for production.
- **Redirect to localhost after confirming** → fix *Site URL* / *Redirect URLs*.
- **Executive still sees member view** → sign out and in after approval.
