import { COUNTRIES } from "../data/countries.js";
import { htmlResponse } from "../utils/html.js";

function buildCountryOptions(): string {
  return COUNTRIES.map(
    c => `<option value="${c.code}">${c.name} (${c.code})</option>`
  ).join("\n          ");
}

function buildColorOptions(): string {
  const colors = [
    "Black",
    "White",
    "Gray",
    "Orange",
    "Cream",
    "Brown",
    "Calico",
    "Tortoiseshell",
    "Tabby",
    "Tuxedo",
    "Pointed / Siamese-style",
    "Mixed / Other",
  ];
  return colors.map(color => `<option value="${color}">${color}</option>`).join("\n            ");
}

function buildDashboardHtml(): string {
  const countryOptions = buildCountryOptions();
  const colorOptions = buildColorOptions();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MishiPass - Owner Dashboard</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;max-width:1040px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
    h1{font-size:1.75rem;margin-bottom:1rem}
    h2{font-size:1.25rem;margin-top:1.5rem;margin-bottom:0.75rem}
    .hidden{display:none}
    label{display:block;margin-bottom:0.25rem;font-size:0.875rem;font-weight:500}
    input[type="text"],input[type="email"],input[type="password"],select{width:100%;padding:0.5rem;border:1px solid #ccc;border-radius:4px;margin-bottom:0.75rem;font-size:1rem}
    button{padding:0.5rem 1rem;border:none;border-radius:4px;cursor:pointer;font-size:0.875rem;margin-right:0.5rem;margin-bottom:0.5rem}
    .btn-primary{background:#111;color:#fff}
    .btn-secondary{background:#eee;color:#111}
    .btn-danger{background:#c00;color:#fff}
    .btn-warn{background:#e90;color:#fff}
    .error{color:#c00;font-size:0.875rem;margin-bottom:0.75rem}
    .success{color:#060;font-size:0.875rem;margin-bottom:0.75rem}
    .cat-board{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;align-items:stretch}
    .cat-card{border:1px solid #ddd;border-radius:6px;padding:1rem;min-height:100%;display:flex;flex-direction:column}
    .cat-card h3{margin:0 0 0.5rem 0;font-size:1rem}
    .cat-meta{font-size:0.875rem;color:#555;margin-bottom:0.5rem}
    .cat-actions{margin-top:0.5rem}
    .cat-photo{width:100%;aspect-ratio:4/3;border-radius:6px;object-fit:cover;background:#eee;margin-bottom:0.75rem}
    .cat-photo-placeholder{width:100%;aspect-ratio:4/3;border-radius:6px;background:#eee;display:flex;align-items:center;justify-content:center;color:#666;font-size:0.85rem;margin-bottom:0.75rem}
    .mode-fields{margin-top:0.5rem}
    .mode-fields input{margin-bottom:0.5rem}
    a{color:#111}
    .nav{margin-bottom:1.5rem;font-size:0.875rem}
    hr{border:none;border-top:1px solid #eee;margin:1.5rem 0}
    button:disabled{opacity:0.6;cursor:not-allowed}
    .tab-nav{display:flex;gap:0;border-bottom:2px solid #ddd;margin-bottom:1.5rem}
    .tab-btn{background:none;border:none;border-bottom:2px solid transparent;padding:0.5rem 1rem;cursor:pointer;font-size:0.875rem;font-weight:500;margin:0 0 -2px 0;color:#555}
    .tab-btn.active{border-bottom-color:#111;color:#111}
    .tab-panel{display:none}
    .tab-panel.active{display:block}
    .photo-label{display:inline-block;padding:0.4rem 0.8rem;background:#eee;color:#111;border-radius:4px;cursor:pointer;font-size:0.75rem;font-weight:500}
    .photo-label:hover{background:#ddd}
    .photo-file-input{display:none}
    details summary{cursor:pointer;font-size:1.25rem;font-weight:600;margin-top:1.5rem;margin-bottom:0.75rem}
    .contact-card{border:1px solid #ddd;border-radius:6px;padding:1rem;margin-bottom:1rem}
    .contact-card h4{margin:0 0 0.5rem 0}
    .settings-card{border:1px solid #ddd;border-radius:6px;padding:1rem;max-width:420px}
    .breed-preview{display:none;max-width:160px;max-height:110px;object-fit:cover;border-radius:6px;margin:0.25rem 0 0.75rem}
    .guest-language{max-width:220px;margin-bottom:1rem}.guest-language label{font-size:0.8rem}.guest-language select{margin-bottom:0}
    .breed-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:0.5rem;margin:0 0 0.75rem 0}
    .breed-card{border:1px solid #ddd;border-radius:6px;background:#fff;padding:0.4rem;text-align:left;cursor:pointer;min-height:92px}
    .breed-card.active{border-color:#111;box-shadow:0 0 0 1px #111}
    .breed-card img,.breed-card .breed-fallback{width:100%;height:62px;object-fit:cover;border-radius:4px;background:#eee;display:flex;align-items:center;justify-content:center;color:#666;font-size:0.75rem}
    .breed-card span{display:block;margin-top:0.25rem;font-size:0.78rem;line-height:1.2}
    .swatch-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(74px,1fr));gap:0.45rem;margin:0 0 0.75rem 0}
    .swatch-card{border:1px solid #ddd;border-radius:6px;background:#fff;padding:0.35rem;cursor:pointer;font-size:0.75rem;text-align:center}
    .swatch-card.active{border-color:#111;box-shadow:0 0 0 1px #111}.swatch{height:34px;border-radius:4px;margin-bottom:0.25rem;border:1px solid #ddd}
    .swatch.black{background:#111}.swatch.white{background:#fff}.swatch.gray{background:#9ca3af}.swatch.orange{background:#f97316}.swatch.cream{background:#f5deb3}.swatch.brown{background:#8b5e3c}.swatch.calico{background:linear-gradient(135deg,#fff 0 32%,#111 32% 58%,#f97316 58%)}.swatch.tortoiseshell{background:linear-gradient(135deg,#111,#8b5e3c 45%,#f97316)}.swatch.tabby{background:repeating-linear-gradient(90deg,#9ca3af 0 8px,#555 8px 12px)}.swatch.tuxedo{background:linear-gradient(90deg,#111 0 35%,#fff 35% 65%,#111 65%)}.swatch.pointed{background:radial-gradient(circle at 50% 50%,#f5deb3 0 45%,#6b4f3a 46%)}.swatch.mixed{background:linear-gradient(135deg,#111,#fff,#f97316,#9ca3af)}
    @media (max-width:560px){body{margin:1rem auto}.tab-nav{overflow-x:auto}.tab-btn{white-space:nowrap;padding:0.5rem 0.75rem}}
  </style>
</head>
<body>
  <h1>MishiPass</h1>
  <div class="nav"><a href="/">&larr; Home</a></div>

  <div id="auth-section">
    <div class="guest-language">
      <label for="guest-language-select">Language</label>
      <select id="guest-language-select">
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="kk-KZ">Қазақша</option>
      </select>
    </div>
    <div id="login-section">
      <h2>Login</h2>
      <div id="login-error" class="error hidden"></div>
      <form id="login-form">
        <label for="login-email">Email</label>
        <input type="email" id="login-email" name="email" required />
        <label for="login-password">Password</label>
        <input type="password" id="login-password" name="password" required />
        <button type="submit" class="btn-primary">Login</button>
      </form>
    </div>
    <hr />
    <div id="register-section">
      <h2>Register</h2>
      <div id="register-error" class="error hidden"></div>
      <div id="register-success" class="success hidden"></div>
      <form id="register-form">
        <label for="register-email">Email</label>
        <input type="email" id="register-email" name="email" required />
        <label for="register-password">Password (min 8 characters)</label>
        <input type="password" id="register-password" name="password" minlength="8" required />
        <button type="submit" class="btn-primary">Register</button>
      </form>
    </div>
  </div>

  <div id="dashboard-section" class="hidden">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h2>Dashboard</h2>
      <button id="logout-btn" class="btn-secondary">Logout</button>
    </div>

    <div class="tab-nav">
      <button class="tab-btn active" data-tab="cats-tab">Your Cats</button>
      <button class="tab-btn" data-tab="contact-tab">Contact &amp; Privacy</button>
      <button class="tab-btn" data-tab="settings-tab">Settings</button>
    </div>

    <div id="cats-tab" class="tab-panel active">
      <div id="cat-list"></div>
      <hr />
      <details>
        <summary>Register a Cat</summary>
        <div id="create-error" class="error hidden"></div>
        <form id="create-cat-form">
          <label for="cat-name">Name</label>
          <input type="text" id="cat-name" name="name" required />
          <label for="cat-country">Country</label>
          <select id="cat-country" name="countryCode" required>
            <option value="">Select country...</option>
            ${countryOptions}
          </select>
          <label for="cat-sex">Sex</label>
          <select id="cat-sex" name="sex" style="width:100%;padding:0.5rem;border:1px solid #ccc;border-radius:4px;margin-bottom:0.75rem">
            <option value="">Unknown</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
          <label for="cat-color">Color / Markings</label>
          <div id="color-swatch-grid" class="swatch-grid"></div>
          <select id="cat-color-select">
            <option value="">Select color / markings...</option>
            ${colorOptions}
          </select>
          <input type="text" id="cat-color" name="colorMarkings" maxlength="200" placeholder="Optional markings notes" />
          <label for="cat-breed">Breed / Mix</label>
          <div id="breed-card-grid" class="breed-card-grid"></div>
          <select id="cat-breed-select">
            <option value="">Loading breed options...</option>
          </select>
          <img id="breed-preview" class="breed-preview" alt="Breed sample" />
          <input type="text" id="cat-breed" name="breedMix" maxlength="100" />
          <button type="submit" class="btn-primary">Register Cat</button>
        </form>
      </details>
    </div>

    <div id="contact-tab" class="tab-panel">
      <div id="contact-list"><p>Loading contact settings...</p></div>
    </div>

    <div id="settings-tab" class="tab-panel">
      <div class="settings-card">
        <label for="language-select">Language</label>
        <select id="language-select">
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="kk-KZ">Қазақша</option>
        </select>
        <button id="language-save-btn" class="btn-primary">Save</button>
        <span id="language-status" style="font-size:0.85rem"></span>
      </div>
    </div>
  </div>

  <script>
    (function() {
      var authSection = document.getElementById("auth-section");
      var dashSection = document.getElementById("dashboard-section");
      var loginForm = document.getElementById("login-form");
      var registerForm = document.getElementById("register-form");
      var createCatForm = document.getElementById("create-cat-form");
      var logoutBtn = document.getElementById("logout-btn");
      var catList = document.getElementById("cat-list");
      var contactList = document.getElementById("contact-list");
      var loginError = document.getElementById("login-error");
      var registerError = document.getElementById("register-error");
      var registerSuccess = document.getElementById("register-success");
      var createError = document.getElementById("create-error");
      var languageSelect = document.getElementById("language-select");
      var languageSaveBtn = document.getElementById("language-save-btn");
      var languageStatus = document.getElementById("language-status");
      var guestLanguageSelect = document.getElementById("guest-language-select");
      var breedSelect = document.getElementById("cat-breed-select");
      var breedInput = document.getElementById("cat-breed");
      var breedPreview = document.getElementById("breed-preview");
      var breedCardGrid = document.getElementById("breed-card-grid");
      var colorSelect = document.getElementById("cat-color-select");
      var colorInput = document.getElementById("cat-color");
      var colorSwatchGrid = document.getElementById("color-swatch-grid");
      var breedImages = {};

      var currentLanguage = "en";
      var labels = {
        en: { dashboard: "Dashboard", cats: "Your Cats", contact: "Contact & Privacy", settings: "Settings", register: "Register a Cat", details: "Details", qr: "QR Card", sightings: "Sightings", upload: "Upload Photo", remove: "Remove", languageSaved: "Saved" },
        es: { dashboard: "Panel", cats: "Tus gatos", contact: "Contacto y privacidad", settings: "Configuración", register: "Registrar un gato", details: "Detalles", qr: "Tarjeta QR", sightings: "Avistamientos", upload: "Subir foto", remove: "Eliminar", languageSaved: "Guardado" },
        "kk-KZ": { dashboard: "Басқару", cats: "Мысықтар", contact: "Байланыс және құпиялылық", settings: "Баптаулар", register: "Мысықты тіркеу", details: "Мәліметтер", qr: "QR картасы", sightings: "Көрулер", upload: "Фото жүктеу", remove: "Жою", languageSaved: "Сақталды" }
      };
      function tr(key) { return (labels[currentLanguage] && labels[currentLanguage][key]) || labels.en[key] || key; }
      function setLang(value) {
        currentLanguage = value || "en";
        try { localStorage.setItem("mp_lang", currentLanguage); } catch(e) {}
        document.cookie = "mp_lang=" + encodeURIComponent(currentLanguage) + "; Path=/; Max-Age=31536000; SameSite=Lax";
        languageSelect.value = currentLanguage;
        guestLanguageSelect.value = currentLanguage;
        applyLanguage();
      }

      var tabBtns = document.querySelectorAll(".tab-btn");
      for (var t = 0; t < tabBtns.length; t++) {
        tabBtns[t].addEventListener("click", function() {
          var target = this.getAttribute("data-tab");
          var allBtns = document.querySelectorAll(".tab-btn");
          var allPanels = document.querySelectorAll(".tab-panel");
          for (var j = 0; j < allBtns.length; j++) allBtns[j].classList.remove("active");
          for (var j = 0; j < allPanels.length; j++) allPanels[j].classList.remove("active");
          this.classList.add("active");
          var panel = document.getElementById(target);
          if (panel) panel.classList.add("active");
          if (target === "contact-tab") loadContactSettings();
          if (target === "settings-tab") loadSettings();
        });
      }

      function showAuth() { authSection.classList.remove("hidden"); dashSection.classList.add("hidden"); }
      function showDash() { authSection.classList.add("hidden"); dashSection.classList.remove("hidden"); loadSettings(); loadBreeds(); loadCats(); }
      function hideMsg(el) { el.classList.add("hidden"); el.textContent = ""; }
      function showMsg(el, msg) { el.textContent = msg; el.classList.remove("hidden"); }
      function escHtml(s) { var d = document.createElement("div"); d.appendChild(document.createTextNode(s)); return d.innerHTML; }

      function loadCats() {
        fetch("/api/cats", { credentials: "same-origin" }).then(function(r) {
          if (r.status === 401) { showAuth(); return null; }
          return r.json();
        }).then(function(cats) {
          if (!cats) return;
          if (cats.length === 0) { catList.innerHTML = "<p>No cats registered yet.</p>"; return; }
          var html = '<div class="cat-board">';
          for (var i = 0; i < cats.length; i++) {
            var c = cats[i];
            html += '<div class="cat-card">';
            if (c.photoUrl) html += '<img class="cat-photo" src="' + escHtml(c.photoUrl) + '" alt="' + escHtml(c.name) + '" loading="lazy" />';
            else html += '<div class="cat-photo-placeholder" aria-label="No photo available">No photo</div>';
            html += '<h3><a href="/dashboard/cats/' + encodeURIComponent(c.publicId) + '">' + escHtml(c.name) + '</a></h3>';
            html += '<p class="cat-meta">Mode: ' + escHtml(c.currentMode) + '</p>';
            html += '<div class="cat-actions">';
            html += '<a href="/dashboard/cats/' + encodeURIComponent(c.publicId) + '" class="btn-secondary" style="text-decoration:none;display:inline-block;padding:0.4rem 0.8rem">' + tr("details") + '</a> ';
            html += '<a href="/dashboard/cats/' + encodeURIComponent(c.publicId) + '/qr" class="btn-secondary" style="text-decoration:none;display:inline-block;padding:0.4rem 0.8rem">' + tr("qr") + '</a> ';
            html += '<a href="/dashboard/cats/' + encodeURIComponent(c.publicId) + '/cartilla" class="btn-secondary" style="text-decoration:none;display:inline-block;padding:0.4rem 0.8rem">Cartilla</a> ';
            if (c.currentMode === "missing") {
              html += '<a href="/dashboard/cats/' + encodeURIComponent(c.publicId) + '/sightings" class="btn-secondary" style="text-decoration:none;display:inline-block;padding:0.4rem 0.8rem">' + tr("sightings") + '</a>';
              html += '<a href="/dashboard/cats/' + encodeURIComponent(c.publicId) + '/missing-card" class="btn-secondary" style="text-decoration:none;display:inline-block;padding:0.4rem 0.8rem">WhatsApp Card</a>';
            }
            html += '</div>';
            html += '<div class="cat-actions" data-photo-id="' + escHtml(c.publicId) + '" style="margin-top:0.5rem">';
            html += '<input type="file" accept="image/jpeg,image/png,image/webp" class="photo-file-input" id="photo-input-' + escHtml(c.publicId) + '" />';
            html += '<label for="photo-input-' + escHtml(c.publicId) + '" class="photo-label">' + tr("upload") + '</label>';
            html += '</div>';
            html += '<div class="cat-actions">';
            if (c.currentMode === "missing") {
              html += '<button class="btn-primary switch-active-btn" data-id="' + escHtml(c.publicId) + '">Switch to Active</button>';
            } else if (c.currentMode === "vet") {
              html += '<span style="background:#e0f0ff;color:#036;padding:4px 8px;border-radius:4px;font-size:0.8rem;font-weight:bold">&#x1F9BA; Vet Visit Active</span> ';
              html += '<button class="btn-primary cancel-vet-btn" data-id="' + escHtml(c.publicId) + '">End Vet Visit</button>';
            } else {
              html += '<button class="btn-warn switch-missing-btn" data-id="' + escHtml(c.publicId) + '">Switch to Missing</button> ';
              html += '<button class="btn-primary start-vet-btn" data-id="' + escHtml(c.publicId) + '">Start Vet Visit</button>';
              html += '<div class="mode-fields hidden" id="missing-fields-' + escHtml(c.publicId) + '">';
              html += '<input type="text" placeholder="City" class="missing-city" />';
              html += '<input type="text" placeholder="Area / neighborhood" class="missing-area" />';
              html += '<input type="text" placeholder="Reward (optional)" class="missing-reward" />';
              html += '<label style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem"><input type="checkbox" class="missing-board-opt-in" style="width:auto;margin:0" /> Recovery Board opt-in</label>';
              html += '<button class="btn-danger confirm-missing-btn" data-id="' + escHtml(c.publicId) + '">Confirm Missing</button>';
              html += '</div>';
            }
            html += '</div>';
            html += '<div class="cat-actions" style="margin-top:0.75rem"><button class="btn-danger remove-cat-btn" data-id="' + escHtml(c.publicId) + '">' + tr("remove") + '</button></div>';
            html += '</div>';
          }
          html += '</div>';
          catList.innerHTML = html;
          attachCatActions();
        }).catch(function() { showMsg(createError, "Network error. Try again."); });
      }

      function loadSettings() {
        fetch("/api/settings", { credentials: "same-origin" }).then(function(r) {
          if (r.status === 401) return null;
          return r.json();
        }).then(function(d) {
          if (!d) return;
          currentLanguage = d.language_code || "en";
          setLang(currentLanguage);
        }).catch(function() {});
      }

      function applyLanguage() {
        document.querySelector('[data-tab="cats-tab"]').textContent = tr("cats");
        document.querySelector('[data-tab="contact-tab"]').textContent = tr("contact");
        document.querySelector('[data-tab="settings-tab"]').textContent = tr("settings");
        var h2 = document.querySelector("#dashboard-section h2");
        if (h2) h2.textContent = tr("dashboard");
        var summary = document.querySelector("#cats-tab details summary");
        if (summary) summary.textContent = tr("register");
      }

      function loadBreeds() {
        if (!breedSelect || breedSelect.getAttribute("data-loaded")) return;
        function setFallback() {
          var fallback = ["Mixed / Unknown","Domestic Shorthair","Domestic Longhair","Siamese","Persian","Maine Coon","Bengal","Abyssinian"];
          breedSelect.innerHTML = '<option value="">Select breed / mix...</option>';
          for (var i=0;i<fallback.length;i++) breedSelect.innerHTML += '<option value="' + escHtml(fallback[i]) + '">' + escHtml(fallback[i]) + '</option>';
          breedSelect.setAttribute("data-loaded","1");
          renderBreedCards(fallback.map(function(name){ return { name:name, referenceImageUrl:"" }; }));
        }
        fetch("/api/cat-reference/breeds", { credentials: "same-origin" }).then(function(r) { return r.json(); }).then(function(d) {
          if (!d || !d.breeds || !d.breeds.length) { setFallback(); return; }
          breedSelect.innerHTML = '<option value="">Select breed / mix...</option>';
          for (var i=0;i<d.breeds.length;i++) {
            var b=d.breeds[i]; breedImages[b.name] = b.referenceImageUrl || "";
            breedSelect.innerHTML += '<option value="' + escHtml(b.name) + '">' + escHtml(b.name) + '</option>';
          }
          breedSelect.setAttribute("data-loaded","1");
          renderBreedCards(d.breeds.slice(0, 12));
        }).catch(setFallback);
      }

      function renderBreedCards(breeds) {
        var html = "";
        for (var i = 0; i < breeds.length; i++) {
          var b = breeds[i];
          html += '<button type="button" class="breed-card" data-breed="' + escHtml(b.name) + '">';
          html += b.referenceImageUrl ? '<img src="' + escHtml(b.referenceImageUrl) + '" alt="' + escHtml(b.name) + '" loading="lazy" />' : '<div class="breed-fallback">Sample</div>';
          html += '<span>' + escHtml(b.name) + '</span></button>';
        }
        breedCardGrid.innerHTML = html;
        var cards = breedCardGrid.querySelectorAll(".breed-card");
        for (var i = 0; i < cards.length; i++) cards[i].addEventListener("click", function() {
          var name = this.getAttribute("data-breed");
          breedSelect.value = name;
          breedInput.value = name;
          var imageUrl = breedImages[name];
          if (imageUrl) { breedPreview.src = imageUrl; breedPreview.style.display = "block"; }
          else { breedPreview.removeAttribute("src"); breedPreview.style.display = "none"; }
          var all = breedCardGrid.querySelectorAll(".breed-card");
          for (var j = 0; j < all.length; j++) all[j].classList.remove("active");
          this.classList.add("active");
        });
      }

      function renderColorSwatches() {
        var colors = [
          ["Black","black"],["White","white"],["Gray","gray"],["Orange","orange"],["Cream","cream"],["Brown","brown"],["Calico","calico"],["Tortoiseshell","tortoiseshell"],["Tabby","tabby"],["Tuxedo","tuxedo"],["Pointed / Siamese-style","pointed"],["Mixed / Other","mixed"]
        ];
        var html = "";
        for (var i = 0; i < colors.length; i++) html += '<button type="button" class="swatch-card" data-color="' + escHtml(colors[i][0]) + '"><div class="swatch ' + colors[i][1] + '"></div>' + escHtml(colors[i][0]) + '</button>';
        colorSwatchGrid.innerHTML = html;
        var cards = colorSwatchGrid.querySelectorAll(".swatch-card");
        for (var i = 0; i < cards.length; i++) cards[i].addEventListener("click", function() {
          var value = this.getAttribute("data-color");
          colorSelect.value = value;
          colorInput.value = value;
          var all = colorSwatchGrid.querySelectorAll(".swatch-card");
          for (var j = 0; j < all.length; j++) all[j].classList.remove("active");
          this.classList.add("active");
        });
      }

      function attachCatActions() {
        var missingBtns = document.querySelectorAll(".switch-missing-btn");
        for (var i = 0; i < missingBtns.length; i++) missingBtns[i].addEventListener("click", function() { var id = this.getAttribute("data-id"); var f = document.getElementById("missing-fields-" + id); if (f) f.classList.toggle("hidden"); });
        var confirmBtns = document.querySelectorAll(".confirm-missing-btn");
        for (var i = 0; i < confirmBtns.length; i++) confirmBtns[i].addEventListener("click", function() { var btn = this; var id = btn.getAttribute("data-id"); var f = document.getElementById("missing-fields-" + id); var city = f.querySelector(".missing-city").value; var area = f.querySelector(".missing-area").value; var reward = f.querySelector(".missing-reward").value; var board = f.querySelector(".missing-board-opt-in").checked; btn.disabled = true; btn.textContent = "Working..."; fetch("/api/cats/" + encodeURIComponent(id) + "/missing", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city: city || null, area: area || null, rewardAmount: reward || null, rewardVisible: reward ? 1 : 0, recoveryBoardOptIn: board }) }).then(function(r) { if (r.ok) loadCats(); btn.disabled = false; btn.textContent = "Confirm Missing"; }).catch(function() { btn.disabled = false; btn.textContent = "Confirm Missing"; }); });
        var activeBtns = document.querySelectorAll(".switch-active-btn");
        for (var i = 0; i < activeBtns.length; i++) activeBtns[i].addEventListener("click", function() { var btn = this; var id = btn.getAttribute("data-id"); btn.disabled = true; btn.textContent = "Working..."; fetch("/api/cats/" + encodeURIComponent(id) + "/active", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).then(function(r) { if (r.ok) loadCats(); btn.disabled = false; btn.textContent = "Switch to Active"; }).catch(function() { btn.disabled = false; btn.textContent = "Switch to Active"; }); });
        var startVetBtns = document.querySelectorAll(".start-vet-btn");
        for (var i = 0; i < startVetBtns.length; i++) startVetBtns[i].addEventListener("click", function() { var btn = this; var id = btn.getAttribute("data-id"); if (!confirm("Start Vet Visit? While active, anyone scanning this QR can submit a vet visit record. Save & Finish returns the QR to Active Profile.")) return; btn.disabled = true; btn.textContent = "Starting..."; fetch("/api/cats/" + encodeURIComponent(id) + "/vet-visit/start", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).then(function(r) { if (r.ok) loadCats(); else { r.text().then(function(t) { alert(t || "Could not start vet visit"); }); } btn.disabled = false; btn.textContent = "Start Vet Visit"; }).catch(function() { btn.disabled = false; btn.textContent = "Start Vet Visit"; }); });
        var cancelVetBtns = document.querySelectorAll(".cancel-vet-btn");
        for (var i = 0; i < cancelVetBtns.length; i++) cancelVetBtns[i].addEventListener("click", function() { var btn = this; var id = btn.getAttribute("data-id"); btn.disabled = true; btn.textContent = "Working..."; fetch("/api/cats/" + encodeURIComponent(id) + "/vet-visit/cancel", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).then(function(r) { if (r.ok) loadCats(); btn.disabled = false; btn.textContent = "End Vet Visit"; }).catch(function() { btn.disabled = false; btn.textContent = "End Vet Visit"; }); });
        var photoInputs = document.querySelectorAll(".photo-file-input");
        for (var i = 0; i < photoInputs.length; i++) photoInputs[i].addEventListener("change", function() { var input = this; var container = input.closest("[data-photo-id]"); var id = container.getAttribute("data-photo-id"); if (!input.files || !input.files[0]) return; var fd = new FormData(); fd.append("photo", input.files[0]); var label = container.querySelector(".photo-label"); var orig = label.textContent; label.textContent = "Uploading..."; fetch("/api/cats/" + encodeURIComponent(id) + "/photo", { method: "POST", credentials: "same-origin", body: fd }).then(function(r) { label.textContent = orig; if (r.ok) loadCats(); else r.text().then(function(t) { alert(t || "Upload failed"); }); }).catch(function() { label.textContent = orig; }); });
        var removeBtns = document.querySelectorAll(".remove-cat-btn");
        for (var i = 0; i < removeBtns.length; i++) removeBtns[i].addEventListener("click", function() { var btn = this; var id = btn.getAttribute("data-id"); if (!confirm("Remove this cat from MishiPass? This will hide the public profile and dashboard entry.")) return; btn.disabled = true; btn.textContent = "Removing..."; fetch("/api/cats/" + encodeURIComponent(id) + "/remove", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).then(function(r) { if (r.ok) loadCats(); else { r.text().then(function(t) { alert(t || "Could not remove cat"); }); btn.disabled = false; btn.textContent = "Remove"; } }).catch(function() { btn.disabled = false; btn.textContent = "Remove"; }); });
      }

      languageSaveBtn.addEventListener("click", function() {
        languageSaveBtn.disabled = true;
        fetch("/api/settings", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language_code: languageSelect.value }) }).then(function(r) {
          languageSaveBtn.disabled = false;
          if (r.ok) { setLang(languageSelect.value); loadCats(); languageStatus.textContent = tr("languageSaved"); }
          else languageStatus.textContent = "Error";
        }).catch(function() { languageSaveBtn.disabled = false; languageStatus.textContent = "Network error"; });
      });

      breedSelect.addEventListener("change", function() {
        breedInput.value = breedSelect.value;
        var imageUrl = breedImages[breedSelect.value];
        if (imageUrl) { breedPreview.src = imageUrl; breedPreview.style.display = "block"; }
        else { breedPreview.removeAttribute("src"); breedPreview.style.display = "none"; }
      });
      colorSelect.addEventListener("change", function() {
        if (!colorSelect.value) return;
        colorInput.value = colorInput.value ? colorSelect.value + " - " + colorInput.value : colorSelect.value;
      });
      guestLanguageSelect.addEventListener("change", function() { setLang(guestLanguageSelect.value); });
      try { setLang(localStorage.getItem("mp_lang") || "en"); } catch(e) { setLang("en"); }
      renderColorSwatches();

      function loadContactSettings() {
        contactList.innerHTML = "<p>Loading...</p>";
        fetch("/api/cats", { credentials: "same-origin" }).then(function(r) { if (r.status === 401) { showAuth(); return null; } return r.json(); }).then(function(cats) {
          if (!cats) return;
          if (cats.length === 0) { contactList.innerHTML = "<p>No cats registered.</p>"; return; }
          var promises = [];
          for (var i = 0; i < cats.length; i++) (function(cat) { promises.push(fetch("/api/cats/" + encodeURIComponent(cat.publicId) + "/contact", { credentials: "same-origin" }).then(function(r) { return r.json(); }).then(function(d) { return { cat: cat, contact: d }; }).catch(function() { return { cat: cat, contact: { contact_mode: "none", public_phone: "" } }; })); })(cats[i]);
          Promise.all(promises).then(function(results) {
            var out = "";
            for (var k = 0; k < results.length; k++) { var r = results[k]; var d = r.contact;
              out += '<div class="contact-card" data-contact-id="' + escHtml(r.cat.publicId) + '">';
              out += '<h4>' + escHtml(r.cat.name) + '</h4>';
              out += '<select class="contact-mode-select" style="width:100%;padding:0.4rem;margin-bottom:0.5rem;border:1px solid #ccc;border-radius:4px"><option value="none"' + (d.contact_mode === "none" ? " selected" : "") + '>Hidden</option><option value="relay"' + (d.contact_mode === "relay" ? " selected" : "") + '>Relay</option><option value="phone"' + (d.contact_mode === "phone" ? " selected" : "") + '>Public phone</option></select>';
              out += '<input type="text" class="contact-phone" placeholder="Phone" maxlength="30" value="' + escHtml(d.public_phone || "") + '" />';
              out += '<button class="btn-primary contact-save-btn" data-id="' + escHtml(r.cat.publicId) + '">Save</button>';
              out += '<span class="contact-status" style="font-size:0.8rem;margin-left:0.5rem"></span></div>';
            }
            contactList.innerHTML = out;
            var saveBtns = document.querySelectorAll("#contact-list .contact-save-btn");
            for (var i = 0; i < saveBtns.length; i++) saveBtns[i].addEventListener("click", function() { var btn = this; var id = btn.getAttribute("data-id"); var card = btn.closest(".contact-card"); var mode = card.querySelector(".contact-mode-select").value; var phone = card.querySelector(".contact-phone").value; var status = card.querySelector(".contact-status"); btn.disabled = true; btn.textContent = "Saving..."; fetch("/api/cats/" + encodeURIComponent(id) + "/contact", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_mode: mode, public_phone: phone || null }) }).then(function(r) { btn.disabled = false; btn.textContent = "Save"; if (r.ok) { status.textContent = "Saved"; status.style.color = "#060"; } else { status.textContent = "Error"; status.style.color = "#c00"; } }).catch(function() { btn.disabled = false; btn.textContent = "Save"; status.textContent = "Network error"; status.style.color = "#c00"; }); });
          });
        }).catch(function() { contactList.innerHTML = "<p>Error loading.</p>"; });
      }

      loginForm.addEventListener("submit", function(e) { e.preventDefault(); hideMsg(loginError); var email = document.getElementById("login-email").value; var password = document.getElementById("login-password").value; var btn = loginForm.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Working..."; fetch("/api/auth/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email, password: password }) }).then(function(r) { btn.disabled = false; btn.textContent = "Login"; if (r.ok) showDash(); else r.text().then(function(t) { try { var d = JSON.parse(t); showMsg(loginError, d.error || "Login failed"); } catch(e) { showMsg(loginError, t || "Login failed"); } }); }).catch(function() { btn.disabled = false; btn.textContent = "Login"; showMsg(loginError, "Network error."); }); });
      registerForm.addEventListener("submit", function(e) { e.preventDefault(); hideMsg(registerError); hideMsg(registerSuccess); var email = document.getElementById("register-email").value; var password = document.getElementById("register-password").value; var btn = registerForm.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Working..."; fetch("/api/auth/register", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email, password: password }) }).then(function(r) { btn.disabled = false; btn.textContent = "Register"; if (r.ok) showMsg(registerSuccess, "Registered. You can now log in."); else r.text().then(function(t) { try { var d = JSON.parse(t); showMsg(registerError, d.error || "Registration failed"); } catch(e) { showMsg(registerError, t || "Registration failed"); } }); }).catch(function() { btn.disabled = false; btn.textContent = "Register"; showMsg(registerError, "Network error."); }); });
      createCatForm.addEventListener("submit", function(e) { e.preventDefault(); hideMsg(createError); var name = document.getElementById("cat-name").value; var countryCode = document.getElementById("cat-country").value; var sex = document.getElementById("cat-sex").value; var colorMarkings = document.getElementById("cat-color").value; var breedMix = document.getElementById("cat-breed").value; var btn = createCatForm.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Working..."; var payload = { name: name, countryCode: countryCode }; if (sex) payload.sex = sex; if (colorMarkings) payload.colorMarkings = colorMarkings; if (breedMix) payload.breedMix = breedMix; fetch("/api/cats", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(function(r) { btn.disabled = false; btn.textContent = "Register Cat"; if (r.ok) { createCatForm.reset(); loadCats(); } else r.text().then(function(t) { showMsg(createError, t || "Could not register cat"); }); }).catch(function() { btn.disabled = false; btn.textContent = "Register Cat"; showMsg(createError, "Network error."); }); });
      logoutBtn.addEventListener("click", function() { fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).then(function() { showAuth(); }).catch(function() { showAuth(); }); });
      fetch("/api/cats", { credentials: "same-origin" }).then(function(r) { if (r.status === 401) showAuth(); else r.json().then(function() { showDash(); }); }).catch(function() { showAuth(); });
    })();
  </script>
</body>
</html>`;
}

const DASHBOARD_HTML = buildDashboardHtml();

export function handleDashboard(): Response {
  return htmlResponse(DASHBOARD_HTML);
}
