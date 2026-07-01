import { COUNTRIES } from "../data/countries.js";
import { htmlResponse } from "../utils/html.js";

function buildCountryOptions(): string {
  return COUNTRIES.map(
    c => `<option value="${c.code}">${c.name} (${c.code})</option>`
  ).join("\n          ");
}

function buildDashboardHtml(): string {
  const countryOptions = buildCountryOptions();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MishiPass - Owner Dashboard</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
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
    .cat-card{border:1px solid #ddd;border-radius:6px;padding:1rem;margin-bottom:1rem}
    .cat-card h3{margin:0 0 0.5rem 0;font-size:1rem}
    .cat-meta{font-size:0.875rem;color:#555;margin-bottom:0.5rem}
    .cat-actions{margin-top:0.5rem}
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
  </style>
</head>
<body>
  <h1>MishiPass</h1>
  <div class="nav"><a href="/">&larr; Home</a></div>

  <div id="auth-section">
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
          <input type="text" id="cat-color" name="colorMarkings" maxlength="200" />
          <label for="cat-breed">Breed / Mix</label>
          <input type="text" id="cat-breed" name="breedMix" maxlength="100" />
          <button type="submit" class="btn-primary">Register Cat</button>
        </form>
      </details>
    </div>

    <div id="contact-tab" class="tab-panel">
      <div id="contact-list"><p>Loading contact settings...</p></div>
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
        });
      }

      function showAuth() { authSection.classList.remove("hidden"); dashSection.classList.add("hidden"); }
      function showDash() { authSection.classList.add("hidden"); dashSection.classList.remove("hidden"); loadCats(); }
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
          var html = "";
          for (var i = 0; i < cats.length; i++) {
            var c = cats[i];
            html += '<div class="cat-card">';
            html += '<h3><a href="/dashboard/cats/' + encodeURIComponent(c.publicId) + '">' + escHtml(c.name) + '</a></h3>';
            html += '<p class="cat-meta">Mode: ' + escHtml(c.currentMode) + '</p>';
            html += '<div class="cat-actions">';
            html += '<a href="/dashboard/cats/' + encodeURIComponent(c.publicId) + '" class="btn-secondary" style="text-decoration:none;display:inline-block;padding:0.4rem 0.8rem">Details</a> ';
            html += '<a href="/dashboard/cats/' + encodeURIComponent(c.publicId) + '/qr" class="btn-secondary" style="text-decoration:none;display:inline-block;padding:0.4rem 0.8rem">QR Card</a> ';
            if (c.currentMode === "missing") {
              html += '<a href="/dashboard/cats/' + encodeURIComponent(c.publicId) + '/sightings" class="btn-secondary" style="text-decoration:none;display:inline-block;padding:0.4rem 0.8rem">Sightings</a>';
            }
            html += '</div>';
            html += '<div class="cat-actions" data-photo-id="' + escHtml(c.publicId) + '" style="margin-top:0.5rem">';
            html += '<input type="file" accept="image/jpeg,image/png,image/webp" class="photo-file-input" id="photo-input-' + escHtml(c.publicId) + '" />';
            html += '<label for="photo-input-' + escHtml(c.publicId) + '" class="photo-label">Upload Photo</label>';
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
              html += '<button class="btn-danger confirm-missing-btn" data-id="' + escHtml(c.publicId) + '">Confirm Missing</button>';
              html += '</div>';
            }
            html += '</div>';
            html += '<div class="cat-actions" style="margin-top:0.75rem"><button class="btn-danger remove-cat-btn" data-id="' + escHtml(c.publicId) + '">Remove</button></div>';
            html += '</div>';
          }
          catList.innerHTML = html;
          attachCatActions();
        }).catch(function() { showMsg(createError, "Network error. Try again."); });
      }

      function attachCatActions() {
        var missingBtns = document.querySelectorAll(".switch-missing-btn");
        for (var i = 0; i < missingBtns.length; i++) missingBtns[i].addEventListener("click", function() { var id = this.getAttribute("data-id"); var f = document.getElementById("missing-fields-" + id); if (f) f.classList.toggle("hidden"); });
        var confirmBtns = document.querySelectorAll(".confirm-missing-btn");
        for (var i = 0; i < confirmBtns.length; i++) confirmBtns[i].addEventListener("click", function() { var btn = this; var id = btn.getAttribute("data-id"); var f = document.getElementById("missing-fields-" + id); var city = f.querySelector(".missing-city").value; var area = f.querySelector(".missing-area").value; var reward = f.querySelector(".missing-reward").value; btn.disabled = true; btn.textContent = "Working..."; fetch("/api/cats/" + encodeURIComponent(id) + "/missing", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city: city || null, area: area || null, rewardAmount: reward || null, rewardVisible: reward ? 1 : 0 }) }).then(function(r) { if (r.ok) loadCats(); btn.disabled = false; btn.textContent = "Confirm Missing"; }).catch(function() { btn.disabled = false; btn.textContent = "Confirm Missing"; }); });
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
