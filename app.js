import express from "express";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

if(!admin.apps.length){
    admin.initializeApp({
        credential:admin.credential.cert({
            projectId:process.env.FIREBASE_PROJECT_ID,
            clientEmail:process.env.FIREBASE_CLIENT_EMAIL,
            privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        databaseURL:process.env.PUBLIC_FIREBASE_DATABASE_URL
    });
}

const db = admin.database();

app.get("/config", (req, res)=> {
    res.json({
        apiKey:process.env.PUBLIC_FIREBASE_API_KEY,
        authDomain:process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL:process.env.PUBLIC_FIREBASE_DATABASE_URL,
        projectID:process.env.PUBLIC_FIREBASE_PROJECT_ID
    });
});

app.get("*", (req, res)=>{
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(3000);
export default app;