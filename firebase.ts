import admin from "firebase-admin";
import fs from "fs";

let serviceAccount;

if (process.env.FIREBASE_CONFIG) {
  serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
} else {
  serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export const db = admin.firestore();