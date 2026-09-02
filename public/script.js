import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { query, orderByChild, startAt, getDatabase, ref, onChildAdded, onChildChanged, off } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const isMobile = window.matchMedia("(pointer: coarse), (max-width: 768px)").matches;
window.user = {}
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
    const inbox = query(
        ref(db, `inboxes/inbox-${user.username}`),
        orderByChild("date"),
        startAt(Date.now())
    );
    onChildAdded(inbox, (snapshot)=>{
        callback(snapshot.key, snapshot.val());
    });
    onChildChanged(inbox, (snapshot)=>{
        callback(snapshot.key, snapshot.val());
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
const inboxwrapper = $("inbox-wrapper");
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
function chattime(a) {
  if (!a || isNaN(a)) return "";
  const diffMs = Date.now() - a;
  if (diffMs < 60000) return "Now";
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h`;
  if (diffMs < 604800000) return `${Math.floor(diffMs / 86400000)}d`;
  if (diffMs < 31557600000) return `${Math.floor(diffMs / 604800000)}w`;
  return `${Math.floor(diffMs / 31557600000)}y`;
}
function inboxitem(data){
    const icon = document.createElement("div");
    const fn = div("", "inb-name", data.fullname);
    const sbtext = user.username == data.sender? `<text id="sbtext">You:&nbsp;</text>`+data.content:data.content;
    const stext = data.subtext || sbtext;
    const st = div("", "inb-subtext", stext);
    const io = document.createElement("div");
    const io2 = document.createElement("div");
    io.classList.add(data.optionStyle || "inb-option");
    io.textContent = data.optionText;
    io.onclick = async ()=>{
        if(data.optionStyle == "add-known"){
            const result = await post("/add-known", {username:data.username});
            if(result.status >= 400) return;
            user.knowns[data.username] = {
                fullname:data.fullname,
                profile:data.profile
            };
            io.textContent = "Known";
            io.classList.remove("add-known");
            io.classList.add("inb-option");
        }
    }
    const content = document.createElement("div");
    content.className = "inbox-item";
    if(data.option2Style && !isMobile){
        io2.classList.add(data.option2Style);
        io2.hidden = true;
        content.onmouseenter = ()=>{
            show(io2);
            content.className = "inbox-item-x";
            io.classList.add("inb-option-x");
        }
        content.onmouseleave = ()=>{
            hide(io2);
            content.className = "inbox-item";
            io.classList.remove("inb-option-x");
        }
    }
    content.dataset.type = data.type || "";
    const type = content.dataset.type;
    content.id = type===""? data.username:data.username+"-"+type;
    content.append(icon);
    profile(icon, data.profile);
    icon.classList.add("inb-icon");
    content.innerHTML+= fn+st;
    content.append(io);
    content.append(io2);
    content.onclick = async ()=>{
        const partner = chatcont.dataset.partner;
        if(partner && partner == data.username){
            style(inboxcont, "content-full");
            style(chatcont, "content-half");
            hide($("chat-label"), $("chat-box"));
            show($("no-chat"));
            chatcont.style["grid-template-rows"] = "1fr";
            chatcont.dataset.partner = "";
            $("chat-title").textContent = "";
            content.style.backgroundColor = "";
        }else{
            style(inboxcont, "content-half");
            style(chatcont, "content-full");
            chatcont.dataset.partner = data.username;
            $("chat-title").textContent = data.fullname;
            hide($("no-chat"));
            show($("chat-label"), $("chat-box"));
            profile($("chat-icon"), data.profile);
            chatcont.style["grid-template-rows"] = "2.5rem 1fr";
            document.querySelectorAll(".inbox-item").forEach((item) => {
                item.style.backgroundColor = "";
            });
            content.style.backgroundColor = "var(--ash)";
            const chats = await post("/chats", {partner:data.username});
            if(chats.status >= 400) return;
            loadchat(chats);
        }
    }
    return content;
}

$("chat-close").onclick = () => {
  style(inboxcont, "content-full");
  style(chatcont, "content-half");
  hide($("chat-label"), $("chat-box"));
  show($("no-chat"));
  chatcont.style["grid-template-rows"] = "1fr";
  chatcont.dataset.partner = "";
  $("chat-title").textContent = "";
  document.querySelectorAll(".inbox-item").forEach((item) => {
    item.style.backgroundColor = "";
  });
};

async function send(receiver, content){
    try{
        const data = await post("/send",{
            receiver: receiver,
            content: content
        });
        return {status:data.status};
    } catch (err) {
        return {status:data.status};
    }
}
window.send = send;

$("send").onclick = async () => {
    const partner = chatcont.dataset.partner;
    const content = $("message").value.trim();
    $("message").value = "";
    if(!partner || !content) return;
    const res = await send(partner, content);
    if(res.status >= 400) return;
}

function chatitem(data){
    const content = document.createElement("div");
    const align = data.sender == user.username? "end":"start";
    content.className = "chat-"+align;
    const senderType = data.sender == user.username? "user-text":"other-text";
    content.style["justify-self"] = align;
    const text = div("", senderType, data.content);
    const rcpt = data.seen? "seen":"sent";
    const btmtext = div("", "chat-sub", data.sender+" &nbsp;"+chattime(data.date));
    const receipt = div("", "receipt", rcpt);
    content.innerHTML = text+btmtext;
    return content;
}

function loadchat(chats){
    const cm = $("chat-messages");
    cm.innerHTML = "";
    for (const value of Object.values(chats.chats)) {
        cm.append(chatitem(value));
    }
    cm.scrollTop = cm.scrollHeight;
}

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
    show(searchload, $("inbox-chats"));
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
        const optionStyle = value in user.knowns || value == user.username? "":"add-known";
        searchclear();
        searchcont.append(inboxitem({
            username:value,
            fullname:data.fullname,
            subtext:value,
            type:"search",
            profile:data.profile,
            optionText:optionText,
            optionStyle:optionStyle,
        }));
    }
}
window.chatAdded = false;
function loadInbox(){
    authForm("hide");
    show(inboxwrapper, inboxcont, chatcont);
    profile($("inbox-icon"), user.profile);
    inboxtitle.textContent = user.fullname;
    user.inbox && Object.keys(user.inbox).forEach((k)=>{
        const msg = user.inbox[k];
        $("inbox-chats").append(inboxitem({
            username:k,
            fullname:msg.fullname,
            sender:msg.sender,
            content:msg.content,
            profile:msg.profile,
            optionText:chattime(msg.date),
            option2Style:"inb-option2"
        }));
    });
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
    listendb((partner, data)=>{
        if(!partner || !data) return;
        const chdata = chatcont.dataset.partner;
        $(`${partner}`)?.remove();
        const inbitem = inboxitem({
            username:partner,
            fullname:data.fullname,
            sender:data.sender,
            profile:data.profile,
            content:data.content,
            optionText:chattime(data.date),
            option2Style:"inb-option2"
        });
        if(chdata && chdata == partner){
            inbitem.style.backgroundColor = "var(--ash)";
            const cm = $("chat-messages")
            !chatAdded && cm.append(chatitem(data))
            chatAdded = false;
            const isAtBottom = cm.scrollHeight - cm.clientHeight <= cm.scrollTop + 100;
            if(isAtBottom){
                cm.scrollTo({top: cm.scrollHeight,behavior: 'smooth'});
            }
        }
        $("inbox-chats").prepend(inbitem);
        
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