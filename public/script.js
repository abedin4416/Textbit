let user = {
    username: "amir",
    fullname: "Md Amir Abedin",
    knowns:{
        trump:{
            fullname:"Donald Trump"
        }
    }
}

const search = $("search");
const searchclr = $("search-clear");
const searchcont = $("search-content");
const searchres = $("search-result");
const searchload = $("search-loading");
const searcherr = $("search-error");
const inboxtitle = $("inbox-title");
const authcont = $("auth-content");
const fullname = $("fullname");
const username = $("username");
const password = $("password");
const authmsg = $("auth-msg");
const authswitch = $("auth-switch");
const submit = $("submit");
const inboxcont = $("inbox-content");

let lastColor = null;

function profile(a, b){
    if(b==="default"){
        style(a, "default-profile");
        const color = ["rgb(80, 220, 160)","rgb(160,80,220)","rgb(80,140,240)","rgb(240,90,100)"];
        let newColor;
        do{newColor = color[Math.floor(Math.random()*color.length)];}
        while(newColor === lastColor);
        lastColor = newColor;
        $(a).style.backgroundColor = newColor;
        $(a).style.backgroundImage = "url('res/person.svg')";
    }
}

search.oninput = ()=> searchclr.hidden = search.value == "";

searchclr.onclick = ()=>{
    search.value = "";
    hide(searchclr, searchcont, searchres, searcherr);
    show(searchload);
}

search.onkeydown = async (e)=>{
    if(e.key !== "Enter") return;
    const value = search.value.trim();
    searchcont.hidden = value == "";
    const data = await post("/search", {username:value});
    if(data.status >= 400){
        hide(searchload, searchres);
        show(searcherr);
        searcherr.textContent = data.msg;
        return;
    }
    if(data.status == 200){
        hide(searchload, searcherr);
        show(searchres);
        profile("sr-icon", data.profile);
        $("sr-fullname").textContent = data.fullname;
        $("sr-username").textContent = value;
        if(value == user.username){
            $("sr-option").textContent = "You";
        }
        else if(value in user.knowns){
            $("sr-option").textContent = "Known";
        }
        else {
            $("sr.option").textContent = "";
            $("sr-option").classList.add("add-known");
        }
    }
}

function loadInbox(){
    authForm("hide");
    show(inboxcont);
    profile("inbox-icon", user.profile);
    inboxtitle.textContent = user.fullname;
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