import { getCatForOwner, getContactSettingsForOwner } from "../db/index.js";
import { getCountryBadgeLabel } from "../data/countries.js";
import type { RequestContext } from "../middleware/session.js";
import { MISHIPASS_DESIGN_CSS, escapeHtml, htmlResponse } from "../utils/html.js";
import { generateQrSvg } from "../utils/qr.js";
import { type LanguageCode, t } from "../utils/i18n.js";
import { renderTopNav, TOP_NAV_CSS } from "./partials/topNav.js";

function redirectDashboard(): Response {
  return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
}

function ageText(birthDate: string | null, lang: LanguageCode): string {
  if (!birthDate) return t(lang, "notSet");
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(birthDate);
  const now = new Date();
  let years = now.getFullYear() - parsed.getFullYear();
  let months = now.getMonth() - parsed.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0) return `${months}m`;
  return `${years}y ${months}m`;
}

export async function handlePublicProfileSettingsPage(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
  publicBaseUrl: string,
  lang: LanguageCode = "en",
): Promise<Response> {
  if (ctx.ownerId === null) return redirectDashboard();

  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) return new Response("Not Found", { status: 404 });

  const contact = await getContactSettingsForOwner(db, publicId, ctx.ownerId);
  const safeId = escapeHtml(publicId);
  const safeName = escapeHtml(cat.name);
  const safeCountry = escapeHtml(getCountryBadgeLabel(cat.country_code));
  const safeBreed = escapeHtml(cat.breed_mix ?? t(lang, "notSet"));
  const safeAge = escapeHtml(ageText(cat.birth_date, lang));
  const safeMode = escapeHtml(cat.current_mode);
  const publicUrl = `${publicBaseUrl}/c/${publicId}?lang=${lang}`;
  const safePublicUrl = escapeHtml(publicUrl);
  const qrSvg = generateQrSvg(`${publicBaseUrl}/c/${publicId}`);
  const profilePhoto = cat.photo_r2_key
    ? `<img class="preview-photo" src="/media/cats/${safeId}/photo" alt="${safeName}" />`
    : `<div class="preview-photo photo-placeholder">${t(lang, "noPhoto")}</div>`;
  const initialMode = contact?.contact_mode ?? "relay";
  const initialPhone = contact?.public_phone ?? "";
  const contactVisible = initialMode !== "none";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(lang, "viewPublicProfile")} — ${safeName} — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    ${TOP_NAV_CSS}
    body{padding:var(--space-3)}
    .page-shell{max-width:1184px;margin:0 auto;padding-bottom:var(--space-6)}
    .page-head{display:grid;gap:var(--space-1);margin-bottom:var(--space-3)}
    .page-head h1{font-size:clamp(2rem,5vw,3.1rem);line-height:1.05;margin:0;color:var(--teal)}
    .page-head p{margin:0;color:var(--muted);font-weight:700}
    .hero-grid{display:grid;grid-template-columns:minmax(320px,420px) minmax(0,1fr);gap:var(--space-3);align-items:stretch}
    .qr-card,.preview-card,.settings-card{padding:var(--space-3)}
    .card-title{display:flex;align-items:center;gap:var(--space-1);font-size:1rem;font-weight:900;color:var(--teal);margin:0 0 var(--space-2)}
    .qr-frame{display:grid;place-items:center;padding:var(--space-3);border:1px solid var(--line);border-radius:8px;background:#fffaf6;margin-bottom:var(--space-2)}
    .qr-frame svg{display:block;width:min(100%,260px);height:auto}
    .qr-note{font-size:.875rem;font-weight:700;color:var(--muted);text-align:center;margin:0 0 var(--space-2)}
    .button-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-2)}
    .button-row .mp-btn{width:100%}
    .preview-shell{display:grid;grid-template-columns:minmax(220px,260px) minmax(0,1fr);gap:var(--space-3);align-items:start}
    .preview-photo{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px;background:#fff7f0}
    .preview-meta{display:grid;gap:var(--space-2)}
    .preview-list{display:grid;gap:var(--space-2);margin:0}
    .preview-row{display:grid;grid-template-columns:minmax(88px,128px) minmax(0,1fr);gap:var(--space-2);padding-bottom:var(--space-1);border-bottom:1px solid var(--line)}
    .preview-row dt{font-size:.8125rem;font-weight:900;color:var(--muted)}
    .preview-row dd{margin:0;font-weight:800;color:var(--ink);overflow-wrap:anywhere}
    .preview-actions{display:flex;gap:var(--space-2);flex-wrap:wrap}
    .preview-actions .mp-btn{flex:1 1 180px}
    .settings-card{margin-top:var(--space-3)}
    .settings-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-3)}
    .setting-block{display:grid;gap:var(--space-1);padding:var(--space-2);border-radius:8px;background:#fffaf6;border:1px solid var(--line)}
    .setting-head{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)}
    .setting-head strong{font-size:1rem;color:var(--ink)}
    .setting-copy{margin:0;color:var(--muted);font-size:.875rem;font-weight:700}
    .setting-note{margin:0;color:var(--teal);font-size:.8125rem;font-weight:800}
    .toggle{position:relative;display:inline-flex;align-items:center;width:56px;height:32px;border-radius:999px;background:#d7e6e2;padding:4px;border:0;cursor:pointer}
    .toggle:before{content:"";display:block;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.15);transform:translateX(0);transition:transform .2s ease}
    .toggle[aria-checked="true"]{background:var(--green)}
    .toggle[aria-checked="true"]:before{transform:translateX(24px)}
    .toggle[disabled]{opacity:.65;cursor:not-allowed}
    .contact-fields{display:grid;gap:var(--space-2);margin-top:var(--space-2)}
    .contact-fields.hidden{display:none}
    .form-actions{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap}
    .form-actions .action-group{display:flex;gap:var(--space-2);flex-wrap:wrap}
    .save-status{margin:0;font-size:.875rem;font-weight:800;color:var(--muted)}
    .print-qr-only{display:none}
    @media print{
      body{padding:0;background:#fff}
      .mp-top-nav,.page-head,.settings-card,.form-actions,.preview-card,.back-link,.no-print{display:none!important}
      .page-shell{max-width:none;padding:0}
      .hero-grid{display:block}
      .qr-card{box-shadow:none;border:0;padding:0}
      .qr-frame{border:0;background:#fff;padding:0}
      .print-qr-only{display:block;text-align:center}
      .qr-frame svg{width:54mm;height:54mm}
    }
    @media(max-width:920px){.hero-grid,.settings-grid,.preview-shell{grid-template-columns:1fr}.button-row{grid-template-columns:1fr}}
    @media(max-width:430px){body{padding:var(--space-2)}.qr-card,.preview-card,.settings-card{padding:var(--space-2)}.preview-actions .mp-btn,.form-actions .action-group .mp-btn{width:100%;flex-basis:100%}}
  </style>
</head>
<body>
  <main class="page-shell">
    ${renderTopNav(lang, { authenticated: true })}
    <div class="page-head">
      <a class="mp-back back-link" href="/dashboard/cats/${safeId}?lang=${lang}">&larr; ${t(lang, "backToDashboard")}</a>
      <h1>Public Profile &amp; QR Code</h1>
      <p>Share your cat&apos;s profile safely with anyone.</p>
    </div>

    <section class="hero-grid">
      <section class="mp-card qr-card">
        <p class="card-title">Your Cat&apos;s Public QR Code</p>
        <div class="qr-frame" id="qr-download-target">${qrSvg}</div>
        <p class="qr-note">Scan to open ${safeName}&apos;s public profile.</p>
        <div class="button-row no-print">
          <button class="mp-btn mp-btn-secondary" type="button" id="download-qr-btn">Download QR</button>
          <button class="mp-btn mp-btn-secondary" type="button" onclick="window.print()">Print QR</button>
          <button class="mp-btn mp-btn-secondary" type="button" id="copy-link-btn">Copy Link</button>
        </div>
      </section>

      <section class="mp-card preview-card">
        <p class="card-title">Public Profile Preview</p>
        <div class="preview-shell">
          <div>${profilePhoto}</div>
          <div class="preview-meta">
            <dl class="preview-list">
              <div class="preview-row"><dt>Name</dt><dd>${safeName}</dd></div>
              <div class="preview-row"><dt>Country</dt><dd>${safeCountry}</dd></div>
              <div class="preview-row"><dt>Breed</dt><dd>${safeBreed}</dd></div>
              <div class="preview-row"><dt>Age</dt><dd>${safeAge}</dd></div>
              <div class="preview-row"><dt>Status</dt><dd>${safeMode}</dd></div>
            </dl>
            <div class="preview-actions">
              <a class="mp-btn mp-btn-secondary" href="/c/${safeId}?lang=${lang}" target="_blank" rel="noopener">Open Public Profile</a>
              <a class="mp-btn mp-btn-secondary" href="/dashboard/cats/${safeId}/qr?lang=${lang}">Open QR Card</a>
            </div>
          </div>
        </div>
      </section>
    </section>

    <section class="mp-card settings-card">
      <p class="card-title">Privacy &amp; Visibility Settings</p>
      <div class="settings-grid">
        <section class="setting-block">
          <div class="setting-head">
            <strong>Public Profile</strong>
            <button class="toggle" type="button" aria-checked="true" disabled></button>
          </div>
          <p class="setting-copy">Your public profile route is always available in the current product architecture.</p>
          <p class="setting-note">This deployment does not have a separate persisted public-profile visibility flag.</p>
        </section>

        <section class="setting-block">
          <div class="setting-head">
            <strong>QR Code Visibility</strong>
            <button class="toggle" type="button" aria-checked="true" disabled></button>
          </div>
          <p class="setting-copy">The printable and digital QR surfaces use the same permanent public link.</p>
          <p class="setting-note">This deployment does not have a separate persisted QR-visibility flag.</p>
        </section>

        <section class="setting-block">
          <div class="setting-head">
            <strong>Emergency Contact Visibility</strong>
            <button class="toggle" type="button" id="contact-visible-toggle" aria-checked="${contactVisible ? "true" : "false"}"></button>
          </div>
          <p class="setting-copy">Control whether finders can reach you through MishiPass relay or a public phone number.</p>
          <div class="contact-fields${contactVisible ? "" : " hidden"}" id="contact-fields">
            <label for="contact-mode-select">Contact delivery</label>
            <select id="contact-mode-select">
              <option value="relay"${initialMode === "relay" ? " selected" : ""}>MishiPass relay</option>
              <option value="phone"${initialMode === "phone" ? " selected" : ""}>Public phone</option>
            </select>
            <label for="public-phone-input">Public phone</label>
            <input id="public-phone-input" type="text" maxlength="30" value="${escapeHtml(initialPhone)}" placeholder="+1 555 555 5555" />
          </div>
        </section>
      </div>

      <div class="form-actions">
        <p class="save-status" id="save-status">Only supported visibility settings are editable in this deployment.</p>
        <div class="action-group">
          <a class="mp-btn mp-btn-secondary" href="/dashboard/cats/${safeId}?lang=${lang}">Back</a>
          <button class="mp-btn mp-btn-primary" type="button" id="save-contact-btn">Save Changes</button>
        </div>
      </div>
    </section>
  </main>

  <script>
  (function(){
    var contactToggle=document.getElementById("contact-visible-toggle");
    var contactFields=document.getElementById("contact-fields");
    var contactMode=document.getElementById("contact-mode-select");
    var publicPhone=document.getElementById("public-phone-input");
    var copyBtn=document.getElementById("copy-link-btn");
    var downloadBtn=document.getElementById("download-qr-btn");
    var saveBtn=document.getElementById("save-contact-btn");
    var saveStatus=document.getElementById("save-status");
    var publicUrl=${JSON.stringify(publicUrl)};
    var initialMode=${JSON.stringify(initialMode)};

    function syncContactFields(){
      var visible=contactToggle.getAttribute("aria-checked")==="true";
      contactFields.classList.toggle("hidden",!visible);
      if(!visible){
        publicPhone.value="";
      }
    }

    contactToggle.addEventListener("click",function(){
      var next=contactToggle.getAttribute("aria-checked")!=="true";
      contactToggle.setAttribute("aria-checked",next?"true":"false");
      if(next&&contactMode.value==="phone"&&publicPhone.value.trim()===""&&initialMode==="phone"){
        publicPhone.value=${JSON.stringify(initialPhone)};
      }
      syncContactFields();
    });

    contactMode.addEventListener("change",function(){
      publicPhone.disabled=contactMode.value!=="phone";
      if(publicPhone.disabled) publicPhone.value="";
    });
    publicPhone.disabled=contactMode.value!=="phone";
    syncContactFields();

    copyBtn.addEventListener("click",function(){
      var done=function(){copyBtn.textContent="Link Copied";setTimeout(function(){copyBtn.textContent="Copy Link";},1800);};
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(publicUrl).then(done);
        return;
      }
      var ta=document.createElement("textarea");
      ta.value=publicUrl;
      ta.style.position="fixed";
      ta.style.opacity="0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    });

    downloadBtn.addEventListener("click",function(){
      var node=document.getElementById("qr-download-target");
      if(!node) return;
      var blob=new Blob([node.innerHTML],{type:"image/svg+xml;charset=utf-8"});
      var url=URL.createObjectURL(blob);
      var link=document.createElement("a");
      link.href=url;
      link.download=${JSON.stringify(`${publicId}-qr.svg`)};
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });

    saveBtn.addEventListener("click",function(){
      saveBtn.disabled=true;
      saveStatus.textContent="Saving...";
      var visible=contactToggle.getAttribute("aria-checked")==="true";
      var payload;
      if(!visible){
        payload={contact_mode:"none",public_phone:null};
      }else if(contactMode.value==="phone"){
        payload={contact_mode:"phone",public_phone:publicPhone.value.trim()||null};
      }else{
        payload={contact_mode:"relay",public_phone:null};
      }
      fetch("/api/cats/"+encodeURIComponent(${JSON.stringify(publicId)})+"/contact",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
        .then(function(r){
          saveBtn.disabled=false;
          if(r.ok){
            saveStatus.textContent="Saved";
          }else{
            saveStatus.textContent="Could not save these settings.";
          }
        })
        .catch(function(){
          saveBtn.disabled=false;
          saveStatus.textContent="Network error.";
        });
    });
  })();
  </script>
</body>
</html>`;

  return htmlResponse(html);
}
