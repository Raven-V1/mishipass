import { iconApple, iconDocument, iconEmail, iconGoogle, iconLock, iconMegaphone, iconQrCode, iconStethoscope } from "../utils/icons.js";
import { MISHIPASS_DESIGN_CSS, brandLockupHtml, brandLogoHtml, htmlResponse } from "../utils/html.js";
import { getLanguageFromRequest, LANGUAGE_SCRIPT, languageSelectHtml, t } from "../utils/i18n.js";
import type { LogtoEnv } from "../routes/logto.js";

function featureIcon(kind: string, size = 24): string {
  const icons: Record<string, string> = {
    lock: iconLock(size),
    record: iconDocument(size),
    qr: iconQrCode(size),
    alert: iconMegaphone(size),
    vet: iconStethoscope(size),
  };
  return icons[kind] || iconQrCode(size);
}

function featureColumn(title: string, copy: string, kind: string): string {
  return `<article class="feature-col"><div class="feature-bubble" aria-hidden="true">${featureIcon(kind, 24)}</div><h3>${title}</h3><p>${copy}</p></article>`;
}

function socialButtonsHtml(env: LogtoEnv): string {
  const baseConfigured = !!(env.LOGTO_ENDPOINT && env.LOGTO_APP_ID && env.LOGTO_CLIENT_SECRET && env.LOGTO_REDIRECT_URI);
  const google = baseConfigured
    ? `<a class="social-btn" href="/api/auth/logto/google">${iconGoogle(24)}<span>Continue with Google</span></a>`
    : `<button class="social-btn provider-pending" type="button" disabled aria-disabled="true" title="Google login config pending">${iconGoogle(24)}<span>Continue with Google</span></button>`;
  const apple = baseConfigured && !!env.LOGTO_APPLE_CONNECTOR_TARGET
    ? `<a class="social-btn" href="/api/auth/logto/apple">${iconApple(24)}<span>Continue with Apple</span></a>`
    : `<button class="social-btn provider-pending" type="button" disabled aria-disabled="true" title="Apple login config pending">${iconApple(24)}<span>Continue with Apple</span></button>`;
  return `${google}${apple}`;
}

function mobileWordmark(): string {
  return `<span class="mobile-word"><span>M</span><span>I</span><span>S</span><span>H</span><span>I</span><span>P</span><span>A</span><span>S</span><span>S</span></span>`;
}

function buildRootHtml(request: Request, env: LogtoEnv = {}): string {
  const lang = getLanguageFromRequest(request);
  const socialButtons = socialButtonsHtml(env);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MishiPass - Digital passport for your cat</title>
  <meta name="description" content="${t(lang, "tagline")}" />
  <style>
    ${MISHIPASS_DESIGN_CSS}
    body{background:transparent}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
    .home-page{min-height:100vh}
    .home-header{height:96px;display:flex;align-items:center;border-bottom:1px solid rgba(234,216,208,.72);background:rgba(255,248,243,.82);backdrop-filter:blur(8px)}
    .home-header .mp-container{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4)}
    .home-nav{display:flex;align-items:center;gap:var(--space-5)}
    .home-nav a{font-weight:900;color:var(--ink);text-decoration:none;font-size:.9375rem}
    .signup-pill{min-width:96px;border-radius:999px;background:#fff0e9;color:var(--brand-coral);border-color:#fff0e9}
    .desktop-home{display:block;min-height:calc(100vh - 96px);padding:var(--space-6) 0 var(--space-3)}
    .home-hero{display:grid;grid-template-columns:312px minmax(0,1fr);gap:var(--space-10);align-items:start}
    .welcome-panel{text-align:center;padding-top:var(--space-2)}
    .welcome-panel h1{font-size:2rem;line-height:1.1;margin:0 0 var(--space-2);color:var(--teal);letter-spacing:0}
    .welcome-panel .coral-copy{font-size:1.125rem;line-height:1.28;color:var(--brand-coral);font-weight:900;margin:0 auto var(--space-3);max-width:248px}
    .paw-divider{display:flex;align-items:center;gap:var(--space-2);justify-content:center;margin:var(--space-2) auto var(--space-4);color:var(--brand-coral)}
    .paw-divider:before,.paw-divider:after{content:"";width:64px;height:1px;background:var(--line)}
    .paw-divider .paw-icon{width:24px;height:24px}
    .peek-cat{display:flex;justify-content:center;margin:0 auto var(--space-4)}
    .peek-cat .brand-logo-large{width:272px}
    .welcome-panel .small-copy{font-weight:700;color:var(--teal);font-size:.9375rem;line-height:1.48;max-width:296px;margin:0 auto}
    .features-panel{padding-top:var(--space-3)}
    .features-panel h2{text-align:center;font-size:1.5rem;line-height:1.28;color:var(--teal);margin:0 auto var(--space-4);max-width:360px}
    .feature-row{display:grid;grid-template-columns:repeat(6,minmax(96px,1fr));gap:var(--space-3);align-items:start}
    .feature-col{text-align:center;min-width:0}
    .feature-bubble{width:64px;height:64px;border-radius:50%;margin:0 auto var(--space-2);display:flex;align-items:center;justify-content:center;background:#fff0e9;color:var(--teal);box-shadow:0 8px 24px rgba(56,38,26,.06)}
    .feature-col h3{font-size:.8125rem;line-height:1.24;color:var(--ink);margin:0 0 var(--space-1);font-weight:900}
    .feature-col p{font-size:.75rem;line-height:1.48;color:var(--teal);font-weight:700;margin:0}
    .login-card-wrap{max-width:736px;margin:var(--space-8) auto var(--space-4)}
    .desktop-login{display:grid;grid-template-columns:192px minmax(240px,1fr) 240px;gap:var(--space-3);align-items:center;padding:var(--space-3);border-radius:8px;background:rgba(255,253,249,.96);border:1px solid rgba(234,216,208,.8);box-shadow:0 16px 48px rgba(56,38,26,.10)}
    .login-copy h2{font-size:1.375rem;line-height:1.2;margin:0 0 var(--space-1);color:var(--teal)}
    .login-copy .brand-inline{display:block;font-size:1.5rem;font-weight:900;color:var(--brand-coral)}
    .login-copy .brand-inline span{color:var(--brand-mint)}
    .login-copy p{font-size:.8125rem;line-height:1.48;color:var(--teal);font-weight:700;margin:var(--space-2) 0 0}
    .login-form{padding:0 var(--space-3);border-left:1px solid var(--line);border-right:1px solid var(--line)}
    .form-row{margin-bottom:var(--space-2)}
    .form-row label{font-size:.75rem;color:var(--ink)}
    .form-row input{border-radius:8px;background:#fff;border-color:#f0d9d2;min-height:48px}
    .auth-note{margin:var(--space-1) 0 var(--space-2);font-size:.75rem;color:var(--muted);font-weight:800}
    .login-form .mp-btn{width:100%;border-radius:8px;background:var(--brand-orange);border-color:var(--brand-orange)}
    .social-panel{display:grid;gap:var(--space-2)}
    .divider{display:flex;align-items:center;gap:var(--space-2);font-size:.75rem;font-weight:900;color:var(--ink);text-align:center}
    .divider:before,.divider:after{content:"";height:1px;background:var(--line);flex:1}
    .social-btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);min-height:48px;padding:var(--space-1) var(--space-2);border-radius:8px;background:#fff7f0;color:var(--brand-coral);border:1px solid #f4ded7;font:inherit;text-decoration:none;font-weight:900;font-size:.8125rem}
    .provider-pending{opacity:.62;cursor:not-allowed}
    .signup-note{font-size:.75rem;text-align:center;margin:0;color:var(--ink);font-weight:700}
    .privacy-line{display:flex;align-items:center;justify-content:center;gap:var(--space-2);margin-top:var(--space-4);font-size:.875rem;font-weight:800;color:var(--teal)}
    .privacy-line .paw-icon{width:20px;height:20px}
    .mobile-auth{display:none}
    .lower-sections{padding:0 0 var(--space-6)}
    .lower-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-3)}
    .lower-card{padding:var(--space-3)}
    .lower-card h2,.lower-card h3{color:var(--teal)}
    .site-footer{padding:var(--space-3);text-align:center;color:var(--ink);font-size:.875rem}
    @media(max-width:1120px){.home-hero{grid-template-columns:280px minmax(0,1fr);gap:var(--space-5)}.feature-row{grid-template-columns:repeat(3,minmax(112px,1fr))}.login-card-wrap{max-width:864px}.desktop-login{grid-template-columns:1fr 1.5fr 1fr}}
    @media(max-width:760px){
      body{overflow-x:hidden}
      .home-header,.desktop-home,.lower-sections,.desktop-footer{display:none}
      .mobile-auth{display:block;min-height:100vh;padding:var(--space-2);background:transparent}
      .phone-shell{position:relative;min-height:calc(100vh - 32px);max-width:390px;margin:0 auto;padding:var(--space-6) var(--space-4) var(--space-4);border:0;border-radius:0;background:transparent;box-shadow:none;overflow:hidden}
      .phone-shell:before{display:none}
      .mobile-cat{display:flex;justify-content:center;margin:var(--space-5) auto var(--space-3)}
      .mobile-cat .brand-logo-large{width:192px}
      .welcome-to{display:block;text-align:center;font-size:2rem;line-height:1.1;font-weight:900;letter-spacing:.16em;color:var(--teal);margin:0 0 var(--space-1)}
      .mobile-word{display:flex;justify-content:center;gap:var(--space-1);font-size:1.75rem;line-height:1;font-weight:900;letter-spacing:.08em;margin-bottom:var(--space-5)}
      .mobile-word span:nth-child(-n+5){color:var(--brand-coral)}.mobile-word span:nth-child(n+6){color:var(--brand-mint)}
      .mobile-tagline{text-align:center;color:var(--teal);font-weight:900;letter-spacing:.16em;font-size:1rem;line-height:1.4;margin:0 auto var(--space-5);max-width:312px}
      .create-title{text-align:center;font-size:1rem;letter-spacing:.24em;color:var(--teal);font-weight:900;margin:0 0 var(--space-3)}
      .mobile-actions{display:grid;gap:var(--space-2);margin-bottom:var(--space-3)}
      .mobile-actions .social-btn,.email-pill{min-height:56px;border-radius:999px;background:#fff0e9;border:0;color:var(--brand-coral);font-size:1rem;font-weight:900;letter-spacing:.04em}
      .email-pill{display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);text-decoration:none}
      .mobile-divider{text-align:center;color:var(--teal);font-weight:900;letter-spacing:.16em;margin:var(--space-3) 0}
      .mobile-login{text-align:center;color:var(--teal);font-weight:900;letter-spacing:.16em;line-height:1.6;margin:0}
      .mobile-login a{display:block;color:var(--teal);text-decoration:none}
      .mobile-footer{position:absolute;left:0;right:0;bottom:var(--space-3);text-align:center;font-size:.75rem;color:#222}
    }
    @media(max-width:430px){.mobile-auth{padding:var(--space-1)}.phone-shell{min-height:calc(100vh - 16px);border-radius:40px;padding:var(--space-6) var(--space-3) var(--space-4)}.mobile-cat{margin:var(--space-6) auto var(--space-4)}.mobile-cat .brand-logo-large{width:216px}.welcome-to{font-size:1.75rem}.mobile-word{font-size:1.5rem;margin-bottom:var(--space-6)}.mobile-tagline{margin-bottom:var(--space-6);font-size:.875rem}.mobile-actions .social-btn,.email-pill{min-height:56px}.mobile-footer{font-size:.6875rem}}
  </style>
</head>
<body>
  <div class="home-page">
    <header class="home-header">
      <div class="mp-container">
        ${brandLockupHtml(`/?lang=${lang}`)}
        <nav class="home-nav" aria-label="Primary">
          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#contact">Contact</a>
          <a class="mp-btn signup-pill" href="/dashboard/register?lang=${lang}">Sign up</a>
        </nav>
      </div>
    </header>

    <main>
      <section class="desktop-home" aria-label="MishiPass homepage">
        <div class="mp-container home-hero">
          <aside class="welcome-panel">
            <h1>Welcome back!</h1>
            <p class="coral-copy">Sign in to continue managing your cat's passport</p>
            <div class="paw-divider"><span class="paw-icon" aria-hidden="true"></span></div>
            <div class="peek-cat">${brandLogoHtml("brand-logo-large")}<span class="sr-only">${t(lang, "rootHeroAlt")}</span></div>
            <p class="small-copy">MishiPass helps you keep vaccines, vet visits, and important cat information safe and accessible.</p>
          </aside>

          <section class="features-panel" id="features">
            <h2>Everything your cat needs, all in one place</h2>
            <div class="feature-row">
              ${featureColumn("Secure & Private", "Your cat's data stays encrypted and owner-controlled.", "lock")}
              ${featureColumn("Digital Cartilla", "Vaccines, vet visits, and documentation-only records in one place.", "record")}
              ${featureColumn("QR Passport", "One QR opens the right profile when help is needed.", "qr")}
              ${featureColumn("Missing Alerts", "Switch to missing mode and share a public alert fast.", "alert")}
              ${featureColumn("Vet Visit Mode", "Temporary visit access keeps the exam flow simple.", "vet")}
              ${featureColumn("Recovery Board", "Track sightings and follow the return-to-home flow.", "alert")}
            </div>
          </section>
        </div>

        <div class="mp-container" id="sign-up">
          <section class="desktop-login" aria-label="MishiPass login and social sign in">
            <div class="login-copy">
              <h2>Welcome back to <span class="brand-inline">Mishi<span>Pass</span></span></h2>
              <p>Sign in to continue managing your cat's passport</p>
            </div>
            <form class="login-form" id="home-login-form">
              <div class="form-row"><label for="home-email">Email</label><input id="home-email" type="email" autocomplete="email" placeholder="Enter your email" required /></div>
              <div class="form-row"><label for="home-password">Password</label><input id="home-password" type="password" autocomplete="current-password" placeholder="Enter your password" required /></div>
              <p class="auth-note">Password reset is not available in this beta yet.</p>
              <button class="mp-btn" type="submit">Log In</button>
              <p id="home-login-error" class="home-error" style="display:none;color:#991b1b;font-size:.875rem;margin:var(--space-1) 0 0"></p>
            </form>
            <aside class="social-panel">
              <div class="divider">OR</div>
              ${socialButtons}
              <p class="signup-note">Don't have an account? <a href="/dashboard/register?lang=${lang}">Sign up</a></p>
            </aside>
          </section>
          <p class="privacy-line"><span class="paw-icon paw-icon-sm" aria-hidden="true"></span><span>Your cat's data stays private and secure with MishiPass</span></p>
        </div>
      </section>

      <section class="mobile-auth" aria-label="MishiPass mobile sign up">
        <div class="phone-shell">
          <div class="mobile-cat">${brandLogoHtml("brand-logo-large")}<span class="sr-only">${t(lang, "rootHeroAlt")}</span></div>
          <span class="welcome-to">WELCOME TO</span>
          ${mobileWordmark()}
          <p class="mobile-tagline">THE DIGITAL PASSPORT FOR YOUR CAT</p>
          <p class="create-title">Create your account</p>
          <div class="mobile-actions">
            <a class="email-pill" href="/dashboard/register?lang=${lang}">${iconEmail(24)}<span>Sign up with Email</span></a>
            ${socialButtons}
          </div>
          <div class="mobile-divider">OR</div>
          <p class="mobile-login">Already have an account?<a href="/dashboard?lang=${lang}">Log in</a></p>
          <footer class="mobile-footer">&copy; 2026 Belvenar Analytics | All Rights Reserved</footer>
        </div>
      </section>

      <section class="lower-sections" id="about">
        <div class="mp-container lower-grid">
          <article class="mp-card lower-card"><h2>About</h2><p>MishiPass keeps one QR useful across everyday profile, missing alert, and vet visit moments.</p></article>
          <article class="mp-card lower-card" id="how-it-works"><h3>How it works</h3><p>Register a cat, keep one permanent QR, then switch the public mode when needed.</p></article>
          <article class="mp-card lower-card" id="contact"><h3>Contact</h3><p>Owner-controlled contact settings protect private details while keeping help reachable.</p></article>
        </div>
      </section>
    </main>

    <footer class="site-footer desktop-footer">&copy; 2026 Belvenar Analytics | All Rights Reserved</footer>
  </div>
  ${LANGUAGE_SCRIPT}
  <script>
  (function(){
    var f=document.getElementById("home-login-form");
    if(!f)return;
    f.addEventListener("submit",function(e){
      e.preventDefault();
      var err=document.getElementById("home-login-error");
      var btn=f.querySelector("button[type=submit]");
      var email=document.getElementById("home-email").value;
      var pw=document.getElementById("home-password").value;
      err.style.display="none";btn.disabled=true;btn.textContent="Working...";
      fetch("/api/auth/login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email,password:pw})}).then(function(r){
        btn.disabled=false;btn.textContent="Log In";
        if(r.ok){window.location.href=${JSON.stringify(`/dashboard?lang=${lang}`)};}
        else{r.text().then(function(t){err.textContent=t||"Login failed";err.style.display="block"});}
      }).catch(function(){btn.disabled=false;btn.textContent="Log In";err.textContent="Network error";err.style.display="block";});
    });
  })();
  </script>
</body>
</html>`;
}

function buildHistoryHtml(request: Request): string {
  const lang = getLanguageFromRequest(request);
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${t(lang, "history")} - MishiPass</title><style>*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;max-width:780px;margin:2rem auto;padding:0 1rem;line-height:1.65;color:#111}a{color:#111}.language{margin-bottom:1rem}.language label{display:block;font-size:.8rem;font-weight:700}.language select{padding:.55rem;border:1px solid #ccc;border-radius:6px;min-height:42px}h1{font-size:clamp(1.8rem,6vw,2.5rem);overflow-wrap:anywhere}p{overflow-wrap:anywhere}</style></head><body><div class="language">${languageSelectHtml(lang)}</div><p><a href="/?lang=${lang}">&larr; ${t(lang, "home")}</a></p><h1>${t(lang, "history")}</h1><p>${t(lang, "historyIntro1")}</p><p>${t(lang, "historyIntro2")}</p><p>${t(lang, "historyIntro3")}</p>${LANGUAGE_SCRIPT}</body></html>`;
}

export function handleRoot(request: Request, env: LogtoEnv = {}): Response {
  const method = request.method;
  if (method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return htmlResponse(buildRootHtml(request, env));
}

export function handleHistory(request: Request): Response {
  return htmlResponse(buildHistoryHtml(request));
}
