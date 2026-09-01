function $(a){return document.querySelector("#"+a)}
function div(a,b,c){return `<div id='${a}' class='${b}'>${c}</div>`;}
function style(a, cls){a.className = "";cls && a.classList.add(cls);}
async function post(api, data) {
  try {
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if(!res.ok) return {status:404, msg: "Internal error occured"};
    return await res.json();
  }catch(err){
    return {msg:"Network error"};
  }
}
async function get(api){
    try{
        const res = await fetch(api);
        return await res.json();
    }catch(err){
        return {msg:"Network error"};
    }
}
function error(a, b){$(a).textContent = b;style(a, "error");}
function hide(...elements){elements.forEach(el => el.hidden = true);}
function show(...elements){elements.forEach(el => el.hidden = false);}