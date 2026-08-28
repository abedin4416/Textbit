function $(a){return document.querySelector("#"+a);}
function div(a,b,c){return `<div id='${a}' class='${b}'>${c}</div>`;}
function style(id, cls){$(id).className = "";cls && $(id).classList.add(cls);}
async function server(api, method = "GET", data = null) {
    try {
        const fetchOptions = {
            method: method.toUpperCase(),
            headers: {},
        };
        if (data && fetchOptions.method !== "GET") {
            fetchOptions.headers["Content-Type"] = "application/json";
            fetchOptions.body = JSON.stringify(data);
        }
        const res = await fetch(api, fetchOptions);
        return await res.json();
    } catch (error) {
        console.error("Fetch request failed:", error);
        throw error;
    }
}
function error(a, b){$(a).textContent = b;style(a, "error");}