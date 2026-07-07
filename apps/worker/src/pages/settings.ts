import { MISHIPASS_DESIGN_CSS, htmlResponse } from "../utils/html.js";
import { iconMegaphone, iconQrCode, iconSettings, iconShield } from "../utils/icons.js";
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
    .page-shell{max-width:1280px;margin:0 auto;padding-bottom:var(--space-6)}
    .settings-layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:var(--space-3);align-items:start}
    .sidebar,.content-card{padding:var(--space-3)}
    .sidebar{position:sticky;top:var(--space-3);display:grid;gap:var(--space-3)}
    .sidebar-link{display:flex;align-items:center;gap:12px;min-height:52px;padding:0 16px;border-radius:12px;color:var(--ink);font-weight:800;text-decoration:none}
    .sidebar-link.active{background:#eef8f5;color:var(--teal)}
    .hero{display:grid;gap:var(--space-1);margin-bottom:var(--space-3)}
    .hero-kicker{display:inline-flex;align-items:center;gap:8px;font-size:.875rem;font-weight:900;color:var(--brand-coral)}
    .hero h1{font-size:clamp(2.5rem,6vw,4.25rem);line-height:1.02;margin:0;color:var(--teal)}
    .hero p{margin:0;color:var(--muted);font-weight:700}
    .settings-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:var(--space-3)}
    .stack{display:grid;gap:var(--space-3)}
    .settings-card{padding:var(--space-3)}
    .card-title{display:flex;align-items:center;gap:10px;margin:0 0 var(--space-2);font-size:1.5rem;color:var(--teal)}
    .card-copy{margin:0 0 var(--space-2);color:var(--muted);font-weight:700}
    .privacy-list,.notification-list,.security-list{display:grid;gap:0}
    .privacy-row,.notification-row,.security-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--space-2);align-items:start;padding:var(--space-2) 0;border-top:1px solid var(--line)}
    .privacy-row:first-child,.notification-row:first-child,.security-row:first-child{border-top:0;padding-top:0}
    .row-icon{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#eef8f5;color:var(--teal)}
    .row-copy strong{display:block;font-size:1rem;color:var(--ink);margin-bottom:4px}
    .row-copy p{margin:0;color:var(--muted);font-size:.9375rem}
    .pref-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2)}
    .field{display:grid;gap:var(--space-1)}
    .contact-list{display:grid;gap:var(--space-2);max-height:520px;overflow-y:auto;padding-right:4px}
    .contact-card{padding:var(--space-2);border:1px solid var(--line);border-radius:12px;background:#fffaf6;display:grid;gap:var(--space-2)}
    .contact-card header{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);flex-wrap:wrap}
    .contact-card h3{margin:0;color:var(--teal);font-size:1.05rem}
    .contact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2)}
    .contact-actions,.footer-actions{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);flex-wrap:wrap}
    .status{margin:0;color:var(--muted);font-size:.875rem;font-weight:800}
    .danger-card{border-color:#f2c2bc;background:#fff8f7}
    .danger-card .card-title{color:#d64545}
    .danger-actions{display:flex;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap}
    .danger-note{margin:0;color:var(--muted);font-weight:700}
    @media(max-width:1080px){.settings-layout{grid-template-columns:1fr}.sidebar{position:static}.settings-grid,.pref-grid,.contact-grid{grid-template-columns:1fr}}
    @media(max-width:430px){body{padding:var(--space-2)}.sidebar,.content-card,.settings-card{padding:var(--space-2)}.footer-actions .mp-btn,.danger-actions .mp-btn{width:100%}}
  </style>
</head>
<body>
  <main class="page-shell">
    ${renderTopNav(lang, { authenticated: true, active: "settings" })}
    <div class="settings-layout">
      <aside class="mp-card sidebar">
        <a class="sidebar-link" href="/dashboard?lang=${lang}">Dashboard</a>
        <a class="sidebar-link" href="/dashboard#cats">My Cats</a>
        <a class="sidebar-link" href="/recovery-board?lang=${lang}">Recovery Board</a>
        <a class="sidebar-link" href="/dashboard?lang=${lang}#cartilla">Digital Cartilla</a>
        <a class="sidebar-link active" href="/dashboard/settings?lang=${lang}">${t(lang, "settings")}</a>
      </aside>

      <section class="mp-card content-card">
        <header class="hero">
          <span class="hero-kicker">${iconSettings(20)} <span>${t(lang, "settings")}</span></span>
          <h1>${t(lang, "settings")}</h1>
          <p>Manage your account, privacy, contact visibility, and owner preferences.</p>
        </header>

        <div class="settings-grid">
          <div class="stack">
            <section class="mp-card settings-card" id="privacy">
              <h2 class="card-title">${iconShield(20)} <span>Privacy</span></h2>
              <p class="card-copy">Public pages stay privacy-safe. Contact visibility remains owner-controlled per cat, and private cartilla records never appear on public QR pages.</p>
              <div class="privacy-list">
                <div class="privacy-row">
                  <div class="row-icon">${iconShield(20)}</div>
                  <div class="row-copy">
                    <strong>Public Profile Safety</strong>
                    <p>No owner legal identity, exact address, internal database IDs, or private cartilla data are shown publicly.</p>
                  </div>
                </div>
                <div class="privacy-row">
                  <div class="row-icon">${iconQrCode(20)}</div>
                  <div class="row-copy">
                    <strong>Permanent QR Routing</strong>
                    <p>The QR code stays static while the Worker switches the rendered public page using the cat’s current mode.</p>
                  </div>
                </div>
                <div class="privacy-row">
                  <div class="row-icon">${iconMegaphone(20)}</div>
                  <div class="row-copy">
                    <strong>Missing Mode Controls</strong>
                    <p>Recovery Board participation remains owner opt-in, and reward visibility is hidden unless the owner chooses to reveal it.</p>
                  </div>
                </div>
              </div>
            </section>

            <section class="mp-card settings-card">
              <h2 class="card-title">${iconShield(20)} <span>Contact Visibility</span></h2>
              <p class="card-copy">These are the real contact controls previously split across the standalone privacy page. They now live here.</p>
              <div id="contact-list" class="contact-list"><p class="muted">Loading...</p></div>
            </section>

            <section class="mp-card settings-card">
              <h2 class="card-title">${iconMegaphone(20)} <span>Notifications</span></h2>
              <p class="card-copy">Beta notifications remain owner-controlled and intentionally limited.</p>
              <div class="notification-list">
                <div class="notification-row">
                  <div class="row-icon">${iconMegaphone(20)}</div>
                  <div class="row-copy">
                    <strong>Email / WhatsApp Automation</strong>
                    <p>Automatic notification delivery is not active in Beta. Missing-mode sharing remains owner-initiated and manual.</p>
                  </div>
                </div>
                <div class="notification-row">
                  <div class="row-icon">${iconQrCode(20)}</div>
                  <div class="row-copy">
                    <strong>Public Sighting Reports</strong>
                    <p>Sighting reports, upload validation, and report review remain active without introducing nearby-user tracking.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div class="stack">
            <section class="mp-card settings-card">
              <h2 class="card-title">${iconSettings(20)} <span>Account Preferences</span></h2>
              <div class="pref-grid">
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
              <div class="footer-actions" style="margin-top:var(--space-3)">
                <p id="owner-settings-status" class="status">Changes save to the owner account.</p>
                <button id="owner-settings-save" class="mp-btn mp-btn-primary" type="button">${t(lang, "save")}</button>
              </div>
            </section>

            <section class="mp-card settings-card">
              <h2 class="card-title">${iconShield(20)} <span>Security</span></h2>
              <div class="security-list">
                <div class="security-row">
                  <div class="row-icon">${iconShield(20)}</div>
                  <div class="row-copy">
                    <strong>Session Protection</strong>
                    <p>Your owner dashboard remains behind authenticated owner sessions. Public QR scans never expose owner-only routes.</p>
                  </div>
                </div>
                <div class="security-row">
                  <div class="row-icon">${iconSettings(20)}</div>
                  <div class="row-copy">
                    <strong>Account Access</strong>
                    <p>Use the header logout control when you finish on a shared device.</p>
                  </div>
                </div>
              </div>
            </section>

            <section class="mp-card settings-card danger-card">
              <h2 class="card-title"><span>Danger Zone</span></h2>
              <p class="danger-note">Cat deletion remains available on each cat module in the dashboard so destructive actions stay tied to the correct profile.</p>
              <div class="danger-actions">
                <a class="mp-btn mp-btn-secondary" href="/dashboard?lang=${lang}">Return to Dashboard</a>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
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
        .then(function(r){if(r.status===401){window.location.href='/dashboard';return null}return r.json();})
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
            return '<article class="contact-card" id="privacy-'+esc(result.cat.publicId)+'">'+
              '<header><h3>'+esc(result.cat.name)+'</h3><span class="badge">'+esc(result.cat.currentMode)+'</span></header>'+
              '<div class="contact-grid">'+
                '<label class="field"><span>Contact method</span><select class="contact-mode-select"><option value="none"'+(d.contact_mode==="none"?" selected":"")+'>'+STR.hidden+'</option><option value="relay"'+(d.contact_mode==="relay"?" selected":"")+'>'+STR.relay+'</option><option value="phone"'+(d.contact_mode==="phone"?" selected":"")+'>'+STR.publicPhone+'</option></select></label>'+
                '<label class="field"><span>'+STR.phone+'</span><input class="contact-phone" type="text" maxlength="30" value="'+esc(d.public_phone||"")+'" /></label>'+
              '</div>'+
              '<div class="contact-actions"><p class="status">Public contact stays owner-controlled and defaults to relay.</p><div><button class="mp-btn mp-btn-primary contact-save-btn" data-id="'+esc(result.cat.publicId)+'" type="button">'+STR.save+'</button><span class="contact-status status"></span></div></div>'+
            '</article>';
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
            window.location.href=url.toString();
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
