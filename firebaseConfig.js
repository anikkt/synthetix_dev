/* ============================================================
   FIREBASE CONFIG
   Replace every value below with your own, from:
   Firebase Console > Project Settings (gear icon) > General > Your apps > Web app
   These values are meant to be public in client-side code — Firebase security
   comes from Firestore Security Rules + Auth, not from hiding this object.
   Safe to commit this file to a public GitHub repo as-is once filled in.
   ============================================================ */
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_PROJECT.firebaseapp.com",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_PROJECT.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
