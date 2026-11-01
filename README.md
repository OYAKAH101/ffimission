# Mission of the Immaculate Nursery and Primary School Portal

A school portal for Mission of the Immaculate Nursery and Primary School, Sagamu. Administrators, teachers,
parents and pupils sign in with their **own** account and see only what that account is allowed to see.

- `src/` the website (React, Vite, Tailwind)
- `server/` the API and database layer (Node.js, Express, MongoDB)

> **Status: built, not yet run against a database.** The code is complete and its logic is tested
> (see "What has been tested"), but it was written in an environment with no MongoDB and no way to
> install packages, so the full system has **not been started end to end yet**. Follow "First run"
> below on your computer or server and fix anything it reports before real pupils' data goes in.

## How access is controlled

- Passwords are stored only as bcrypt hashes. The browser never stores a password or token: the
  session is an `HttpOnly` cookie, kept in MongoDB, with CSRF protection on every change request.
- The server loads the account on every request. The role is **never** taken from the browser.
- **Parents:** the server returns only pupils linked to that parent account (a parent with several
  children uses one account and switches between them). **Pupils:** only their own record.
  Asking for anyone else's pupil, even by typing the address, gets "not found".
- **Teachers:** only classes they teach. **Administrators:** everything.
- Pupil photographs are kept in the database (no public folder) and served only after the same permission check.
- Sign-in is rate-limited, an account locks for 15 minutes after 5 wrong passwords, and the error
  message is the same whether the account exists or not.
- Staff and parent accounts get a random temporary password and **must** choose their own at first sign-in. Pupil
  passwords are issued by the administrator, who can look them up (see below).

## First run (on your computer)

Needs Node.js 20.6 or newer and a MongoDB (a free MongoDB Atlas cluster, or Docker below).

```bash
# 1. Database (skip if you use Atlas)
cd server && docker compose up -d

# 2. Configure the server
cp .env.example .env          # then edit .env: set MONGODB_URI, SESSION_SECRET and CREDENTIAL_KEY
                              # (two different long random values; see the comments in .env.example)
npm install

# 3. Create the first administrator (prints a temporary password ONCE)
npm run create-admin -- --name "Your Name" --email you@yourschool.org

# 4. Start the API
npm run dev                   # http://localhost:5000

# 5. In a second terminal, start the website
cd ..                         # project root
npm install
npm run dev                   # http://localhost:5173  (proxies /api to the server)
```

Sign in as the administrator, choose a new password, and you will see the (empty) admin dashboard.

## Adding your pupils and giving each one a login (admin screen)

Sign in as the administrator and open **Pupil records**:

1. **Classes:** click *Add Creche to Primary 6* (or add your own class names).
2. **Add a pupil:** enter first and last name, choose the **class**, optionally choose a **photo**, and click
   *Add pupil and create login*. Each pupil gets their own username (from the admission number, e.g.
   `imm-2026-0001`) and their own random password, different from everyone else's.
3. **Login details:** the administrator can open this list at any time (*Show passwords*), copy a pupil's login or
   *Download CSV*. Give each pupil only their own line.
4. **Pupils do not change their password.** They sign in with the one they were given and see only their own
   records: their class timetable, homework, results, attendance and fees. Pupils in different classes see
   different content because the class decides it. A pupil can be moved to another class from the same table.
5. **Photos:** choose one while adding, or use *Add photo* / *Change photo* on the pupil's row (JPEG, PNG or WebP,
   under 3 MB). Photos are private.
6. **New password:** if a password gets out, click *New password* on that pupil's row. The old one stops working
   at once and the new one appears in Login details.

### How the administrator can read passwords, and the trade-off

Normally a system can never show a password again. Here the school office wants to look them up (the pupils
are young children who will not change them), so for **pupil logins only** the password is also kept
**encrypted** (AES-256-GCM) with `CREDENTIAL_KEY`, a secret in `server/.env` that is not in the database.
Signing in still checks the usual one-way hash. Be aware of what this means:

- Whoever controls the **administrator account** can read every pupil password. Give it a long, unique password,
  keep it to one or two people, and never share it.
- Someone who got both the database **and** the `CREDENTIAL_KEY` could read them too. Keep `.env` private and back
  the key up separately: if it is lost, stored passwords can no longer be read (you can issue new ones).
- Opening the list is written to the activity log (who and when, never the passwords).
- Staff and parent accounts are **not** treated like this: they get a temporary password and choose their own.
- Do not reuse a pupil password anywhere else.

## Entering results, attendance and notices (admin and teachers)

These screens let the school type in what pupils and parents then see on their own pages.

1. **Set the current term** (administrator, once per term): *Results* > *Current term* > *Change term*, for
   example `2026/2027`, First Term. Scores and registers are filed under it.
2. **Subjects:** on the Results screen choose a class and click *Add the usual subjects* (a typical list for
   Creche/Nursery and for Primary, which is an assumption you can edit) or add your own, one at a time.
3. **Results:** choose class and subject, type each pupil's CA (0 to 40) and exam (0 to 60) score, and click
   *Save scores*. Totals show as you type. A pupil with both boxes empty is skipped; a half-filled row is refused.
   Saving again corrects earlier scores. The pupil's page then shows the score, grade, average and class position.
4. **Attendance:** choose class and date, mark pupils late or absent (everyone starts present) and click
   *Save register*. Past registers can be corrected. Future dates are refused.
5. **Notices:** the administrator can write to everyone, a group, a class or one pupil; a teacher can write to a
   class they teach.

Who may do what: the administrator can enter anything for every class. A **class teacher** can enter all subjects
and take the register for their class. A **subject teacher** can enter only their own subjects and cannot take the
register. A teacher is refused (as "not found") for any class they do not teach. Teacher accounts and their class
assignments are still created by the import (`classes.csv`, `staff.csv`; see `server/data/import-templates/`).
Screens to assign teachers inside the portal are not built yet.

## Sending notices (admin screen)

Open **Notices** to write a title and message and choose who gets it: everyone, all parents, all pupils, all
teachers, **one class** (its pupils and their parents) or **one pupil** (and their parents). It then appears on the
recipients' own dashboards; other families never see it. The administrator can delete a notice.

## Loading many records at once (pupils, photos, classes, results ...)

1. Copy the templates from `server/data/import-templates/` into `server/data/import/` and fill them
   in (Excel or Google Sheets, then **Save as CSV**). Photos go in `server/data/import/photos/`,
   named after the admission number, for example `IMM-2024-0142.jpg`.
2. Check, then load:

```bash
cd server
npm run import -- --check     # reports problems, changes nothing
npm run import               # loads everything
```

The import creates each pupil, class, parent and pupil login. Temporary passwords are written once to
`server/output/credentials-<time>.csv`: give each person only their own line, then delete the file.
Safe to repeat. Details and column rules: `server/data/import-templates/README.md`.

Forgot password: there is no email sending yet. The school office runs
`npm run reset-password -- --login <email or username>` and gives the person the new temporary password.

## Putting it online

```bash
npm run build                 # in the project root: creates dist/
cd server && NODE_ENV=production npm start
```

In production the server also serves the website from `dist/`, so one address serves everything and
cookies stay first-party. Needs **HTTPS** (hosts such as Render, Railway or a VPS with Caddy/Nginx
provide it) and `NODE_ENV=production`, a strong `SESSION_SECRET`, and a hosted MongoDB with backups.
Photographs are stored in the database, so a host with a wiped disk (such as the free Render plan) does not lose them.
See `DEPLOY.md` for step-by-step instructions (MongoDB Atlas + Render, or the included `Dockerfile`).

## What has been tested

- Server: 50 automated tests of the access rules, passwords, the password vault, notice targeting, pupil accounts, grading and ranking, CSV parsing and the
  import validators (`cd server && npm test`). All pass.
- Website: a browser test against a stand-in API (not the real server) confirmed sign-in, the forced
  password change, a parent seeing only their own children and switching between them, a pupil seeing
  only themselves, another family's pupil being refused, and empty states.
- The admin Pupil records and Notices screens were tested in the browser against a stand-in API: adding pupils
  with a photo in different classes, all-different passwords visible to the admin, CSV, password reset (old one
  stops working), pupils signing straight in and being unable to change the password, and notices to a class or
  one pupil reaching only the right people. The stand-in API is not the real server, so the same rules on the real
  server are covered only by its unit tests and still need a real run.
- The Results, Attendance and teacher notice screens were tested in the browser against the stand-in API: term
  setting, subjects, score limits and half-filled rows refused, a register with late/absent, pupils seeing only
  their own scores and attendance, a teacher limited to their own class, and a class notice reaching only that class.
- **Not yet tested:** the real server with MongoDB, the CSV import on real files, photo upload and
  display, and the production build. These are the first things to check on your first run.

## What works now

Sign-in, forced password change, sign-out; Admin, Teacher, Parent (multiple children) and Pupil
dashboards reading real records; results with grades and class position, attendance, fees and
payment status, homework, timetable, announcements; private photographs; data import.

## Still to build

- Screens to enter **homework, timetables, fees and payments** in the browser (results, registers and notices
  are built). Assigning teachers to classes inside the portal. Adding pupils, classes, logins, photos and sending notices is built (see above). Today records are loaded by the import and the dashboards
  display them. Sidebar entries for these open a "planned, not built" page.
- Email sending (password reset links, notices) and online fee payment.
- Report-card PDFs, audit-log screen, an admin screen to manage accounts.
- A security review and a penetration test before launch, a backup routine, and the school's written
  data-protection process for children's records and photographs (Nigeria Data Protection Act 2023).
- The grading scale (A to F boundaries) and the score split (CA 40 / exam 60) are **assumptions**:
  confirm them with the school and change `server/src/lib/grades.js` and `constants.js`.
