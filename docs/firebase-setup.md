# ENGRAM Firebase Setup

The app is already integrated with Firebase Authentication and Cloud Firestore. It remains fully playable with local saves when these values are absent.

The supplied project is `german-fairy-tales`, whose legacy Realtime Database location suggests **Europe-west1**. When you create Cloud Firestore for this project, keep an eye on the region selector and choose the corresponding compatible location (`europe-west1`, `europe-west3`, or `northeurope2`), since projects bound to a regional resource location often restrict which Firestore regions are available.

## 1. Create The Web App

1. Open the Firebase Console and select your project.
2. Open **Project settings**, then **Your apps**.
3. Register a Web app named `ENGRAM` if one does not exist.
4. Copy the `firebaseConfig` values.
5. Copy `.env.example` to `.env.local` and fill every value.

The Firebase Web API key is a public project identifier, not a server secret. Access is protected by Authentication, Firestore Security Rules, and optionally App Check. Never put Admin SDK credentials or service-account JSON in this frontend.

## 2. Enable Google Sign-In

1. Open **Authentication**, then **Sign-in method**.
2. Enable **Google** and select the project's support email.
3. Open **Authentication**, then **Settings**, then **Authorized domains**.
4. Add every production host, without protocol or path. Include the Firebase Hosting domain and the final custom domain.

ENGRAM uses `signInWithPopup` from a direct button click. This avoids the cross-origin storage problems that affect `signInWithRedirect` on Safari, Firefox, and modern Chrome when the app is hosted outside Firebase.

## 3. Create Firestore And Deploy Rules

1. Open **Firestore Database** and create a database in production mode.
2. Choose a region near most players. This cannot be changed later.
3. Install or invoke the Firebase CLI and authenticate:

```bash
npx firebase-tools login
npx firebase-tools use --add
```

4. Deploy the included owner-only rules:

```bash
npx firebase-tools deploy --only firestore:rules
```

The data path is:

```text
users/{firebaseAuthUid}/saves/main
```

Only the authenticated owner can read, write, or delete that document. No indexes are required for private save sync.

## 4. Build And Host

Build the app, then deploy the generated `dist/` folder:

```bash
npx firebase-tools deploy --only hosting
```

The included `firebase.json` points Hosting at `dist/` and preserves SPA routing. If you use another host, deploy `dist/` there and add its domain to Firebase Authentication.

## 5. Test The Real Sync Flow

1. Open the deployed app in Browser A and play one run.
2. Open **Sync / Backup**, sign in, and confirm the status says synced.
3. Open the deployed app in Browser B or a private profile and sign in with the same Google account.
4. Confirm XP, scores, streak, and best level merge into Browser B.
5. Create progress independently in both browsers, reconnect them, and confirm the highest stats plus both score entries survive.
6. Go offline, complete a run, return online, and confirm automatic sync completes.
7. Open `/delete-account.html`, follow the account manager link, and confirm deletion removes both the Firestore document and Firebase Authentication user.

## 6. Play Store Disclosures

The privacy policy ships at `/privacy.html`; the external account-deletion instructions ship at `/delete-account.html`.

In Google Play Data Safety, disclose:

- Optional account information: email address, user ID, display name, and profile photo from Google sign-in.
- Optional app activity: game progress, scores, XP, streak, and leaderboard entries.
- Purpose: account management and app functionality / cross-device synchronization.
- Data is encrypted in transit.
- Data is not sold and is not shared for advertising.
- Users can request deletion in the app and through the public deletion URL.

Replace the generic contact language in `public/privacy.html` with your real support email before publishing.

## 7. Recommended Before Scale

Enable Firebase App Check for the Web app using reCAPTCHA Enterprise. Enforce it only after monitoring valid traffic first, or older app builds may lose cloud access. App Check reduces scripted abuse but does not replace Security Rules.

Set budget alerts in Google Cloud Billing even if the project remains on the free tier. Cloud Sync uses one small document read and write per merge, so normal usage is inexpensive, but alerts protect against unexpected abuse.