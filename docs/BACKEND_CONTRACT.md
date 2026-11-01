# API reference

The server in `server/` implements everything the website calls. All paths start with `/api`.
Non-GET requests need the `X-CSRF-Token` header (fetch one from `GET /auth/csrf`).

| Endpoint | Who | Returns |
| --- | --- | --- |
| `GET /auth/csrf` | anyone | `{ csrfToken }` |
| `POST /auth/login` | anyone | `{ user }` and sets the session cookie; 401 with one generic message for any failure |
| `GET /auth/me`, `POST /auth/logout` | signed in | `{ user }` / 204 |
| `POST /auth/change-password` | signed in | `{ user }`; required while `mustChangePassword` is true |
| `POST /auth/forgot-password` | anyone | 204 always; records the request for the school office |
| `GET /term` | signed in | current session and term |
| `GET /announcements` | signed in | only items for the caller's role |
| `GET /me/pupils` | parent, student | the caller's own pupils (a parent's children, or the pupil) |
| `GET /pupils/:id/overview` | allowed viewer | results, position, attendance, fees, homework, timetable |
| `GET /pupils/:id/photo` | allowed viewer | the image file |
| `GET /admin/summary` | admin | totals, enrolment per class, recent activity |
| `GET/POST /admin/classes`, `POST /admin/classes/standard` | admin | list, add one, or add Creche to Primary 6 |
| `GET /admin/pupils` | admin | every pupil with class, username and sign-in state (never a password) |
| `POST /admin/pupils` | admin | adds a pupil and their login; returns `credentials {username, password}` |
| `GET /records/classes` | admin, teacher | classes you may work on, their subjects, and the current term |
| `PUT /records/term` | admin | set the current session and term |
| `POST /records/classes/:id/subjects` | admin, class teacher | add subjects (`{subjects}` or `{usual:true}`) |
| `GET/PUT /records/results` | admin, teacher | read or save CA/exam scores for a class and subject (current term) |
| `GET/PUT /records/attendance` | admin, class teacher | read or save the register for a class and date |
| `POST /records/notices` | admin, teacher | notice to one class you may work on |
| `GET /admin/credentials` | admin | every pupil's username and password (decrypted); audit-logged |
| `POST /admin/announcements`, `DELETE /admin/announcements/:id` | admin | send a notice to a group, a class (`classId`) or a pupil (`pupilId`); remove it |
| `PATCH /admin/pupils/:id` | admin | change name or class |
| `POST /admin/pupils/:id/reset-password` | admin | new password (visible to the admin); old one dies, sessions end |
| `POST /admin/pupils/:id/photo` | admin | raw JPEG/PNG/WebP body, max 3 MB, checked by content |
| `GET /teacher/overview` | teacher | assigned classes, registers, marking progress |

Access rules live in one tested function, `server/src/lib/access.js`. A pupil you may not see is
reported as "not found", never "forbidden".
