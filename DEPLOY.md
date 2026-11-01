# Putting the portal online (step by step)

You need three things: the project on **GitHub**, a free **MongoDB Atlas** database, and a host that runs
Node.js (**Render** is described here; Railway or any host that can run the included `Dockerfile` also works).
Everything below can be done from a phone or computer browser except step 4.

## 1. Database (MongoDB Atlas)

1. Create a free account at mongodb.com/atlas and make a free cluster (M0).
2. **Database Access** > add a database user with a password (use letters and numbers only, to avoid
   characters that break the connection address).
3. **Network Access** > add `0.0.0.0/0` (allow from anywhere). Hosts such as Render do not have a fixed
   address; the database user's password is what protects it.
4. **Connect > Drivers** and copy the connection string. Put the database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/immaculate_portal?retryWrites=true&w=majority`

## 2. Two secrets

On your computer, in the project folder: `cd server && npm install && npm run secrets`. It prints
`SESSION_SECRET=...` and `CREDENTIAL_KEY=...`. Save both somewhere private (a password manager).
Render can also generate them for you (the included `render.yaml` asks it to), but then copy them
from Render's *Environment* page and keep a copy: **if CREDENTIAL_KEY is lost, the stored pupil
passwords cannot be read** (you could still issue new ones).

## 3. Put the project on GitHub and deploy on Render

1. Create a **private** repository and upload the project folder (the contents, with `package.json`
   at the top level). Do not upload any `.env` file.
2. On render.com: **New + > Blueprint**, choose the repository. Render reads `render.yaml`.
3. When asked, paste `MONGODB_URI` from step 1. The other values are filled in for you.
   (Without the Blueprint: **New + > Web Service**, build command
   `npm install --include=dev && npm run build:host`, start command `npm start`, and add the
   environment variables `NODE_ENV=production`, `MONGODB_URI`, `SESSION_SECRET`, `CREDENTIAL_KEY`.)
4. Wait for the deploy to finish. Render gives you an address like
   `https://immaculate-school-portal.onrender.com`. Visiting `/api/health` should show `{"ok":true}`.

## 4. Create the administrator account (once, from your computer)

The free Render plan has no command line, so create the first admin from your own computer, pointing at
the same Atlas database:

```bash
cd server
npm install
cp .env.example .env     # set MONGODB_URI (same as Render), SESSION_SECRET and CREDENTIAL_KEY (same as Render)
npm run create-admin -- --name "Your Name" --email you@example.com
```

It prints a temporary password **once**. Open your Render address, sign in, and choose your own long
password. Then open **Pupil records**, add the classes and the 20 pupils.

## 5. Your own domain (optional)

In Render: **Settings > Custom Domains**, add e.g. `portal.yourschool.org` and create the DNS record Render
shows at the company where you bought the domain. HTTPS is set up automatically.

## Things to know

- **Free Render services sleep** after ~15 minutes without visitors; the first visit then takes about a
  minute. A paid plan stays awake.
- Pupil **photographs are stored in the database**, so redeploys never lose them. The free Atlas cluster has
  512 MB, enough for hundreds of photos.
- Turn on **backups** for the database before real records go in (Atlas paid tiers include them; on the free
  tier, export regularly).
- If the site shows "Server configuration is invalid" in Render's **Logs**, a setting is missing or
  too short: `SESSION_SECRET` and `CREDENTIAL_KEY` each need 32 or more characters.
- If sign-in does not stay signed in, check that you are using the **https** address.
- The real server has not yet been run by me (my workspace cannot install packages). If anything fails
  on your first deploy, copy the error from Render's Logs and send it to me.
