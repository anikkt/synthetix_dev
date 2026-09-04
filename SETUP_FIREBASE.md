# Firebase Setup — one-time steps

You said you already have a Firebase project. Here's exactly what to do in it before this app will work.

## 1. Get your config values

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and open your project.
2. Click the **gear icon** (top-left, next to "Project Overview") → **Project settings**.
3. Scroll down to **Your apps**.
   - If there's no web app yet: click the **`</>`** (web) icon, give it any nickname (e.g. "DataViz Platform"), skip the Firebase Hosting checkbox, click **Register app**.
4. You'll see a code block containing `const firebaseConfig = { apiKey: "...", ... }`. Copy those six values.
5. Open `js/firebaseConfig.js` in this project and paste your six values in, replacing the `REPLACE_WITH_...` placeholders.

These values are **not secret** — they're meant to be visible in client-side code. Firebase's actual security comes from the rules in step 4 below, not from hiding this file. Safe to commit it to GitHub as-is once filled in.

## 2. Enable Email/Password sign-in

1. In the left sidebar: **Build → Authentication**.
2. Click **Get started** if you haven't already.
3. Go to the **Sign-in method** tab.
4. Click **Email/Password**, toggle it **Enable**, click **Save**.

## 3. Create your own login

1. Still in Authentication, go to the **Users** tab.
2. Click **Add user**.
3. Enter your email and a password. This is what you'll type into the app's login screen.

(There's no self-signup screen in this app on purpose — accounts are meant to be created by an admin, matching the Admin/Analyst/Viewer model. For now, that's you, manually, via this Users tab.)

## 4. Create the Firestore database

1. Left sidebar: **Build → Firestore Database**.
2. Click **Create database** if you haven't already.
3. Choose **Production mode** (not test mode — we're providing real rules below).
4. Pick a region close to you, click **Enable**.

## 5. Set the security rules

1. In Firestore Database, go to the **Rules** tab.
2. Delete whatever's there and paste in the contents of `firestore.rules` (included in this repo).
3. Click **Publish**.

Without this step, Firestore defaults to denying everything (if you chose Production mode) or allowing everything (if you chose Test mode) — neither of which is what you want.

## 6. Open the app

Open `index.html` (or your deployed GitHub Pages URL). You should see a login screen. Sign in with the email/password you created in step 3.

## What's *not* done yet

- **No self-signup, no "forgot password" flow, no admin UI for inviting users.** Right now every signed-in user gets `role: 'admin'` automatically and full access to their own data — that's Phase 1 (auth + storage foundation) working as intended, not a bug. Analyst/Viewer roles and sharing dashboards between users need Firestore rules changes and an admin panel, which is deliberately a separate phase.
- **Local folder connect still uses IndexedDB**, not Firestore — that's correct on purpose, since a folder handle is tied to one specific browser/device and can't be meaningfully stored in the cloud.
