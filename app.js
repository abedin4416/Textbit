import "dotenv/config";
import express from "express";
import path from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import argon2 from "argon2";
import crypto from "crypto";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(import.meta.dirname, "public")));

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    databaseURL: process.env.PUBLIC_FIREBASE_DATABASE_URL,
  });
}
const db = getDatabase();

function error(res, status, msg){return res.json({status:status, msg:msg});}
async function insertdb(field, name, data, unique=1){
  const userRef = db.ref(`${field}/${name}`);
  try{
    const result = await userRef.transaction((e)=>{
      if(unique && e !== null) return;
      return data;
    });
    return result;
  }catch(err){throw error}
}


app.get("/config", (req, res)=> {
    res.json({
        apiKey:process.env.PUBLIC_FIREBASE_API_KEY,
        authDomain:process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL:process.env.PUBLIC_FIREBASE_DATABASE_URL,
        projectID:process.env.PUBLIC_FIREBASE_PROJECT_ID
    });
});

app.post("/search", async (req, res)=>{
  try{
    const {username} = req.body;
    const result = await db.ref(`users/${username}`).once("value");
    if(!username || !result.exists()) return error(res, 404, "User not found");
    const data = result.val();
    return res.json({status:200,fullname:data.fullname});
  }catch(err){return error(res, 500, "Internal server error");}
});

app.post("/signup", async (req, res)=>{
  try{
    const {fullname, username, password} = req.body;
    const session = crypto.randomUUID();
    const hashed = await argon2.hash(password);
    const expires = new Date(Date.now()+1*24*60*60*1000);
    const expiresAt = expires.toISOString();
    const data = await insertdb("users", username, {fullname: fullname,password:hashed});
    if(!data.committed) return error(res, 400, "Username not available");
    const sdata = await insertdb("sessions", username, {session:session, expires:expiresAt}, 0);
    res.cookie("session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expires,
    });
    if(sdata.committed) return res.json({status:200});
  }catch(err){return error(res, 500, "Internal server error");}
});

app.get("*", (req, res) => {
    res.sendFile(path.join(import.meta.dirname, "public", "index.html"));
});

if (process.env.VERCEL !== '1') app.listen(3000);
export default app;