import "dotenv/config";
import express from "express";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(import.meta.dirname, "public")));

admin.initializeApp({
    credential:admin.credential.cert({
        projectId:process.env.FIREBASE_PROJECT_ID,
        clientEmail:process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    databaseURL:process.env.PUBLIC_FIREBASE_DATABASE_URL
});

const db = admin.database();

app.get("/config", (req, res)=> {
    res.json({
        apiKey:process.env.PUBLIC_FIREBASE_API_KEY,
        authDomain:process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL:process.env.PUBLIC_FIREBASE_DATABASE_URL,
        projectID:process.env.PUBLIC_FIREBASE_PROJECT_ID
    });
});

app.get("*", (req, res) => {
    res.sendFile(path.join(import.meta.dirname, "public", "index.html"));
});

if (process.env.VERCEL !== '1') app.listen(3000);
export default app;