import { resolveSession } from "./middleware/session.js";
import { handleLogin, handleLogout, handleRegister } from "./routes/auth.js";
import { handleCreateCat, handleListCats, handlePublicProfile } from "./routes/cats.js";
import { handleGetContactSettings, handleUpsertContactSettings } from "./routes/contactSettings.js";
import { handleSwitchToActive, handleSwitchToMissing } from "./routes/missingAlerts.js";
import { handleSightingForm, handleSightingSubmit, handleListSightingsForOwner } from "./routes/sightingReports.js";

export interface Env {
  DB: D1Database;
  /** Set via wrangler secret / .dev.vars. Example: https://mishipass.com */
  PUBLIC_BASE_URL: string;
}

const PUBLIC_PROFILE_PATH = /^\/c\/([^/]+)$/;
const SIGHTING_PATH = /^\/c\/([^/]+)\/sighting$/;
const SIGHTINGS_API_PATH = /^\/api\/cats\/([^/]+)\/sightings$/;
const CAT_MISSING_PATH = /^\/api\/cats\/([^/]+)\/missing$/;
const CAT_ACTIVE_PATH = /^\/api\/cats\/([^/]+)\/active$/;
const CONTACT_SETTINGS_PATH = /^\/api\/cats\/([^/]+)\/contact$/;

const ROOT_LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MishiPass</title>
  <meta name="description" content="Privacy-first dynamic QR passport and recovery system for cats." />
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:4rem auto;padding:0 1rem;color:#111;line-height:1.6}
    h1{font-size:2.25rem;margin-bottom:0.25rem}
    .tagline{color:#555;margin-bottom:1.5rem;font-size:1.1rem}
    .desc{margin-bottom:1.5rem}
    .cta{display:inline-block;padding:0.75rem 1.5rem;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:1rem;margin-bottom:1rem}
  </style>
</head>
<body>
  <h1>MishiPass</h1>
  <p class="tagline">Privacy-first dynamic QR passport and recovery system for cats.</p>
  <p class="desc">One permanent QR per cat. The owner controls what a scan shows: Active Profile, Missing Alert, or Vet Visit. The QR never changes.</p>
  <a class="cta" href="/dashboard">Owner Dashboard</a>
</body>
</html>`;

const DASHBOARD_HTML = `<!DOCTYPE html>
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
    input[type="text"],input[type="email"],input[type="password"]{width:100%;padding:0.5rem;border:1px solid #ccc;border-radius:4px;margin-bottom:0.75rem;font-size:1rem}
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
    .status{padding:0.5rem;border-radius:4px;margin-bottom:0.75rem;font-size:0.875rem}
    button:disabled{opacity:0.6;cursor:not-allowed}
    .upcoming{color:#888;font-size:0.875rem;margin-top:1rem}
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
      <h2>Your Cats</h2>
      <button id="logout-btn" class="btn-secondary">Logout</button>
    </div>
    <div id="cat-list"></div>
    <hr />
    <h2>Register a Cat</h2>
    <div id="create-error" class="error hidden"></div>
    <form id="create-cat-form">
      <label for="cat-name">Name</label>
      <input type="text" id="cat-name" name="name" required />
      <label for="cat-country">Country Code (e.g. MX, US, ES)</label>
      <input type="text" id="cat-country" name="countryCode" maxlength="2" required />
      <button type="submit" class="btn-primary">Register Cat</button>
    </form>
    <hr />
    <p class="upcoming">Coming next: Sighting Reports, Vet Visit Mode, Digital Cartilla</p>
  </div>

  <script>
    // -- Temporary functional dashboard UI --
    (function() {
      var authSection = document.getElementById("auth-section");
      var dashSection = document.getElementById("dashboard-section");
      var loginForm = document.getElementById("login-form");
      var registerForm = document.getElementById("register-form");
      var createCatForm = document.getElementById("create-cat-form");
      var logoutBtn = document.getElementById("logout-btn");
      var catList = document.getElementById("cat-list");
      var loginError = document.getElementById("login-error");
      var registerError = document.getElementById("register-error");
      var registerSuccess = document.getElementById("register-success");
      var createError = document.getElementById("create-error");

      function showAuth() {
        authSection.classList.remove("hidden");
        dashSection.classList.add("hidden");
      }

      function showDash() {
        authSection.classList.add("hidden");
        dashSection.classList.remove("hidden");
        loadCats();
      }

      function hideMsg(el) { el.classList.add("hidden"); el.textContent = ""; }
      function showMsg(el, msg) { el.textContent = msg; el.classList.remove("hidden"); }

      function escHtml(s) {
        var d = document.createElement("div");
        d.appendChild(document.createTextNode(s));
        return d.innerHTML;
      }

      function loadCats() {
        fetch("/api/cats", { credentials: "same-origin" })
          .then(function(r) {
            if (r.status === 401) { showAuth(); return null; }
            return r.json();
          })
          .then(function(cats) {
            if (!cats) return;
            if (cats.length === 0) {
              catList.innerHTML = "<p>No cats registered yet.</p>";
              return;
            }
            var html = "";
            for (var i = 0; i < cats.length; i++) {
              var c = cats[i];
              html += '<div class="cat-card">';
              html += "<h3>" + escHtml(c.name) + "</h3>";
              html += '<p class="cat-meta">ID: ' + escHtml(c.publicId) + " | Mode: " + escHtml(c.currentMode) + "</p>";
              html += '<p><a href="/c/' + encodeURIComponent(c.publicId) + '">View public profile</a></p>';
              html += '<div class="cat-actions">';
              html += '<button class="btn-secondary contact-toggle-btn" data-id="' + escHtml(c.publicId) + '">Contact &amp; Privacy</button>';
              html += '<div class="mode-fields hidden" id="contact-panel-' + escHtml(c.publicId) + '">';
              html += '<label>Contact mode</label>';
              html += '<select class="contact-mode-select" style="width:100%;padding:0.4rem;margin-bottom:0.5rem;border:1px solid #ccc;border-radius:4px">';
              html += '<option value="none">Hidden</option>';
              html += '<option value="relay">Relay (contact form)</option>';
              html += '<option value="phone">Public phone</option>';
              html += '</select>';
              html += '<input type="text" class="contact-phone" placeholder="Phone (if phone mode)" maxlength="30" />';
              html += '<button class="btn-primary contact-save-btn" data-id="' + escHtml(c.publicId) + '">Save contact settings</button>';
              html += '<span class="contact-status" style="font-size:0.8rem;margin-left:0.5rem"></span>';
              html += '</div>';
              html += '</div>';
              html += '<div class="cat-actions">';
              if (c.currentMode === "missing") {
                html += '<button class="btn-primary switch-active-btn" data-id="' + escHtml(c.publicId) + '">Switch to Active</button>';
                html += '<p class="cat-meta"><a href="/api/cats/' + encodeURIComponent(c.publicId) + '/sightings" target="_blank">View sighting reports</a></p>';
              } else {
                html += '<button class="btn-warn switch-missing-btn" data-id="' + escHtml(c.publicId) + '">Switch to Missing</button>';
                html += '<div class="mode-fields hidden" id="missing-fields-' + escHtml(c.publicId) + '">';
                html += '<input type="text" placeholder="City" class="missing-city" />';
                html += '<input type="text" placeholder="Area / neighborhood" class="missing-area" />';
                html += '<input type="text" placeholder="Reward (optional)" class="missing-reward" />';
                html += '<button class="btn-danger confirm-missing-btn" data-id="' + escHtml(c.publicId) + '">Confirm Missing</button>';
                html += "</div>";
              }
              html += "</div></div>";
            }
            catList.innerHTML = html;
            attachCatActions();
          })
          .catch(function() { showMsg(createError, "Network error. Try again."); });
      }

      function attachCatActions() {
        var missingBtns = document.querySelectorAll(".switch-missing-btn");
        for (var i = 0; i < missingBtns.length; i++) {
          missingBtns[i].addEventListener("click", function() {
            var id = this.getAttribute("data-id");
            var fields = document.getElementById("missing-fields-" + id);
            if (fields) fields.classList.toggle("hidden");
          });
        }

        var confirmBtns = document.querySelectorAll(".confirm-missing-btn");
        for (var i = 0; i < confirmBtns.length; i++) {
          confirmBtns[i].addEventListener("click", function() {
            var btn = this;
            var id = btn.getAttribute("data-id");
            var fields = document.getElementById("missing-fields-" + id);
            var city = fields.querySelector(".missing-city").value;
            var area = fields.querySelector(".missing-area").value;
            var reward = fields.querySelector(".missing-reward").value;
            btn.disabled = true;
            btn.textContent = "Working...";
            fetch("/api/cats/" + encodeURIComponent(id) + "/missing", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ city: city || null, area: area || null, rewardAmount: reward || null, rewardVisible: reward ? 1 : 0 })
            }).then(function(r) {
              if (r.ok) loadCats();
              btn.disabled = false;
              btn.textContent = "Confirm Missing";
            }).catch(function() { btn.disabled = false; btn.textContent = "Confirm Missing"; showMsg(createError, "Network error. Try again."); });
          });
        }

        var activeBtns = document.querySelectorAll(".switch-active-btn");
        for (var i = 0; i < activeBtns.length; i++) {
          activeBtns[i].addEventListener("click", function() {
            var btn = this;
            var id = btn.getAttribute("data-id");
            btn.disabled = true;
            btn.textContent = "Working...";
            fetch("/api/cats/" + encodeURIComponent(id) + "/active", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({})
            }).then(function(r) {
              if (r.ok) loadCats();
              btn.disabled = false;
              btn.textContent = "Switch to Active";
            }).catch(function() { btn.disabled = false; btn.textContent = "Switch to Active"; showMsg(createError, "Network error. Try again."); });
          });
        }

        var contactToggles = document.querySelectorAll(".contact-toggle-btn");
        for (var i = 0; i < contactToggles.length; i++) {
          contactToggles[i].addEventListener("click", function() {
            var id = this.getAttribute("data-id");
            var panel = document.getElementById("contact-panel-" + id);
            if (panel.classList.contains("hidden")) {
              panel.classList.remove("hidden");
              fetch("/api/cats/" + encodeURIComponent(id) + "/contact", { credentials: "same-origin" })
                .then(function(r) { return r.json(); })
                .then(function(d) {
                  var sel = panel.querySelector(".contact-mode-select");
                  var phone = panel.querySelector(".contact-phone");
                  if (sel) sel.value = d.contact_mode || "none";
                  if (phone) phone.value = d.public_phone || "";
                })
                .catch(function() {});
            } else {
              panel.classList.add("hidden");
            }
          });
        }

        var contactSaveBtns = document.querySelectorAll(".contact-save-btn");
        for (var i = 0; i < contactSaveBtns.length; i++) {
          contactSaveBtns[i].addEventListener("click", function() {
            var btn = this;
            var id = btn.getAttribute("data-id");
            var panel = document.getElementById("contact-panel-" + id);
            var mode = panel.querySelector(".contact-mode-select").value;
            var phone = panel.querySelector(".contact-phone").value;
            var status = panel.querySelector(".contact-status");
            btn.disabled = true;
            btn.textContent = "Saving...";
            fetch("/api/cats/" + encodeURIComponent(id) + "/contact", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contact_mode: mode, public_phone: phone || null })
            }).then(function(r) {
              btn.disabled = false;
              btn.textContent = "Save contact settings";
              if (r.ok) { status.textContent = "Saved"; status.style.color = "#060"; }
              else { status.textContent = "Error saving"; status.style.color = "#c00"; }
            }).catch(function() { btn.disabled = false; btn.textContent = "Save contact settings"; status.textContent = "Network error"; status.style.color = "#c00"; });
          });
        }
      }

      loginForm.addEventListener("submit", function(e) {
        e.preventDefault();
        hideMsg(loginError);
        var email = document.getElementById("login-email").value;
        var password = document.getElementById("login-password").value;
        var btn = loginForm.querySelector("button[type=submit]");
        btn.disabled = true;
        btn.textContent = "Working...";
        fetch("/api/auth/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, password: password })
        }).then(function(r) {
          btn.disabled = false;
          btn.textContent = "Login";
          if (r.ok) { showDash(); }
          else { return r.text().then(function(t) { try { var d = JSON.parse(t); showMsg(loginError, d.error || "Login failed"); } catch(e) { showMsg(loginError, "Error " + r.status + ": " + (t || "Login failed")); } }); }
        }).catch(function() { btn.disabled = false; btn.textContent = "Login"; showMsg(loginError, "Network error. Try again."); });
      });

      registerForm.addEventListener("submit", function(e) {
        e.preventDefault();
        hideMsg(registerError);
        hideMsg(registerSuccess);
        var email = document.getElementById("register-email").value;
        var password = document.getElementById("register-password").value;
        var btn = registerForm.querySelector("button[type=submit]");
        btn.disabled = true;
        btn.textContent = "Working...";
        fetch("/api/auth/register", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, password: password })
        }).then(function(r) {
          btn.disabled = false;
          btn.textContent = "Register";
          if (r.ok) { showMsg(registerSuccess, "Registered. You can now log in."); }
          else { return r.text().then(function(t) { try { var d = JSON.parse(t); showMsg(registerError, d.error || "Registration failed"); } catch(e) { showMsg(registerError, "Error " + r.status + ": " + (t || "Registration failed")); } }); }
        }).catch(function() { btn.disabled = false; btn.textContent = "Register"; showMsg(registerError, "Network error. Try again."); });
      });

      createCatForm.addEventListener("submit", function(e) {
        e.preventDefault();
        hideMsg(createError);
        var name = document.getElementById("cat-name").value;
        var countryCode = document.getElementById("cat-country").value.toUpperCase();
        var btn = createCatForm.querySelector("button[type=submit]");
        btn.disabled = true;
        btn.textContent = "Working...";
        fetch("/api/cats", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name, countryCode: countryCode })
        }).then(function(r) {
          btn.disabled = false;
          btn.textContent = "Register Cat";
          if (r.ok) { createCatForm.reset(); loadCats(); }
          else { return r.text().then(function(t) { showMsg(createError, t || "Could not register cat"); }); }
        }).catch(function() { btn.disabled = false; btn.textContent = "Register Cat"; showMsg(createError, "Network error. Try again."); });
      });

      logoutBtn.addEventListener("click", function() {
        fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin"
        }).then(function() { showAuth(); }).catch(function() { showAuth(); });
      });

      // Initial load: check auth state
      fetch("/api/cats", { credentials: "same-origin" })
        .then(function(r) {
          if (r.status === 401) showAuth();
          else { r.json().then(function() { showDash(); }); }
        })
        .catch(function() { showAuth(); });
    })();
  </script>
</body>
</html>`;

function handleRootLanding(method: string): Response {
  const headers = {
    "Content-Type": "text/html;charset=UTF-8",
    "X-Content-Type-Options": "nosniff",
  };
  if (method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  return new Response(ROOT_LANDING_HTML, { status: 200, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { method, url } = request;
    const { pathname } = new URL(url);

    if ((method === "GET" || method === "HEAD") && pathname === "/") {
      return handleRootLanding(method);
    }

    if (method === "GET" && pathname === "/dashboard") {
      return new Response(DASHBOARD_HTML, {
        status: 200,
        headers: { "Content-Type": "text/html;charset=UTF-8", "X-Content-Type-Options": "nosniff" },
      });
    }

    if (method === "POST" && pathname === "/api/auth/register") {
      return handleRegister(request, env.DB);
    }
    if (method === "POST" && pathname === "/api/auth/login") {
      return handleLogin(request, env.DB);
    }
    if (method === "POST" && pathname === "/api/auth/logout") {
      return handleLogout(request, env.DB);
    }

    const missingMatch = CAT_MISSING_PATH.exec(pathname);
    if (method === "POST" && missingMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleSwitchToMissing(request, missingMatch[1]!, env.DB, env.PUBLIC_BASE_URL, ctx);
    }

    const activeMatch = CAT_ACTIVE_PATH.exec(pathname);
    if (method === "POST" && activeMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleSwitchToActive(request, activeMatch[1]!, env.DB, ctx);
    }

    const contactMatch = CONTACT_SETTINGS_PATH.exec(pathname);
    if (contactMatch) {
      const ctx = await resolveSession(request, env.DB);
      if (method === "GET") {
        return handleGetContactSettings(contactMatch[1]!, env.DB, ctx);
      }
      if (method === "POST") {
        return handleUpsertContactSettings(contactMatch[1]!, request, env.DB, ctx);
      }
    }

    if (method === "GET" && pathname === "/api/cats") {
      const ctx = await resolveSession(request, env.DB);
      return handleListCats(env.DB, env.PUBLIC_BASE_URL, ctx);
    }

    if (method === "POST" && pathname === "/api/cats") {
      const ctx = await resolveSession(request, env.DB);
      return handleCreateCat(request, env.DB, env.PUBLIC_BASE_URL, ctx);
    }

    const sightingMatch = SIGHTING_PATH.exec(pathname);
    if (sightingMatch) {
      const id = sightingMatch[1]!;
      if (method === "GET") {
        return handleSightingForm(id, env.DB);
      }
      if (method === "POST") {
        return handleSightingSubmit(id, request, env.DB);
      }
    }

    const sightingsApiMatch = SIGHTINGS_API_PATH.exec(pathname);
    if (method === "GET" && sightingsApiMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleListSightingsForOwner(sightingsApiMatch[1]!, env.DB, ctx);
    }

    const profileMatch = PUBLIC_PROFILE_PATH.exec(pathname);
    if (method === "GET" && profileMatch) {
      return handlePublicProfile(profileMatch[1]!, env.DB);
    }

    return new Response("Not Found", { status: 404 });
  },
};
