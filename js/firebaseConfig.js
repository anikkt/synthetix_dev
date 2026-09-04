/* ============================================================
   FIREBASE CONFIG
   Replace every value below with your own, from:
   Firebase Console > Project Settings (gear icon) > General > Your apps > Web app
   These values are meant to be public in client-side code — Firebase security
   comes from Firestore Security Rules + Auth, not from hiding this object.
   Safe to commit this file to a public GitHub repo as-is once filled in.
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyD39-d20BMYP1myfTmgODx9DIy4rPdYSCE",
  authDomain: "synthetix-e87b7.firebaseapp.com",
  projectId: "synthetix-e87b7",
  storageBucket: "synthetix-e87b7.firebasestorage.app",
  messagingSenderId: "307837929902",
  appId: "1:307837929902:web:1607f6da3793380d62e03f",
  measurementId: "G-HBH58YFZFH"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
