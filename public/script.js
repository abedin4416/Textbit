import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, onValue, off } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

window.user = {
    username: "amir",
    fullname: "Md Amir Abedin",
    knowns:{
        trump:{
            fullname:"Donald Trump"
        }
    }
}
async function listendb(callback){
    const app = initializeApp({
        apiKey:"AIzaSyDcF3ZD2-jcwtl25fIgBHo8Jp7ACUuXUaQ",
        databaseURL: "https://textbit-72506-default-rtdb.firebaseio.com/"
    });
    const auth = getAuth(app);
    const db = getDatabase(app);
    const data = await get("/firebase-token");
    if(!data.token) return;
    await signInWithCustomToken(auth, data.token);
    const inbox = ref(db, `inbox-${user.username}`);
    onValue(inbox, (snapshot)=>{
        callback(snapshot.val());
    });
}

const search = $("search");
const searchclr = $("search-clear");
const searchcont = $("search-content");
const searchres = $("search-result");
const searchload = $("search-loading");
const searcherr = $("search-error");
const inboxtitle = $("inbox-title");
const inboxoption = $("inbox-option");
const authcont = $("auth-content");
const fullname = $("fullname");
const username = $("username");
const password = $("password");
const authmsg = $("auth-msg");
const authswitch = $("auth-switch");
const submit = $("submit");
const inboxcont = $("inbox-content");
const chatcont = $("chat-content");

let lastColor = null;

function profile(a, b){
    if(b==="default"){
        style(a, "default-profile");
        const color = ["rgb(80, 220, 160)","rgb(160,80,220)","rgb(80,140,240)","rgb(240,90,100)"];
        let newColor;
        do{newColor = color[Math.floor(Math.random()*color.length)];}
        while(newColor === lastColor);
        lastColor = newColor;
        a.style.backgroundColor = newColor;
    }
    else {
        a.style.backgroundImage = `url('${b}')`;
    }
}
function inboxitem(data){
    const icon = document.createElement("div");
    const fn = div("", "inb-name", data.fullname);
    const st = div("", "inb-subtext", data.subtext);
    const io = document.createElement("div");
    io.classList.add(data.optionStyle || "inb-option");
    io.textContent = data.optionText;
    io.onclick = data.optionCallback;
    const content = document.createElement("div");
    content.className = "inbox-item";
    content.id = data.username;
    content.append(icon);
    profile(icon, data.profile);
    icon.classList.add("inb-icon");
    content.innerHTML+= fn+st;
    content.append(io);
    content.onclick = ()=>{

    }
    return content;
}

function loadchat(partner){
    profile($("chat-icon"), partner.profile);
}

async function send(receiver, content){
    const data = await post("/send",{
        receiver: receiver,
        content: content
    });
}
window.send = send;

search.oninput = ()=>{
    searchclr.hidden = 
        searchcont.lastElementChild == searcherr
        && searcherr.hidden == true && search.value == "";
}

function searchclear(x){
    searchcont.lastElementChild !== searcherr && searchcont.lastElementChild.remove();
    if(!x) return;
    search.value = "";
    hide(searchclr, searchcont, searcherr);
    show(searchload);
}

searchclr.onclick = ()=>searchclear("reset");

search.onkeydown = async (e)=>{
    if(e.key !== "Enter") return;
    const value = search.value.trim();
    searchcont.hidden = value == "";
    hide($("inbox-chats"));
    const data = await post("/search", {username:value});
    if(data.status >= 400){
        searchclear();
        hide(searchload); show(searcherr);
        searcherr.textContent = data.msg;
        return;
    }
    if(data.status == 200){
        hide(searchload, searcherr);
        const optionText = value == user.username? "You" : (value in user.knowns)? "Known":"";
        searchclear();
        searchcont.append(inboxitem({
            username:value,
            fullname:data.fullname,
            subtext:value,
            profile:data.profile,
            optionText:optionText
        }));
    }
}
let isInitialLoad = true;
function loadInbox(){
    authForm("hide");
    show(inboxcont, chatcont);
    loadchat(user);
    profile($("inbox-icon"), user.profile);
    inboxtitle.textContent = user.fullname;
    inboxoption.onclick = ()=>{
        const hidden = $("settings").hidden;
        if(hidden){
            searchclear("reset");
            hide($("search-box"), searchcont, $("inbox-chats"));
            show($("settings"));
        }
        else{
            show($("search-box"), $("inbox-chats"));
            hide($("settings"));
        }
    }
    listendb((data)=>{
        if(isInitialLoad){isInitialLoad = false;return;}
        if(data){
            const [[sender, msg]] = Object.entries(data);
            $(sender)?.remove();
            $("inbox-chats").prepend(inboxitem({
                username:sender,
                fullname:msg.fullname,
                subtext:msg.content,
                profile:msg.profile,
                optionText:"FU"
            }));
        }
    });
}

function authForm(path){
    const x = path == "/";
    const y = path == "hide";
    authcont.hidden = y;
    $("fn-label").hidden = fullname.hidden = y || x;
    fullname.value = username.value = password.value = "";
    if(y) return;
    history.pushState({path: path}, "", path);
    authmsg.textContent = x? "Sign in to your account":"Create a new account";
    authswitch.textContent = x? "create an account":"sign in to your account";
    submit.value = "Sign "+ (x? "in":"up");
    authswitch.onclick = ()=> authForm(x? "/create":"/");
    submit.onclick = async (e)=> {
        e.preventDefault();
        const api = x? "/signin":"/signup";
        const fn = fullname.value.trim();
        const un = username.value.trim();
        const pw = password.value.trim();
        if(!x && !fn) fullname.focus(); else if(!un) username.focus();
        else if(!pw) password.focus();
        else {
            const data = await post(api,{...(!x && {fullname:fn}),username:un,password:pw});
            if(data.status >= 400) error("auth-msg", data.msg);
            else window.location.href = "/";
        }
    }
}

async function init(path){
    if(path=="/"){
        user = await get("/session");
        if(user.status >= 400) authForm("/");
        else loadInbox();
    }
    else if(path=="/create") authForm("/create");
}

document.addEventListener("DOMContentLoaded", async ()=> {
    await init(window.location.pathname);
});

window.addEventListener("popstate", async ()=> {
    await init(window.location.pathname);
});