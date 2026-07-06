import { getCatForOwner } from "../db/index.js";
import { getCountryBadgeLabel } from "../data/countries.js";
import { MISHIPASS_DESIGN_CSS, escapeHtml, htmlResponse } from "../utils/html.js";
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
  const safePhoto = cat.photo_r2_key
    ? `<img class="hero-photo" src="/media/cats/${safeId}/photo" alt="${safeName}" />`
    : `<div class="hero-photo photo-placeholder">${t(lang, "noPhoto")}</div>`;
  const statCards = [
    [t(lang, "country"), safeCountry],
    [t(lang, "mode"), safeMode],
    [t(lang, "weight"), escapeHtml(cat.weight ?? t(lang, "notSet"))],
    [t(lang, "nextVaccine"), escapeHtml(cat.next_vaccine_date ?? t(lang, "notSet"))],
  ].map(([label, value]) => `<div class="hero-stat"><strong>${label}</strong><span>${value}</span></div>`).join("");

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    ${TOP_NAV_CSS}
    body{padding:var(--space-3)}
    .page-shell{max-width:1184px;margin:0 auto;padding-bottom:var(--space-6)}
    .detail-card{padding:var(--space-4);margin-top:var(--space-2)}
    .hero{display:grid;grid-template-columns:minmax(260px,360px) minmax(0,1fr);gap:var(--space-4);align-items:start}
    .hero-photo{width:100%;aspect-ratio:4/3;border-radius:8px;object-fit:cover;background:#fff7f0;box-shadow:0 12px 30px rgba(56,38,26,.08)}
    .hero-copy{display:grid;gap:var(--space-2)}
    h1{font-size:clamp(2rem,5vw,3.2rem);line-height:1.04;margin:0;color:var(--teal)}
    .meta{font-size:1rem;color:var(--ink);margin:0;display:flex;gap:var(--space-1);align-items:center;flex-wrap:wrap}
    .id-line{font-size:.75rem;color:var(--muted);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;margin:0}
    .hero-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2)}
    .hero-stat{padding:var(--space-2);border-radius:8px;border:1px solid var(--line);background:#fff7f0;min-width:0}
    .hero-stat strong{display:block;font-size:.75rem;color:var(--muted);margin-bottom:4px}
    .hero-stat span{display:block;font-size:1rem;font-weight:800;color:var(--ink);overflow-wrap:anywhere}
    .nav-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2);margin:0}
    .nav-links a{background:#fff;color:var(--teal);border:1px solid var(--line);text-decoration:none;border-radius:8px;min-height:52px;display:flex;align-items:center;justify-content:space-between;padding:var(--space-2);font-weight:800;font-size:.9375rem;box-shadow:0 8px 24px rgba(56,38,26,.06)}
    .nav-links a::after{content:"›";font-size:1.2rem;color:var(--brand-coral)}
    .section-heading{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin:var(--space-4) 0 var(--space-2)}
    .section-heading h2{font-size:1.4rem;font-weight:900;color:var(--teal);margin:0}
    .info-panel{padding:var(--space-3)}
    .info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2) var(--space-3)}
    .info-row{display:grid;gap:6px;padding:0}
    .info-row.notes-row{grid-column:1/-1}
    .info-label{font-weight:900;font-size:.8125rem;color:var(--teal)}
    .info-value{min-height:44px;padding:12px 14px;border:1px solid var(--line);border-radius:8px;background:#fffaf6;color:var(--ink);overflow-wrap:anywhere}
    .info-edit-input,.info-edit-select{min-height:44px}
    textarea.info-edit-input{min-height:120px}
    .edit-bar{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap}
    .edit-actions{display:flex;gap:var(--space-1);flex-wrap:wrap}
    .edit-status{font-size:.875rem;color:var(--muted);margin:0}
    .gallery-panel{padding:var(--space-3)}
    .gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(172px,1fr));gap:var(--space-2);margin-bottom:var(--space-2)}
    .gallery-item{border-radius:8px;overflow:hidden;border:1px solid var(--line);background:var(--card);position:relative;box-shadow:0 8px 24px rgba(56,38,26,.06)}
    .gallery-item img{width:100%;aspect-ratio:1;object-fit:cover;display:block}
    .gallery-item-placeholder{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:.75rem;background:linear-gradient(135deg,#fff7f0,#e8faf7)}
    .gallery-item-actions{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:6px}
    .gallery-item-actions button{font-size:.7rem;min-height:30px;padding:2px 4px;border-radius:6px}
    .gallery-item-delete{grid-column:1/-1}
    .profile-badge{position:absolute;top:4px;left:4px;background:var(--teal);color:#fff;font-size:.65rem;font-weight:900;padding:2px 6px;border-radius:999px}
    .public-badge{position:absolute;top:4px;right:4px;background:#fff;color:var(--teal);border:1px solid var(--line);font-size:.65rem;font-weight:900;padding:2px 6px;border-radius:999px}
    .upload-area{border:2px dashed var(--line);border-radius:8px;padding:var(--space-3);text-align:center;margin-bottom:var(--space-2);background:#fffaf6}
    .upload-area input[type=file]{display:none}
    .gallery-empty{color:var(--muted);font-size:.9rem;padding:var(--space-2) 0}
    @media(max-width:900px){.hero{grid-template-columns:1fr}.nav-links{grid-template-columns:1fr 1fr}.info-grid{grid-template-columns:1fr}}
    @media(max-width:560px){body{padding:var(--space-2)}.detail-card,.info-panel,.gallery-panel{padding:var(--space-3)}.hero-stat-grid,.nav-links{grid-template-columns:1fr}.gallery-grid{grid-template-columns:repeat(auto-fill,minmax(132px,1fr))}}
  </style>
</head>
<body>
  <main class="page-shell">
    ${renderTopNav(lang, { authenticated: true, active: "dashboard" })}
    <section class="mp-card detail-card">
      <div><a class="mp-back" href="/dashboard?lang=${lang}">&larr; ${t(lang, "dashboard")}</a></div>
      <div class="hero">
        <div>${safePhoto}</div>
        <div class="hero-copy">
          <h1>${safeName}</h1>
          <p class="meta"><span class="badge">${safeCountry}</span><span class="mode-badge mode-${safeMode}">${safeMode}</span></p>
          <p class="id-line">${safeId}</p>
          <div class="hero-stat-grid">${statCards}</div>
          <div class="nav-links">
            <a href="/dashboard/cats/${safeId}/public-profile?lang=${lang}">${t(lang, "viewPublicProfile")}</a>
            <a href="/dashboard/cats/${safeId}/qr?lang=${lang}">${t(lang, "qrCard")}</a>
            <a href="/dashboard/cats/${safeId}/cartilla?lang=${lang}">${t(lang, "cartilla")}</a>
        ${cat.current_mode === "missing" ? `<a href="/dashboard/cats/${safeId}/sightings?lang=${lang}">${t(lang, "reports")}</a>` : ""}
          </div>
        </div>
      </div>

      <div class="section-heading"><h2>${t(lang, "basicInformation")}</h2></div>
      <section class="mp-card info-panel">
        <div class="info-grid" id="info-grid">
          <div class="info-row"><span class="info-label">${t(lang, "name")}</span><span class="info-value" id="val-name">${safeName}</span><input class="info-edit-input hidden" id="inp-name" value="${safeName}" maxlength="100" /></div>
          <div class="info-row"><span class="info-label">${t(lang, "sex")}</span><span class="info-value" id="val-sex">${escapeHtml(cat.sex ?? t(lang, "notSet"))}</span><select class="info-edit-select hidden" id="inp-sex"><option value="">—</option><option value="Male"${cat.sex === "Male" ? " selected" : ""}>Male</option><option value="Female"${cat.sex === "Female" ? " selected" : ""}>Female</option></select></div>
          <div class="info-row"><span class="info-label">${t(lang, "breedMix")}</span><span class="info-value" id="val-breed">${escapeHtml(cat.breed_mix ?? t(lang, "notSet"))}</span><input class="info-edit-input hidden" id="inp-breed" list="breed-datalist" value="${escapeHtml(cat.breed_mix ?? "")}" maxlength="100" /><datalist id="breed-datalist"><option value="Mixed / Unknown / Other"></option><option value="Abyssinian"></option><option value="Bengal"></option><option value="British Shorthair"></option><option value="Devon Rex"></option><option value="Domestic Longhair"></option><option value="Domestic Shorthair"></option><option value="European Burmese"></option><option value="Maine Coon"></option><option value="Persian"></option><option value="Ragdoll"></option><option value="Russian Blue"></option><option value="Scottish Fold"></option><option value="Siamese"></option><option value="Sphynx"></option><option value="Turkish Angora"></option></datalist></div>
          <div class="info-row"><span class="info-label">${t(lang, "colorMarkings")}</span><span class="info-value" id="val-color">${escapeHtml(cat.color_markings ?? t(lang, "notSet"))}</span><input class="info-edit-input hidden" id="inp-color" list="color-datalist" value="${escapeHtml(cat.color_markings ?? "")}" maxlength="200" /><datalist id="color-datalist"><option value="Black"></option><option value="White"></option><option value="Gray"></option><option value="Orange"></option><option value="Cream"></option><option value="Brown"></option><option value="Calico"></option><option value="Tortoiseshell"></option><option value="Tabby"></option><option value="Tuxedo"></option><option value="Pointed / Siamese-style"></option><option value="Mixed / Other"></option></datalist></div>
          <div class="info-row"><span class="info-label">${t(lang, "weight")}</span><span class="info-value" id="val-weight">${escapeHtml(cat.weight ?? t(lang, "notSet"))}</span><input class="info-edit-input hidden" id="inp-weight" value="${escapeHtml(cat.weight ?? "")}" maxlength="20" /></div>
          <div class="info-row"><span class="info-label">${t(lang, "birthDate")}</span><span class="info-value" id="val-birth">${escapeHtml(cat.birth_date ?? t(lang, "notSet"))}</span><input type="date" class="info-edit-input hidden" id="inp-birth" value="${escapeHtml(cat.birth_date ?? "")}" /></div>
          <div class="info-row notes-row"><span class="info-label">${t(lang, "notes")}</span><span class="info-value" id="val-notes">${escapeHtml(cat.notes ?? t(lang, "notSet"))}</span><textarea class="info-edit-input hidden" id="inp-notes" maxlength="1000" rows="3">${escapeHtml(cat.notes ?? "")}</textarea></div>
        </div>
        <div class="edit-bar">
          <p class="edit-status hidden" id="edit-status"></p>
          <div class="edit-actions">
            <button class="mp-btn mp-btn-secondary" id="edit-btn" onclick="startEdit()">${t(lang, "editInfo")}</button>
            <button class="mp-btn mp-btn-primary hidden" id="save-btn" onclick="saveInfo()">${t(lang, "saveChanges")}</button>
            <button class="mp-btn mp-btn-secondary hidden" id="cancel-btn" onclick="cancelEdit()">${t(lang, "cancelEdit")}</button>
          </div>
        </div>
      </section>

      <div class="section-heading"><h2>${t(lang, "galleryTitle")}</h2></div>
      <section class="mp-card gallery-panel" id="gallery-upload">
        <div class="upload-area">
          <label class="mp-btn mp-btn-secondary" for="gallery-upload-input">${t(lang, "uploadPhoto")}</label>
          <input type="file" id="gallery-upload-input" accept="image/jpeg,image/png,image/webp" />
          <p id="upload-status" class="muted" style="margin:var(--space-1) 0 0;font-size:.875rem"></p>
        </div>
        <div class="gallery-grid" id="gallery-grid"><p class="gallery-empty">${t(lang, "noPhotos")}</p></div>
      </section>
    </section>
  </main>

  <script>
  (function(){
    var safeId=${JSON.stringify(safeId)};
    var lang=${JSON.stringify(lang)};
    var TR={
      setAsProfile:${JSON.stringify(t(lang, "setAsProfile"))},
      makePublic:${JSON.stringify(t(lang, "makePublic"))},
      makePrivate:${JSON.stringify(t(lang, "makePrivate"))},
      deletePhoto:${JSON.stringify(t(lang, "deletePhoto"))},
      confirmDeletePhoto:${JSON.stringify(t(lang, "confirmDeletePhoto"))},
      galleryLimit:${JSON.stringify(t(lang, "galleryLimit"))},
      uploading:${JSON.stringify(t(lang, "uploading"))},
      uploadPhoto:${JSON.stringify(t(lang, "uploadPhoto"))},
      photoPublic:${JSON.stringify(t(lang, "photoPublic"))},
      photoPrivate:${JSON.stringify(t(lang, "photoPrivate"))},
      noPhotos:${JSON.stringify(t(lang, "noPhotos"))},
      error:${JSON.stringify(t(lang, "error"))},
      saved:${JSON.stringify(t(lang, "saved"))},
    };

    // ── Gallery ──────────────────────────────────────────────────────────────
    function loadGallery(){
      fetch("/api/cats/"+encodeURIComponent(safeId)+"/photos",{credentials:"same-origin"})
        .then(function(r){return r.json()})
        .then(function(d){renderGallery(d.photos||[])})
        .catch(function(){});
    }

    function renderGallery(photos){
      var grid=document.getElementById("gallery-grid");
      if(!photos.length){grid.innerHTML='<p class="gallery-empty">'+TR.noPhotos+'</p>';return;}
      grid.innerHTML=photos.map(function(p){
        var imgUrl="/media/cats/"+encodeURIComponent(safeId)+"/photos/"+p.id;
        return '<div class="gallery-item" id="gitem-'+p.id+'">'
          +(p.isProfile?'<span class="profile-badge">Profile</span>':'')
          +'<span class="public-badge">'+(p.isPublic?TR.photoPublic:TR.photoPrivate)+'</span>'
          +'<img src="'+imgUrl+'" alt="cat photo" loading="lazy" />'
          +'<div class="gallery-item-actions">'
          +(p.isProfile?'':'<button class="mp-btn mp-btn-secondary" onclick="setProfile('+p.id+')">'+TR.setAsProfile+'</button>')
          +'<button class="mp-btn mp-btn-secondary" onclick="togglePublic('+p.id+','+(!p.isPublic)+')">'+(p.isPublic?TR.makePrivate:TR.makePublic)+'</button>'
          +'<button class="mp-btn btn-danger gallery-item-delete" onclick="deletePhoto('+p.id+')">'+TR.deletePhoto+'</button>'
          +'</div></div>';
      }).join("");
    }

    function setProfile(photoId){
      fetch("/api/cats/"+encodeURIComponent(safeId)+"/photos/"+photoId+"/profile",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}"})
        .then(function(r){if(r.ok)loadGallery();});
    }

    function togglePublic(photoId,makePublic){
      fetch("/api/cats/"+encodeURIComponent(safeId)+"/photos/"+photoId+"/visibility",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({isPublic:makePublic})})
        .then(function(r){if(r.ok)loadGallery();});
    }

    function deletePhoto(photoId){
      if(!confirm(TR.confirmDeletePhoto))return;
      fetch("/api/cats/"+encodeURIComponent(safeId)+"/photos/"+photoId+"/delete",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}"})
        .then(function(r){if(r.ok)loadGallery();});
    }

    var uploadInput=document.getElementById("gallery-upload-input");
    var uploadStatus=document.getElementById("upload-status");
    uploadInput.addEventListener("change",function(){
      if(!uploadInput.files||!uploadInput.files[0])return;
      uploadStatus.textContent=TR.uploading;
      var fd=new FormData();
      fd.append("photo",uploadInput.files[0]);
      fetch("/api/cats/"+encodeURIComponent(safeId)+"/photos",{method:"POST",credentials:"same-origin",body:fd})
        .then(function(r){
          if(r.ok){uploadStatus.textContent="";loadGallery();}
          else r.json().then(function(d){uploadStatus.textContent=d.error||TR.error;});
        })
        .catch(function(){uploadStatus.textContent=TR.error;});
      uploadInput.value="";
    });

    // ── Inline edit ──────────────────────────────────────────────────────────
    var editFields=["name","sex","breed","color","weight","birth","notes"];
    function startEdit(){
      editFields.forEach(function(f){
        document.getElementById("val-"+f).classList.add("hidden");
        document.getElementById("inp-"+f).classList.remove("hidden");
      });
      document.getElementById("edit-btn").classList.add("hidden");
      document.getElementById("save-btn").classList.remove("hidden");
      document.getElementById("cancel-btn").classList.remove("hidden");
      document.getElementById("edit-status").classList.add("hidden");
    }

    function cancelEdit(){
      editFields.forEach(function(f){
        document.getElementById("val-"+f).classList.remove("hidden");
        document.getElementById("inp-"+f).classList.add("hidden");
      });
      document.getElementById("edit-btn").classList.remove("hidden");
      document.getElementById("save-btn").classList.add("hidden");
      document.getElementById("cancel-btn").classList.add("hidden");
    }

    function saveInfo(){
      var saveBtn=document.getElementById("save-btn");
      var status=document.getElementById("edit-status");
      saveBtn.disabled=true;
      var payload={
        name:document.getElementById("inp-name").value.trim()||undefined,
        sex:document.getElementById("inp-sex").value||null,
        breedMix:document.getElementById("inp-breed").value.trim()||null,
        colorMarkings:document.getElementById("inp-color").value.trim()||null,
        weight:document.getElementById("inp-weight").value.trim()||null,
        birthDate:document.getElementById("inp-birth").value||null,
        notes:document.getElementById("inp-notes").value.trim()||null,
      };
      fetch("/api/cats/"+encodeURIComponent(safeId)+"/update",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
        .then(function(r){
          saveBtn.disabled=false;
          status.classList.remove("hidden");
          if(r.ok){
            status.textContent=TR.saved;
            // Update display values
            if(payload.name)document.getElementById("val-name").textContent=payload.name;
            document.getElementById("val-sex").textContent=payload.sex||"";
            document.getElementById("val-breed").textContent=payload.breedMix||"";
            document.getElementById("val-color").textContent=payload.colorMarkings||"";
            document.getElementById("val-weight").textContent=payload.weight||"";
            document.getElementById("val-birth").textContent=payload.birthDate||"";
            document.getElementById("val-notes").textContent=payload.notes||"";
            cancelEdit();
          } else {
            status.textContent=TR.error;
          }
        })
        .catch(function(){saveBtn.disabled=false;status.classList.remove("hidden");status.textContent=TR.error;});
    }

    // expose to onclick handlers
    window.setProfile=setProfile;
    window.togglePublic=togglePublic;
    window.deletePhoto=deletePhoto;
    window.startEdit=startEdit;
    window.cancelEdit=cancelEdit;
    window.saveInfo=saveInfo;

    loadGallery();
  })();
  </script>
</body>
</html>`;

  return htmlResponse(html);
}
