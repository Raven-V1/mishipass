import { getCatForOwner } from "../db/index.js";
import { getCountryBadgeLabel } from "../data/countries.js";
import { MISHIPASS_DESIGN_CSS, brandLockupHtml, escapeHtml, htmlResponse } from "../utils/html.js";
import type { RequestContext } from "../middleware/session.js";
import { type LanguageCode, t } from "../utils/i18n.js";
import { renderTopNav, TOP_NAV_CSS } from "./partials/topNav.js";

export async function handleCatDetail(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
  publicBaseUrl: string,
  lang: LanguageCode = "en",
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  }

  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  const safeName = escapeHtml(cat.name);
  const safeId = escapeHtml(publicId);
  const safeCountry = escapeHtml(getCountryBadgeLabel(cat.country_code));
  const safeMode = escapeHtml(cat.current_mode);

  // Build cat info fields
  let infoHtml = "";
  if (cat.sex) infoHtml += `<p class="info">${t(lang, "sex")}: ${escapeHtml(cat.sex)}</p>`;
  if (cat.color_markings) infoHtml += `<p class="info">${t(lang, "colorMarkings")}: ${escapeHtml(cat.color_markings)}</p>`;
  if (cat.breed_mix) infoHtml += `<p class="info">${t(lang, "breedMix")}: ${escapeHtml(cat.breed_mix)}</p>`;
  if (cat.weight) infoHtml += `<p class="info">${t(lang, "weight")}: ${escapeHtml(cat.weight)}</p>`;
  if (cat.birth_date) infoHtml += `<p class="info">${t(lang, "birthDate")}: ${escapeHtml(cat.birth_date)}</p>`;
  if (cat.notes) infoHtml += `<p class="info">${t(lang, "notes")}: ${escapeHtml(cat.notes)}</p>`;

  // Photo
  const photoHtml = cat.photo_r2_key
    ? `<div class="photo"><img src="/media/cats/${safeId}/photo" alt="${safeName}" /></div>`
    : "";

  // Links -- sightings only if missing
  let linksHtml = `
    <a href="/c/${safeId}?lang=${lang}" class="secondary">${t(lang, "viewPublicProfile")}</a>
    <a href="/dashboard/cats/${safeId}/qr?lang=${lang}" class="secondary">${t(lang, "qrCard")}</a>
    <a href="/dashboard/cats/${safeId}/cartilla?lang=${lang}" class="secondary">${t(lang, "cartilla")}</a>`;
  if (cat.current_mode === "missing") {
    linksHtml += `\n    <a href="/dashboard/cats/${safeId}/sightings?lang=${lang}" class="secondary">${t(lang, "reports")}</a>`;
  }

  const currentNextVaccineDate = cat.next_vaccine_date ? escapeHtml(cat.next_vaccine_date) : "";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — MishiPass Dashboard</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    ${TOP_NAV_CSS}
    body{padding:var(--space-3)}
    .page-shell{max-width:736px;margin:var(--space-4) auto}.detail-shell{padding:var(--space-4);margin-top:var(--space-3)}
    h1{font-size:clamp(2rem,6vw,3rem);line-height:1.08;margin:0 0 var(--space-1);color:var(--teal)}
    h2{font-size:1.25rem;margin:var(--space-4) 0 var(--space-2);color:var(--teal);border-bottom:1px solid var(--line);padding-bottom:var(--space-1)}
    .meta{font-size:0.875rem;color:var(--muted);margin-bottom:var(--space-1)}
    .nav{margin-bottom:var(--space-3);font-size:0.875rem}
    .info{font-size:0.95rem;margin:var(--space-1) 0;color:var(--ink)}
    .photo img{width:144px;height:144px;border-radius:8px;object-fit:cover;margin:var(--space-3) 0}
    .links{display:flex;gap:var(--space-1);flex-wrap:wrap;margin-top:var(--space-3)}
    .links a{background:#fff7f0;color:var(--teal);border:1px solid var(--line);text-decoration:none;border-radius:8px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:var(--space-1) var(--space-2);font-weight:800}
    .mode-active{background:#dfd;color:#060}
    .mode-missing{background:#fdd;color:#900}
    .mode-vet{background:#e0f0ff;color:#036}
    .id-line{font-size:0.8rem;color:var(--muted);margin:var(--space-1) 0;font-family:monospace}
    .edit-section{margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--line)}
    .field{margin-bottom:var(--space-2)}.field-row{display:flex;gap:var(--space-2);align-items:flex-end;flex-wrap:wrap}
    .field-row input{flex:1 1 180px;max-width:240px}
    .save-status{font-size:.875rem;color:var(--muted);margin-left:var(--space-1)}
    .save-status.ok{color:var(--green)}.save-status.err{color:#b42318}
    @media(max-width:430px){body{padding:var(--space-2)}.detail-shell{padding:var(--space-3)}.links a{width:100%}.field-row{flex-direction:column}.field-row input{max-width:100%}}
  </style>
</head>
<body>
  <main class="page-shell">
    ${renderTopNav(lang, { authenticated: true })}
    ${brandLockupHtml(`/?lang=${lang}`)}
  <section class="mp-card detail-shell">
    <div class="nav"><a class="mp-back" href="/dashboard?lang=${lang}">&larr; ${t(lang, "dashboard")}</a></div>
    <h1>${safeName}</h1>
    <p class="meta">${safeCountry} &middot; <span class="mode-badge mode-${safeMode}">${safeMode}</span></p>
    <p class="id-line">${safeId}</p>
    ${photoHtml}
    ${infoHtml}
    <div class="links">${linksHtml}
    </div>
    <div class="edit-section">
      <h2>${t(lang, "nextVaccineDate")}</h2>
      <form id="next-vaccine-form">
        <div class="field field-row">
          <label for="next-vaccine-input" style="flex:0 0 auto;margin:0">${t(lang, "nextVaccineDate")}</label>
          <input type="date" id="next-vaccine-input" name="next_vaccine_date" value="${currentNextVaccineDate}" />
          <button type="submit" class="btn-primary">${t(lang, "save")}</button>
          <span id="vaccine-save-status" class="save-status"></span>
        </div>
      </form>
    </div>
    <!-- pending detail-page repurpose (F) -- cat details + gallery, Zhanerke design -->
  </section>
  </main>
  <script>
  (function(){
    var form=document.getElementById("next-vaccine-form");
    var status=document.getElementById("vaccine-save-status");
    form.addEventListener("submit",function(e){
      e.preventDefault();
      var btn=form.querySelector("button");
      btn.disabled=true;
      status.textContent="";
      status.className="save-status";
      var val=document.getElementById("next-vaccine-input").value||null;
      fetch("/api/cats/${safeId}/update",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({next_vaccine_date:val})})
        .then(function(r){
          btn.disabled=false;
          if(r.ok){status.textContent=${JSON.stringify(t(lang, "save"))};status.className="save-status ok";}
          else{status.textContent="Error";status.className="save-status err";}
        })
        .catch(function(){btn.disabled=false;status.textContent="Error";status.className="save-status err";});
    });
  })();
  </script>
</body>
</html>`;

  return htmlResponse(html);
}
