# Loading school data

1. Copy the files you need from this folder into `server/data/import/` (create it).
2. Fill them in (Excel or Google Sheets, then **Save as CSV**). Keep the header row exactly as it is.
3. Put pupil photos in `server/data/import/photos/`.
4. Check, then load:

```bash
cd server
npm run import -- --check     # reports problems, changes nothing
npm run import                # loads everything
```

Safe to repeat: records are matched and updated, never duplicated. Rows with problems are skipped
and listed with their line number, so you can fix them and run again.

Dates are always written `YYYY-MM-DD` (for example `2026-09-14`). Money is whole naira with no
commas (`70000`). Class names must be spelled the same everywhere.

| File | What it holds | Notes |
| --- | --- | --- |
| `term.csv` | Terms. `current` = `yes` for the term being used now | One row is enough to start |
| `staff.csv` | Teachers (`role` = `teacher`) and extra administrators (`admin`) | Each gets a login |
| `classes.csv` | `name`, `order` (1 = youngest), `subjects` separated by `;`, `class_teacher_email` | Load staff first |
| `assignments.csv` | A subject teacher for one class | Optional |
| `pupils.csv` | Admission number, names, class, parents | See below |
| `results.csv` | `ca` 0 to 40, `exam` 0 to 60 per subject | `session`/`term` blank = current term |
| `fees.csv` | Fill `class` (whole class pays this) **or** `admission_no` (one pupil) | |
| `payments.csv` | Money received. `reference` (receipt/bank ref) is required and must be unique | Stops double-counting |
| `attendance.csv` | `status` = `present`, `absent` or `late` | One row per pupil per day |
| `homework.csv`, `timetable.csv` | Per class | `day` = Monday to Friday. A class's timetable is replaced by the file |
| `announcements.csv` | `audience` = Everyone, Parents, Teachers or Pupils | |

## pupils.csv

- `admission_no` is the pupil's permanent number and must be unique.
- **Pupil login:** leave `login` empty and the pupil gets a username made from the admission number
  (`IMM/2024/0142` becomes `imm-2024-0142`). Or put an email address or chosen username in `login`.
- **Parent login:** `guardian_email` is the parent's login. A parent with several children simply
  uses the same `guardian_email` on each child's row: one account, all children, with a switch on screen.
  A second parent or guardian goes in `guardian2_*`.
- **Photos:** name the file after the admission number: `IMM-2024-0142.jpg` (also `.png` or `.webp`, under 3 MB).

## Logins and passwords

New accounts get a random temporary password, written once to `server/output/credentials-<time>.csv`.
Hand each person only their own line, then delete the file. Everyone must choose their own password at
first sign-in. Passwords already set are never touched by a re-import.
