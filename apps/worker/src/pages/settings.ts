import { MISHIPASS_DESIGN_CSS, htmlResponse } from "../utils/html.js";
import { iconContact, iconMegaphone, iconQrCode, iconSettings, iconShield } from "../utils/icons.js";
import { type LanguageCode, t } from "../utils/i18n.js";
import { renderTopNav, TOP_NAV_CSS } from "./partials/topNav.js";

export function handleSettingsPage(lang: LanguageCode = "en"): Response {
  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(lang, "settings")} — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    ${TOP_NAV_CSS}
    body{padding:var(--space-3)}
    .page-shell{max-width:1184px;margin:0 auto;padding-bottom:var(--space-6)}
    .page-head{display:grid;gap:var(--space-1);margin:0 0 var(--space-3)}
    .page-kicker{display:inline-flex;align-items:center;gap:var(--space-1);font-size:.875rem;font-weight:900;color:var(--brand-coral)}
    .page-head h1{font-size:clamp(2.4rem,6vw,4rem);line-height:1.02;margin:0;color:var(--teal)}
    .page-head p{margin:0;color:var(--muted);font-weight:700;font-size:1rem}
    .settings-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:var(--space-3)}
    .settings-column{display:grid;gap:var(--space-3);align-content:start}
    .settings-card{padding:var(--space-3)}
    .card-title{display:flex;align-items:center;gap:var(--space-1);margin:0 0 var(--space-2);font-size:1.4rem;font-weight:900;color:var(--teal)}
    .card-copy{margin:0 0 var(--space-2);color:var(--muted);font-weight:700}
    .card-list{display:grid;gap:var(--space-2)}
    .settings-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--space-2);align-items:start;padding:var(--space-2) 0;border-top:1px solid var(--line)}
    .settings-row:first-child{border-top:0;padding-top:0}
    .settings-icon{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#eef8f5;color:var(--teal)}
    .settings-copy strong{display:block;font-size:1rem;color:var(--ink);margin-bottom:4px}
    .settings-copy p{margin:0;color:var(--muted);font-size:.9375rem}
    .field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2)}
    .field{display:grid;gap:var(--space-1)}
    .contact-list{display:grid;grid-template-columns:1fr;gap:var(--space-2)}
    .contact-card{padding:var(--space-2);border:1px solid var(--line);border-radius:8px;background:#fffaf6;display:grid;grid-template-columns:minmax(0,170px) minmax(0,1fr) auto;gap:var(--space-2);align-items:end}
    .contact-card h3{margin:0;color:var(--teal);font-size:1.05rem;align-self:center}
    .contact-inline{display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap}
    .contact-inline .mp-btn{min-width:120px}
    .info-list{display:grid;gap:var(--space-2)}
    .info-panel{padding:var(--space-2);border-radius:8px;background:#fffaf6;border:1px solid var(--line)}
    .info-panel strong{display:block;color:var(--ink);margin-bottom:6px}
    .info-panel p{margin:0;color:var(--muted);font-size:.9375rem}
    .utility-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2)}
    .utility-card{padding:var(--space-2);border:1px solid var(--line);border-radius:8px;background:#fffaf6;display:grid;gap:10px}
    .utility-card strong{display:block;font-size:1rem;color:var(--ink)}
    .utility-card p{margin:0;color:var(--muted);font-size:.9375rem}
    .actions{display:flex;justify-content:space-between;align-items:center;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap}
    .actions .group{display:flex;gap:var(--space-2);flex-wrap:wrap}
    .status{margin:0;font-size:.875rem;color:var(--muted);font-weight:800;background:transparent;padding:0;min-height:auto}
    @media(max-width:1080px){.contact-card{grid-template-columns:1fr 1fr}.contact-inline{grid-column:1/-1}}
    @media(max-width:920px){.settings-grid,.field-grid,.utility-grid{grid-template-columns:1fr}.contact-card{grid-template-columns:1fr}}
    @media(max-width:430px){body{padding:var(--space-2)}.settings-card{padding:var(--space-2)}.actions .group,.actions .group .mp-btn{width:100%}}
  </style>
</head>
<body>
  <main class="page-shell">
    ${renderTopNav(lang, { authenticated: true, active: "settings" })}
    <header class="page-head">
      <span class="page-kicker">${iconSettings(20)} <span>${t(lang, "settings")}</span></span>
      <h1>${t(lang, "settings")}</h1>
      <p>Manage your owner preferences, contact visibility, and public-page controls.</p>
    </header>

    <section class="settings-grid">
      <div class="settings-column">
        <section class="mp-card settings-card">
          <h2 class="card-title">${iconShield(20)} <span>${t(lang, "contactPrivacy")}</span></h2>
          <p class="card-copy">Owner-facing privacy controls stay here so they are no longer mixed into the dashboard overview.</p>
          <div id="contact-list" class="contact-list"><p class="muted">Loading...</p></div>
        </section>

        <section class="mp-card settings-card">
          <h2 class="card-title">${iconMegaphone(20)} <span>${t(lang, "missingCatBoard")}</span></h2>
          <div class="utility-grid">
            <div class="utility-card">
              <strong>Missing Mode</strong>
              <p>Activate Missing Alert from each cat card in the dashboard so the same permanent QR switches modes without changing the tag.</p>
            </div>
            <div class="utility-card">
              <strong>Recovery Board</strong>
              <p>Public recovery pages stay owner-controlled. Open the board from the dashboard when you want to review active public alerts.</p>
            </div>
          </div>
        </section>
      </div>

      <div class="settings-column">
        <section class="mp-card settings-card">
          <h2 class="card-title">${iconSettings(20)} <span>Owner Preferences</span></h2>
          <div class="field-grid">
            <label class="field" for="language-select">
              <span>${t(lang, "language")}</span>
              <select id="language-select">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="kk-KZ">Қазақша</option>
              </select>
            </label>
            <label class="field" for="units-select">
              <span>${t(lang, "units")}</span>
              <select id="units-select">
                <option value="metric">${t(lang, "metric")}</option>
                <option value="imperial">${t(lang, "imperial")}</option>
              </select>
            </label>
          </div>
          <div class="actions">
            <p id="owner-settings-status" class="status">Changes save to the owner account only.</p>
            <div class="group">
              <a class="mp-btn mp-btn-secondary" href="/dashboard?lang=${lang}">${t(lang, "backToDashboard")}</a>
              <button id="owner-settings-save" class="mp-btn mp-btn-primary" type="button">${t(lang, "save")}</button>
            </div>
          </div>
        </section>

        <section class="mp-card settings-card">
          <h2 class="card-title">${iconQrCode(20)} <span>QR &amp; Public Pages</span></h2>
          <div class="utility-grid">
            <div class="utility-card">
              <div class="settings-row">
                <div class="settings-icon">${iconQrCode(20)}</div>
                <div class="settings-copy">
                  <strong>Permanent QR Routing</strong>
                  <p>Your cat&apos;s QR remains static. Public Profile, Missing Alert, and Vet Visit are switched by the active mode in the Worker.</p>
                </div>
              </div>
            </div>
            <div class="utility-card">
              <div class="settings-row">
                <div class="settings-icon">${iconContact(20)}</div>
                <div class="settings-copy">
                  <strong>Public Contact</strong>
                  <p>Contact visibility is configured per cat below. Relay is the default, and no internal database identifiers are exposed.</p>
                </div>
              </div>
            </div>
            <div class="utility-card">
              <div class="settings-row">
                <div class="settings-icon">${iconMegaphone(20)}</div>
                <div class="settings-copy">
                  <strong>Owner-Launched Public Pages</strong>
                  <p>Dashboard links now stay in the same browser tab for Public Profile, Missing Alert, Vet Profile, Recovery Report, and QR Preview.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="mp-card settings-card">
          <h2 class="card-title">${iconSettings(20)} <span>Owner Tools</span></h2>
          <div class="utility-grid">
            <div class="utility-card">
              <strong>Privacy Defaults</strong>
              <p>Public owner identity stays hidden by default. Use relay or public phone only where intentionally enabled per cat.</p>
            </div>
            <div class="utility-card">
              <strong>Dashboard Consistency</strong>
              <p>Dashboard and Settings now remain separate pages while keeping the same top navigation placement and shared visual system.</p>
            </div>
          </div>
        </section>
      </div>
    </section>
  </main>

  <script>
  (function(){
    var languageSelect=document.getElementById("language-select");
    var unitsSelect=document.getElementById("units-select");
    var saveBtn=document.getElementById("owner-settings-save");
    var saveStatus=document.getElementById("owner-settings-status");
    var contactList=document.getElementById("contact-list");
    var STR={
      save:${JSON.stringify(t(lang, "save"))},
      working:${JSON.stringify(t(lang, "working"))},
      saved:${JSON.stringify(t(lang, "saved"))},
      error:${JSON.stringify(t(lang, "error"))},
      networkError:${JSON.stringify(t(lang, "networkError"))},
      noCats:${JSON.stringify(t(lang, "noCats"))},
      hidden:${JSON.stringify(t(lang, "hidden"))},
      relay:${JSON.stringify(t(lang, "relay"))},
      publicPhone:${JSON.stringify(t(lang, "publicPhone"))},
      phone:${JSON.stringify(t(lang, "phone"))}
    };

    function esc(value){
      return String(value==null?"":value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#39;");
    }

    function loadOwnerSettings(){
      fetch("/api/settings",{credentials:"same-origin"})
        .then(function(r){if(r.status===401){window.location.href="/dashboard";return null}if(!r.ok)throw new Error("settings_load_failed");return r.json();})
        .then(function(d){
          if(!d)return;
          if(d.language_code)languageSelect.value=d.language_code;
          if(d.units)unitsSelect.value=d.units;
        })
        .catch(function(){saveStatus.textContent=STR.networkError;});
    }

    function attachContactHandlers(){
      document.querySelectorAll(".contact-save-btn").forEach(function(btn){
        btn.addEventListener("click",function(){
          var id=btn.getAttribute("data-id");
          var card=btn.closest(".contact-card");
          var status=card.querySelector(".contact-status");
          btn.disabled=true;
          btn.textContent=STR.working;
          fetch("/api/cats/"+encodeURIComponent(id)+"/contact",{
            method:"POST",
            credentials:"same-origin",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
              contact_mode:card.querySelector(".contact-mode-select").value,
              public_phone:card.querySelector(".contact-phone").value||null
            })
          }).then(function(r){
            btn.disabled=false;
            btn.textContent=STR.save;
            status.textContent=r.ok?STR.saved:STR.error;
          }).catch(function(){
            btn.disabled=false;
            btn.textContent=STR.save;
            status.textContent=STR.networkError;
          });
        });
      });
    }

    function loadContactSettings(){
      contactList.innerHTML="<p class='muted'>Loading...</p>";
      fetch("/api/cats",{credentials:"same-origin"})
        .then(function(r){if(r.status===401){window.location.href="/dashboard";return null}return r.json();})
        .then(function(cats){
          if(!cats)return;
          if(!cats.length){contactList.innerHTML="<p>"+STR.noCats+"</p>";return;}
          return Promise.all(cats.map(function(cat){
            return fetch("/api/cats/"+encodeURIComponent(cat.publicId)+"/contact",{credentials:"same-origin"})
              .then(function(r){return r.json();})
              .then(function(contact){return{cat:cat,contact:contact};});
          }));
        })
        .then(function(results){
          if(!results)return;
          contactList.innerHTML=results.map(function(result){
            var d=result.contact;
            return '<div class="contact-card">'+
              '<h3>'+esc(result.cat.name)+'</h3>'+
              '<label class="field"><span>${t(lang, "contactPrivacy")}</span><select class="contact-mode-select"><option value="none"'+(d.contact_mode==="none"?" selected":"")+'>'+STR.hidden+'</option><option value="relay"'+(d.contact_mode==="relay"?" selected":"")+'>'+STR.relay+'</option><option value="phone"'+(d.contact_mode==="phone"?" selected":"")+'>'+STR.publicPhone+'</option></select></label>'+
              '<label class="field"><span>'+STR.phone+'</span><input class="contact-phone" type="text" maxlength="30" value="'+esc(d.public_phone||"")+'" /></label>'+
              '<div class="contact-inline"><button class="mp-btn mp-btn-primary contact-save-btn" data-id="'+esc(result.cat.publicId)+'" type="button">'+STR.save+'</button><span class="contact-status muted"></span></div>'+
            '</div>';
          }).join("");
          attachContactHandlers();
        })
        .catch(function(){contactList.innerHTML="<p class='muted'>"+STR.networkError+"</p>";});
    }

    saveBtn.addEventListener("click",function(){
      saveBtn.disabled=true;
      saveStatus.textContent=STR.working;
      fetch("/api/settings",{
        method:"POST",
        credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({language_code:languageSelect.value,units:unitsSelect.value})
      }).then(function(r){
        return r.text().then(function(text){return{text:text,response:r};});
      }).then(function(result){
        saveBtn.disabled=false;
        if(result.response.ok){
          saveStatus.textContent=STR.saved;
          try{
            var url=new URL(window.location.href);
            url.searchParams.set("lang",languageSelect.value);
            window.history.replaceState({}, "", url.toString());
          }catch(e){}
        }else{
          saveStatus.textContent=result.text||STR.error;
        }
      }).catch(function(){
        saveBtn.disabled=false;
        saveStatus.textContent=STR.networkError;
      });
    });

    loadOwnerSettings();
    loadContactSettings();
  })();
  </script>
</body>
</html>`;

  return htmlResponse(html);
}
