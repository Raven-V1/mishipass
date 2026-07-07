import { MISHIPASS_DESIGN_CSS, brandLockupHtml, htmlResponse } from "../utils/html.js";
import { TOP_NAV_CSS, renderTopNav } from "./partials/topNav.js";
import { resolveSession } from "../middleware/session.js";

export async function handleTransfersPage(request: Request, db: D1Database): Promise<Response> {
  const ctx = await resolveSession(request, db);
  if (ctx.ownerId === null) {
    return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  }
  const topNav = renderTopNav("en", { authenticated: true, active: "dashboard" });
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Adoption Requests — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    ${TOP_NAV_CSS}
    body{padding:var(--space-3);max-width:720px;margin:0 auto}
    .page-head{margin:var(--space-3) 0}
    .page-head h1{font-size:2rem;color:var(--teal);margin:0 0 var(--space-1)}
    .panel{border:1px solid var(--line);border-radius:8px;background:var(--card);box-shadow:var(--shadow);padding:var(--space-3)}
    .contact-card{border:1px solid var(--line);border-radius:8px;padding:var(--space-3);background:var(--card);margin-bottom:var(--space-2)}
    .btn-primary{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.62rem .9rem;border:0;border-radius:6px;cursor:pointer;font-size:.9rem;background:#111;color:#fff}
    .btn-warn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.62rem .9rem;border:0;border-radius:6px;cursor:pointer;font-size:.9rem;background:#c46a00;color:#fff}
    .muted{color:#666;font-size:.9rem}
  </style>
</head>
<body>
  ${topNav}
  <div class="page-head">
    <a class="mp-back" href="/dashboard">&larr; Back to Dashboard</a>
    <h1>Adoption Requests</h1>
    <p class="muted">Pending ownership transfer requests for your cats.</p>
  </div>
  <div id="transfer-list" class="panel"><p class="muted">Loading...</p></div>
  <script>
  (function(){
    function esc(s){var d=document.createElement("div");d.appendChild(document.createTextNode(String(s||"")));return d.innerHTML}
    var tl=document.getElementById("transfer-list");
    function load(){
      tl.innerHTML="<p class='muted'>Loading...</p>";
      fetch("/api/transfer-requests",{credentials:"same-origin"})
        .then(function(r){if(r.status===401){window.location.href="/dashboard";return null}if(!r.ok){throw new Error("load_failed")}return r.json()})
        .then(function(d){
          if(!d)return;
          var reqs=d.requests||[];
          if(!reqs.length){tl.innerHTML="<p class='muted'>No pending adoption requests.</p>";return}
          tl.innerHTML=reqs.map(function(r){
            return '<div class="contact-card"><strong>'+esc(r.cat_name)+'</strong><p class="muted mp-text-85">Request from: '+esc(r.requester_email)+'</p>'+(r.message?'<p class="mp-text-85">'+esc(r.message)+'</p>':'')+'<div class="mp-action-row"><button class="btn-primary accept-btn" data-id="'+esc(r.id)+'">Accept</button><button class="btn-warn decline-btn" data-id="'+esc(r.id)+'">Decline</button></div><p class="muted status-msg mp-status-hint"></p></div>'
          }).join("");
          document.querySelectorAll(".accept-btn").forEach(function(b){b.addEventListener("click",function(){
            var id=b.getAttribute("data-id"),card=b.closest(".contact-card"),status=card&&card.querySelector(".status-msg"),declineBtn=card&&card.querySelector(".decline-btn");
            b.disabled=true;if(declineBtn)declineBtn.disabled=true;if(status)status.textContent="Working...";
            fetch("/api/transfer-requests/"+encodeURIComponent(id)+"/accept",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}"})
              .then(function(r){return r.text().then(function(t){return{ok:r.ok,text:t}})})
              .then(function(result){if(result.ok){load()}else{b.disabled=false;if(declineBtn)declineBtn.disabled=false;if(status)status.textContent=result.text||"Error"}})
              .catch(function(){b.disabled=false;if(declineBtn)declineBtn.disabled=false;if(status)status.textContent="Network error."})
          })});
          document.querySelectorAll(".decline-btn").forEach(function(b){b.addEventListener("click",function(){
            var id=b.getAttribute("data-id"),card=b.closest(".contact-card"),status=card&&card.querySelector(".status-msg"),acceptBtn=card&&card.querySelector(".accept-btn");
            b.disabled=true;if(acceptBtn)acceptBtn.disabled=true;if(status)status.textContent="Working...";
            fetch("/api/transfer-requests/"+encodeURIComponent(id)+"/decline",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}"})
              .then(function(r){return r.text().then(function(t){return{ok:r.ok,text:t}})})
              .then(function(result){if(result.ok){load()}else{b.disabled=false;if(acceptBtn)acceptBtn.disabled=false;if(status)status.textContent=result.text||"Error"}})
              .catch(function(){b.disabled=false;if(acceptBtn)acceptBtn.disabled=false;if(status)status.textContent="Network error."})
          })});
        })
        .catch(function(err){tl.innerHTML="<p class='muted'>"+(err&&err.message?esc(err.message):"Network error.")+"</p>"})
    }
    load();
  })();
  </script>
</body>
</html>`;
  return htmlResponse(html);
}
