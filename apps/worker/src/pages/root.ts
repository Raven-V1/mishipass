import { iconApple, iconDocument, iconEmail, iconGoogle, iconLock, iconMegaphone, iconQrCode, iconStethoscope } from "../utils/icons.js";
import { MISHIPASS_DESIGN_CSS, brandLockupHtml, brandLogoHtml, htmlResponse } from "../utils/html.js";
import { getLanguageFromRequest, LANGUAGE_SCRIPT, languageSelectHtml, t } from "../utils/i18n.js";
import type { LogtoEnv } from "../routes/logto.js";

function featureIcon(kind: string): string {
  const icons: Record<string, string> = {
    lock: iconLock(24),
    record: iconDocument(24),
    qr: iconQrCode(24),
    alert: iconMegaphone(24),
    vet: iconStethoscope(24),
    board: iconDocument(24),
    profile: iconQrCode(24),
    message: iconEmail(24),
  };
  return icons[kind] || iconQrCode(24);
}

function featureCard(title: string, copy: string, kind: string): string {
  return `<article class="mp-card feature-card"><div class="feature-icon" aria-hidden="true">${featureIcon(kind)}</div><h3>${title}</h3><p>${copy}</p></article>`;
}

function stepCard(number: string, title: string): string {
  return `<article class="mp-card step"><div class="step-num">${number}</div><h3>${title}</h3></article>`;
}

function socialButtonsHtml(env: LogtoEnv): string {
  const baseConfigured = !!(env.LOGTO_ENDPOINT && env.LOGTO_APP_ID && env.LOGTO_CLIENT_SECRET && env.LOGTO_REDIRECT_URI);
  const google = baseConfigured
    ? `<a class="social-btn" href="/api/auth/logto/google">${iconGoogle(18)}<span>Continue with Google</span></a>`
    : `<button class="social-btn provider-pending" type="button" disabled aria-disabled="true" title="Google login config pending">${iconGoogle(18)}<span>Continue with Google</span></button>`;
  const apple = baseConfigured && !!env.LOGTO_APPLE_CONNECTOR_TARGET
    ? `<a class="social-btn" href="/api/auth/logto/apple">${iconApple(18)}<span>Continue with Apple</span></a>`
    : `<button class="social-btn provider-pending" type="button" disabled aria-disabled="true" title="Apple login config pending">${iconApple(18)}<span>Continue with Apple</span></button>`;
  return `${google}${apple}${baseConfigured ? "" : `<p class="provider-note">Google and Apple sign-in are code-complete and config pending.</p>`}`;
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
    body{background-color:var(--cream)}
    .site-header{position:sticky;top:0;z-index:5;background:rgba(255,248,243,.94);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
    .header-inner{height:80px;display:grid;grid-template-columns:1fr auto auto;gap:var(--space-3);align-items:center}
    .nav{display:flex;gap:var(--space-3);align-items:center}
    .nav a{font-weight:800;text-decoration:none;color:var(--ink)}
    .header-cta{display:flex;gap:var(--space-2);align-items:center}
    .mobile-nav{display:none}
    .language{min-width:128px}
    .language label{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
    .hero{position:relative;overflow:hidden;padding:var(--space-8) 0 var(--space-6)}
    .hero-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:var(--space-4);align-items:center}
    .welcome-zone{grid-column:1/span 5}
    .feature-zone{grid-column:6/span 7}
    .welcome-zone,.feature-zone,.feature-card,.login-left,.login-right{min-width:0}
    .eyebrow{display:inline-flex;min-height:32px;align-items:center;padding:0 var(--space-2);border-radius:999px;background:#e9f5ef;color:var(--teal);font-weight:900;font-size:.875rem}
    h1{font-size:clamp(2.5rem,5vw,4.75rem);line-height:1.02;margin:var(--space-2) 0;color:var(--teal);overflow-wrap:anywhere}
    h2{font-size:clamp(1.75rem,3vw,2.5rem);line-height:1.12;margin:0 0 var(--space-3);color:var(--teal);overflow-wrap:anywhere}
    h3{margin:0 0 var(--space-1);font-size:1.05rem;color:var(--ink);overflow-wrap:anywhere}
    p{overflow-wrap:anywhere}
    .hero-copy{font-size:1.125rem;color:var(--muted);margin:0 0 var(--space-3)}
    .hero-actions{display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-3)}
    .mobile-brand-mark{display:none;margin:0 auto var(--space-2)}
    .cat-card{position:relative;margin-top:var(--space-4);min-height:280px;padding:var(--space-4);overflow:hidden;background:linear-gradient(135deg,#fffdf9,#fff0e9)}
    .cat-card:before{content:"";position:absolute;inset:auto -48px -64px auto;width:224px;height:224px;border-radius:50%;background:rgba(102,209,195,.34)}
    .cat-illustration{position:relative;display:flex;align-items:center;justify-content:center;min-height:208px}
    .cat-illustration .brand-logo-large{width:min(100%,208px);height:min(100%,208px)}
    .feature-zone .headline{font-size:clamp(2rem,4vw,3.5rem);line-height:1.05;margin:0 0 var(--space-3);color:var(--ink)}
    .feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-2)}
    .feature-card{padding:var(--space-3);min-height:192px}
    .feature-icon{width:48px;height:48px;border-radius:8px;background:#e8faf7;display:flex;align-items:center;justify-content:center;margin-bottom:var(--space-2);font-size:1.75rem;color:var(--teal)}
    .feature-card p{margin:0;color:var(--muted)}
    .login-card{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:0;overflow:hidden}
    .login-left{grid-column:1/span 7;padding:var(--space-4)}
    .login-right{grid-column:8/span 5;padding:var(--space-4);background:#fff4f3;border-left:1px solid var(--line);display:flex;flex-direction:column;justify-content:center;gap:var(--space-2)}
    .form-row{margin-bottom:var(--space-2)}
    .form-meta{display:flex;justify-content:space-between;gap:var(--space-2);align-items:center;margin:var(--space-2) 0;flex-wrap:wrap}
    .check-label{display:inline-flex;gap:var(--space-1);align-items:center;margin:0;font-weight:700}
    .check-label input{width:16px;min-height:16px}
    .divider{display:flex;align-items:center;gap:var(--space-2);color:var(--muted);font-weight:900}
    .divider:before,.divider:after{content:"";height:1px;background:var(--line);flex:1}
    .social-btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--space-1);min-height:var(--touch-target);padding:var(--space-1) var(--space-2);border-radius:8px;background:#fff;color:var(--ink);border:1px solid var(--line);font:inherit;text-decoration:none;font-weight:800}
    .provider-note{margin:0;color:var(--muted);font-size:.875rem}
    .section-intro{max-width:736px;color:var(--muted);font-size:1.05rem;margin:0 0 var(--space-4)}
    .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-3)}
    .card{padding:var(--space-3);min-width:0}
    .step-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:var(--space-2)}
    .step{padding:var(--space-3);min-height:176px;position:relative}
    .step-num{width:40px;height:40px;border-radius:50%;background:var(--coral);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;margin-bottom:var(--space-2)}
    .contact-panel{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:var(--space-3);align-items:center;padding:var(--space-4)}
    .contact-panel>div{grid-column:1/span 8}
    .contact-panel>a{grid-column:9/span 4}
    .site-footer{padding:var(--space-4) var(--space-2);text-align:center;color:var(--muted);font-size:.875rem}
    @media(max-width:900px){.header-inner{height:auto;min-height:80px;grid-template-columns:1fr auto;gap:var(--space-2);padding:var(--space-2) 0}.nav,.header-cta{display:none}.mobile-nav{display:block;grid-column:1/-1}.mobile-nav summary{min-height:44px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;background:#fff;font-weight:900;cursor:pointer}.mobile-nav div{display:grid;gap:var(--space-1);padding:var(--space-2) 0}.mobile-nav a{min-height:44px;display:flex;align-items:center;color:var(--ink);font-weight:800;text-decoration:none}.hero-grid{grid-template-columns:repeat(8,minmax(0,1fr))}.welcome-zone,.feature-zone{grid-column:1/-1}.feature-grid,.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.step-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.login-left,.login-right{grid-column:1/-1}.login-right{border-left:0;border-top:1px solid var(--line)}.contact-panel>div,.contact-panel>a{grid-column:1/-1}}
    @media(max-width:600px){body{overflow-x:hidden}.mp-container{width:100%;max-width:100%;overflow:hidden}.hero-grid{display:block;max-width:100%}.welcome-zone,.feature-zone,.feature-card,.card,.step,.login-card,.cat-card{width:calc(100vw - 32px);max-width:calc(100vw - 32px)}.feature-grid,.cards,.step-grid{grid-template-columns:minmax(0,1fr);max-width:100%}.hero-copy,.feature-zone .headline,.feature-card p,.section-intro{width:calc(100vw - 32px);max-width:calc(100vw - 32px);overflow-wrap:anywhere}.hero-actions,.cat-card,.feature-zone{display:none}.mobile-brand-mark{display:block}.welcome-zone{text-align:center}.welcome-zone .eyebrow{display:none}.hero-copy{margin-left:auto;margin-right:auto}.social-btn{width:100%}.login-card{margin-top:0}.login-left{display:none}.login-right{background:var(--card);border-top:0;text-align:center}.login-right h2{display:block}.provider-note{text-align:center}}
    @media(max-width:430px){.hero{padding:var(--space-4) 0 var(--space-2)}.cat-card{min-height:264px;padding:var(--space-3)}.feature-grid,.cards,.step-grid{grid-template-columns:1fr}.feature-card{min-height:160px}.hero-actions .mp-btn{width:100%}.login-left,.login-right,.contact-panel{padding:var(--space-3)}h1{font-size:2.5rem}.hero-copy{font-size:1rem}}
  </style>
</head>
<body>
  <div class="mp-page">
  <header class="site-header">
    <div class="mp-container header-inner">
      ${brandLockupHtml(`/?lang=${lang}`)}
      <nav class="nav" aria-label="Primary">
        <a href="#about">About</a>
        <a href="#features">Features</a>
        <a href="#how-it-works">How it works</a>
        <a href="#contact">Contact</a>
      </nav>
      <div class="header-cta">
        <div class="language">${languageSelectHtml(lang)}</div>
        <a class="mp-btn mp-btn-primary" href="#sign-up">Sign up</a>
      </div>
      <details class="mobile-nav">
        <summary>Menu</summary>
        <div>
          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#contact">Contact</a>
          <a href="#sign-up">Sign up</a>
        </div>
      </details>
    </div>
  </header>
  <main>
    <section class="hero" data-section="hero">
      <div class="mp-container hero-grid">
        <div class="welcome-zone">
          <div class="mobile-brand-mark">${brandLogoHtml("brand-logo-large")}</div>
          <span class="eyebrow">Welcome to MishiPass</span>
          <h1>MishiPass</h1>
          <p class="hero-copy">The digital passport for your cat</p>
          <p class="hero-copy">A privacy-first dynamic QR system for everyday cat care, missing alerts, and documentation-only records.</p>
          <div class="hero-actions">
            <a class="mp-btn mp-btn-primary" href="/dashboard?lang=${lang}">${t(lang, "dashboard")}</a>
            <a class="mp-btn mp-btn-secondary" href="/recovery-board?lang=${lang}">${t(lang, "recoveryBoard")}</a>
          </div>
          <div class="mp-card cat-card" aria-label="${t(lang, "rootHeroAlt")}">
            <div class="cat-illustration">${brandLogoHtml("brand-logo-large")}</div>
          </div>
        </div>
        <div class="feature-zone">
          <p class="headline">Everything your cat needs, all in one place</p>
          <div class="feature-grid">
            ${featureCard("Secure & Private", "Owner-controlled modes keep sensitive records private.", "lock")}
            ${featureCard("All-in-One Records", "Keep core profile details and documentation in one workspace.", "record")}
            ${featureCard("QR Passport", "One permanent QR adapts to the current mode.", "qr")}
            ${featureCard("Missing Alerts", "Public-safe alert pages help people report sightings.", "alert")}
            ${featureCard("Vet Visit Ready", "Temporary visit forms collect documentation only.", "vet")}
            ${featureCard("Recovery Board", "Opt-in listings support community search workflows.", "board")}
          </div>
        </div>
      </div>
    </section>
    <section id="sign-up" class="mp-section" data-section="auth">
      <div class="mp-container">
        <div class="mp-card login-card">
          <div class="login-left">
            <h2>Welcome back to MishiPass</h2>
            <div class="form-row"><label for="home-email">Email</label><input id="home-email" type="email" autocomplete="email" /></div>
            <div class="form-row"><label for="home-password">Password</label><input id="home-password" type="password" autocomplete="current-password" /></div>
            <div class="form-meta"><label class="check-label"><input type="checkbox" /> Remember me</label><a href="/dashboard?lang=${lang}">Forgot password?</a></div>
            <a class="mp-btn mp-btn-primary" href="/dashboard?lang=${lang}">Log in</a>
          </div>
          <div class="login-right">
            <h2>Create your account</h2>
            <a class="social-btn" href="/dashboard?lang=${lang}">${iconEmail(18)}<span>Sign up with Email</span></a>
            ${socialButtons}
            <div class="divider">OR</div>
            <p>Already have an account? <a href="/dashboard?lang=${lang}">Log in</a></p>
          </div>
        </div>
      </div>
    </section>
    <section id="about" class="mp-section" data-section="about">
      <div class="mp-container">
        <h2>About MishiPass</h2>
        <p class="section-intro">MishiPass is a privacy-first dynamic QR passport and recovery system for cats. One static QR can show the right public-safe experience while the private cartilla stays private.</p>
        <div class="cards">
          <article class="mp-card card"><h3>One static QR</h3><p>The printed QR can stay the same while the current mode changes behind it.</p></article>
          <article class="mp-card card"><h3>Owner-controlled modes</h3><p>Switch between Active Profile, Missing Alert, and Vet Visit mode when needed.</p></article>
          <article class="mp-card card"><h3>Public-safe info</h3><p>Public pages avoid exact addresses, private cartilla data, and owner full names.</p></article>
        </div>
      </div>
    </section>
    <section id="features" class="mp-section" data-section="features">
      <div class="mp-container">
        <h2>Features</h2>
        <div class="cards">
          ${featureCard("Active Profile", "Everyday public profile with safe details.", "profile")}
          ${featureCard("Missing Alert", "Temporary alert mode for sightings and recovery.", "alert")}
          ${featureCard("Vet Visit", "Mode-gated forms for documentation-only visit records.", "vet")}
          ${featureCard("Digital Cartilla", "Private owner record cards for vaccines and notes.", "record")}
          ${featureCard("WhatsApp-ready missing card", "Share a concise missing cat preview.", "message")}
          ${featureCard("Recovery Board opt-in", "List missing alerts only when the owner chooses.", "board")}
        </div>
      </div>
    </section>
    <section id="how-it-works" class="mp-section" data-section="how-it-works">
      <div class="mp-container">
        <h2>How it works</h2>
        <div class="step-grid">
          ${stepCard("1", "Register your cat")}
          ${stepCard("2", "Get one permanent QR")}
          ${stepCard("3", "Choose the current mode")}
          ${stepCard("4", "Scan the same QR and see the right experience")}
          ${stepCard("5", "Return to Active Profile when done")}
        </div>
      </div>
    </section>
    <section id="contact" class="mp-section" data-section="contact">
      <div class="mp-container">
        <div class="mp-card contact-panel">
          <div><h2>Contact</h2><p class="section-intro">Demo-safe contact relay pages help a finder reach the owner without exposing private personal details.</p></div>
          <a class="mp-btn mp-btn-primary" href="/dashboard?lang=${lang}">Open dashboard</a>
        </div>
      </div>
    </section>
  </main>
  <footer class="site-footer">&copy; 2026 Belvenar Analytics | All Rights Reserved</footer>
  </div>
  ${LANGUAGE_SCRIPT}
</body>
</html>`;
}

function buildHistoryHtml(request: Request): string {
  const lang = getLanguageFromRequest(request);
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${t(lang, "history")} — MishiPass</title><style>*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;max-width:780px;margin:2rem auto;padding:0 1rem;line-height:1.65;color:#111}a{color:#111}.language{margin-bottom:1rem}.language label{display:block;font-size:.8rem;font-weight:700}.language select{padding:.55rem;border:1px solid #ccc;border-radius:6px;min-height:42px}h1{font-size:clamp(1.8rem,6vw,2.5rem);overflow-wrap:anywhere}p{overflow-wrap:anywhere}</style></head><body><div class="language">${languageSelectHtml(lang)}</div><p><a href="/?lang=${lang}">&larr; ${t(lang, "home")}</a></p><h1>${t(lang, "history")}</h1><p>${t(lang, "historyIntro1")}</p><p>${t(lang, "historyIntro2")}</p><p>${t(lang, "historyIntro3")}</p>${LANGUAGE_SCRIPT}</body></html>`;
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
