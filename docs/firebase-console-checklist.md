# ENGRAM — Exact Firebase Console Checklist
**Project: `german-fairy-tales`** · Complete these in order. Every step cites the exact console path.

---

## 1 · Authentication — Google sign-in
**Path:** `Authentication → Sign-in method`
1. Click the **Sign-in method** tab.
2. In the providers list, click **Google**.
3. Toggle **Enable** ON.
4. Under **Project support email**, select the Google account you used to create the project (this becomes the OAuth consent screen's developer contact).
5. Click **Save**.

> Without step 4, Google sign-in fails with `auth/operation-not-allowed` at runtime.

## 2 · Authentication — authorized domains
**Path:** `Authentication → Settings → Authorized domains`
1. Click **Add domain**.
2. Add each host your app is served from — **no protocol, no path, no trailing slash**. Required entries:
   - `german-fairy-tales.firebaseapp.com` *(pre-authorized, keep)*
   - `german-fairy-tales.web.app` *(pre-authorized, keep)*
   - Your production host, e.g. `engram.yourdomain.com`
   - If you also answer at the apex and `www`, add **both** (`yourdomain.com`, `www.yourdomain.com`).
3. Click **Add**.

> Sign-in from any other domain fails with `auth/unauthorized-domain`.

## 3 · Cloud Firestore — create the database
**Path:** `Firestore Database → Create database`
1. Click **Create database**.
2. Choose **Start in production mode** (your rules file is already correct — do not use test mode).
3. **Region selection — pay attention here:** your project carries `databaseURL: …german-fairy-tales.firebaseio.com`, which marks it as non-`us-central1`, most likely **Europe (europe-west1)**. Firestore requires a compatible location for such projects. Pick as appropriate:
   - `europe-west1 (Belgium)` — if the wizard presents it (ideal for EU players)
   - `europe-west3 (Frankfurt)` — accepted for most european legacy projects
   - `northeurope1 (St. Ghislain)` is NOT a Firestore region — do not confuse it.
4. Click **Enable**.

> A location cannot be changed after creation. If the wizard constrains your choices, copy exactly what region you deployed to here: `____________`.

## 4 · Cloud Firestore — security rules
**Path:** `Firestore Database → Rules`
1. Delete the default template.
2. Paste the **entire contents** of the project's `firestore.rules` file.
3. Click **Publish**.

> Or from a terminal: `npx firebase-tools deploy --only firestore:rules` (after `firebase login` + `firebase use german-fairy-tales`).

## 5 · Firestore indexes — none needed
Private save sync is a single-document transaction; the leaderboard queries are single-collection `where` + `limit`, which Firestore serves without composite indexes. **Index creation: skip.** The collection `leaderboards/{mode}/entries/{uid}` is created automatically by the first score submission.

## 6 · Analytics — enable and assign app
**Path:** `Analytics → Dashboard` (or `Project Settings → Integrations → Google Analytics`)
1. If prompted, **Enable Google Analytics** and link to an Analytics account (create one free).
2. Ensure the Web app `1:594722722272:web:4e36b456d8e83574afdb85` appears under **Data Streams**. If not: `Project Settings → Your apps → Web app → Enable Analytics`.
3. No further setup — custom events (`run_start`, `run_end`, `duel_create`, `duel_accept`, `duel_result`, `stage_reached`, `fever_start`, `new_best`, `share_card`, `streak_day`) flow automatically once enabled.

> Analytics data takes 24–48h to appear in dashboards. Realtime view (`Analytics → Realtime`) shows events within seconds — use it to verify.

## 7 · App Check (recommended before launch, NOT before first smoke-test)
**Path:** `App Check → Apps`
1. Register the Web app with **reCAPTCHA Enterprise**.
2. Set enforcement to **Monitor** (NOT Managed/Enforced) for Firestore and Auth.
3. Ship to a small cohort, watch the App Check metrics for a week, then raise to **Enforced**.

> Enforcing immediately can lock out legitimate players whose environment can't complete the token exchange.

## 8 · Billing alerts (mandatory for a public leaderboard)
**Path:** `Google Cloud Console → Billing → Budgets & alerts` (project `german-fairy-tales` must be billing-linked; Firestore and App Check require Blaze plan — Firebase calls this the "pay-as-you-go" plan)
1. Create a budget of e.g. **$5 USD**.
2. Set alerts at 50%, 90%, 100%.
3. Add your email.

> Per-player cost of this design is one 1-document transaction per merge + one leaderboard write per personal best. Normal daily use costs fractions of a cent per user. The alert is not because it will be expensive — it's because an unguarded public write endpoint invites script abuse.

---

## Smoke-test the four systems (5 minutes, deployed URL)
| Test | Pass condition |
|---|---|
| **Sign-in** | Click CONTINUE WITH GOOGLE → popup completes → main screen shows **SIGNED IN AS …** chip with your avatar |
| **Cloud sync** | Play a run in one browser → open the same deployed app in an incognito window → sign in same account → XP/scores converge |
| **Leaderboard** | After run ends (score > 0) while signed in → open **VIEW GLOBAL LEADERBOARD** on main screen → your entry appears; sign out → leaderboard is still readable (public) |
| **Analytics** | Open Firebase `Analytics → Realtime`, trigger one run on your phone → `run_start`, `run_end`, `stage_reached` appear within ~30s |

---

## One thing I could not do for you
Steps 1–4 and 7–8 happen inside the Firebase/Google Cloud consoles under your identity. I wrote the code, rules, and this checklist; the console clicks require your Google session (2FA). Total time: roughly 20 minutes. Everything after a successful smoke-test in the table above is pure gameplay — invite someone to a duel and watch the analytics light up.
