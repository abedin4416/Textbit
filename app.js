import "dotenv/config";
import express from "express";
import path from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
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
async function newsession(res, username){
  const session = crypto.randomUUID();
  const expires = Date.now()+1*24*60*60*1000
  const data = await insertdb("sessions", session,{
    username:username, expires:expires
  });
  res.cookie("session", session,{
    httpOnly:true,
    secure:process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expires)
  });
  return data.committed;
}
async function getsession(session){
  const result = await db.ref(`sessions/${session}`).once("value");
  if(!result.exists()) return 0;
  const data = result.val();
  if(data.expires < Date.now()) return 1;
  else return data.username;
}

app.post("/search", async (req, res)=>{
  try{
    const {username} = req.body;
    const result = await db.ref(`users/${username}`).once("value");
    if(!username || !result.exists()) return error(res, 404, "User not found");
    const data = result.val();
    return res.json({status:200,fullname:data.fullname, profile:data.profile});
  }catch(err){return error(res, 500, "Internal server error");}
});

app.post("/signup", async (req, res)=>{
  try{
    const {fullname, username, password} = req.body;
    const hashed = await argon2.hash(password);
    const data = await insertdb("users", username, {fullname: fullname,profile:"default",password:hashed});
    if(!data.committed) return error(res, 400, "Username not available");
    const sdata = await newsession(res, username);
    if(sdata) return res.json({status:200});
  }catch(err){return error(res, 500, "Internal server error");}
});

app.get("/session", async (req, res)=>{
  try{
    const session = req.cookies?.session;
    if(!session) return error(res, 401, "No session");
    const username = await getsession(session);
    if(username==0) return error(res, 401, "No session");
    else if(username==1){
      await db.ref(`sessions/${session}`).remove();
      return error(res, 401, "No session");
    }
    const result = (await db.ref(`users/${username}`).once("value"));
    const data = result.val();
    let klist = {};
    if (!data.knowns || typeof data.knowns !== "object") data.knowns = {};
    const knowns = Object.keys(data.knowns);
    for(const k of knowns){
      const kdata = (await db.ref(`users/${k}`).once("value")).val();
      klist[k] = {fullname:kdata.fullname,profile:kdata.profile};
    }

    let inboxdata = (await db.ref(`inbox-${username}`).once("value")).val();
    if (!inboxdata || typeof inboxdata !== "object") inboxdata = {};
    for(const k of Object.keys(inboxdata)){
      const kdata = (await db.ref(`users/${k}`).once("value")).val();
      inboxdata[k].fullname = kdata.fullname;
      inboxdata[k].profile = kdata.profile;
    }

    const sortedKeys = Object.keys(inboxdata).sort((a, b) => {
        return (inboxdata[b].date || 0) - (inboxdata[a].date || 0);
    });

    const sortedInboxData = {};
    for (const k of sortedKeys) {
      sortedInboxData[k] = inboxdata[k];
    }

    if(result.exists()) return res.json({
      status:200,
      username:username,
      fullname:data.fullname,
      profile:data.profile,
      knowns:klist || {},
      inbox:sortedInboxData || {}
    });
  }catch(err){ error(res, 500, "Internal server error");}
});

app.post("/signin", async (req, res)=>{
  try{
    const {username, password} = req.body;
    const result = await db.ref(`users/${username}`).once("value");
    if(!result.exists()) return error(res, 401, "Invalid credentials");
    const data = result.val();
    const verify = await argon2.verify(data.password, password);
    if(!verify) return error(res, 401, "Invalid credentials");
    const sdata = await newsession(res, username);
    if(sdata) return res.json({status:200});
  }catch(err){error(res, 500, "Internal server error");}
});

app.post("/send", async (req, res)=>{
  try{
    const {receiver, content} = req.body;
    const sender = await getsession(req.cookies?.session);
    const rcvr = await db.ref(`users/${receiver}`).once("value");
    if(sender==0 || sender==1 || !rcvr.exists()) return;
    const sndr = await (await db.ref(`users/${sender}`).once("value")).val();
    await db.ref("messages").push().set({
      sender,
      receiver,
      content,
      date:Date.now(),
      seen:sender==receiver
    });
    await insertdb(`inbox-${receiver}`, sender, {
      fullname:sndr.fullname,
      profile:sndr.profile,
      content,
      date:Date.now(),
      seen:sender==receiver
    }, 0);
    await insertdb(`inbox-${sender}`, receiver, {
      fullname:rcvr.fullname,
      profile:rcvr.profile,
      content,
      date:Date.now(),
      seen:sender==receiver
    }, 0);
    return res.json({status:200});
  }catch(err){return error(res, 500, "Internal server error");}
});

app.get("/firebase-token", async (req, res)=>{
  try{
    const username = await getsession(req.cookies?.session);
    const auth = getAuth();
    if(username==0 || username==1) return error(res, 401, "Unauthorized");
    const token = await auth.createCustomToken(username, {username});
    return res.json({token});
  }catch(err){
    return error(res, 500, "Internal server error");
  }
});

app.post("/add-known", async (req, res)=>{
  try{
    const {username} = req.body;
    const session = req.cookies?.session;
    const sender = await getsession(session);
    if(sender==0 || sender==1) return error(res, 401, "Unauthorized");
    if(sender == username) return error(res, 400, "Cannot add yourself");
    const result = await db.ref(`users/${username}`).once("value");
    if(!result.exists()) return error(res, 404, "User not found");
    await db.ref(`users/${sender}/knowns/${username}`).set(true);
    return res.json({status:200});
  }catch(err){
    return error(res, 500, "Internal server error");
  }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(import.meta.dirname, "public", "index.html"));
});

if (process.env.VERCEL !== '1') app.listen(3000);
export default app;