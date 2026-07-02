import { MISHIPASS_DESIGN_CSS, htmlResponse } from "../utils/html.js";
import { getLanguageFromRequest, LANGUAGE_SCRIPT, languageSelectHtml, t } from "../utils/i18n.js";

function catPeekSvg(): string {
  return `<svg viewBox="0 0 64 64" role="img" aria-label="Black cat peeking icon"><path d="M16 48V28L24 12L32 28L40 12L48 28V48H16Z" fill="#111"/><circle cx="26" cy="38" r="3" fill="#fff8ee"/><circle cx="38" cy="38" r="3" fill="#fff8ee"/><path d="M30 46Q32 48 34 46" fill="none" stroke="#fff8ee" stroke-width="3" stroke-linecap="round"/></svg>`;
}

function heroCatSvg(): string {
  return `<svg viewBox="0 0 420 320" role="img" aria-label="Illustrated black cat mascot with MishiPass QR tag">
    <ellipse cx="210" cy="192" rx="124" ry="78" fill="#111"/>
    <circle cx="172" cy="122" r="64" fill="#111"/>
    <path d="M130 80 104 40 104 104Z" fill="#111"/>
    <path d="M208 78 240 40 228 104Z" fill="#111"/>
    <circle cx="148" cy="120" r="8" fill="#e9f5ef"/><circle cx="196" cy="120" r="8" fill="#e9f5ef"/>
    <path d="M168 142 176 142 172 150Z" fill="#f06f61"/>
    <path d="M134 168Q172 196 210 168" fill="none" stroke="#fff8ee" stroke-width="6" stroke-linecap="round"/>
    <path d="M288 154C336 104 384 150 352 198C328 234 276 216 296 178" fill="none" stroke="#111" stroke-width="18" stroke-linecap="round"/>
    <rect x="160" y="216" width="72" height="72" rx="16" fill="#fff8ee" stroke="#0f6b63" stroke-width="6"/>
    <rect x="176" y="232" width="16" height="16" fill="#0f6b63"/><rect x="204" y="232" width="12" height="12" fill="#0f6b63"/>
    <rect x="176" y="260" width="12" height="12" fill="#0f6b63"/><rect x="204" y="256" width="16" height="16" fill="#0f6b63"/>
    <circle cx="92" cy="246" r="16" fill="#ffe4e8"/><circle cx="328" cy="80" r="24" fill="#e9f5ef"/>
  </svg>`;
}

function featureIcon(kind: string): string {
  const labels: Record<string, string> = {
    lock: "Lock",
    record: "Record",
    qr: "QR",
    alert: "!",
    vet: "+",
    board: "List",
    profile: "Cat",
    message: "Chat",
  };
  return labels[kind] || "Cat";
}

function featureCard(title: string, copy: string, kind: string): string {
  return `<article class="mp-card feature-card"><div class="feature-icon" aria-hidden="true">${featureIcon(kind)}</div><h3>${title}</h3><p>${copy}</p></article>`;
}

function stepCard(number: string, title: string): string {
  return `<article class="mp-card step"><div class="step-num">${number}</div><h3>${title}</h3></article>`;
}

function buildRootHtml(request: Request): string {
  const lang = getLanguageFromRequest(request);
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
    .site-header{position:sticky;top:0;z-index:5;background:rgba(255,248,238,.94);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
    .header-inner{height:80px;display:grid;grid-template-columns:1fr auto auto;gap:var(--space-3);align-items:center}
    .brand{display:grid;grid-template-columns:48px minmax(0,1fr);gap:var(--space-2);align-items:center;color:var(--ink);text-decoration:none;min-width:0}
    .brand-icon{width:48px;height:48px;border-radius:16px;background:#111;display:flex;align-items:flex-end;justify-content:center;overflow:hidden}
    .brand-icon svg{width:40px;height:40px}
    .wordmark{display:block;font-size:1.25rem;font-weight:900;line-height:1;color:var(--teal)}
    .brand-tag{display:block;font-size:.75rem;color:var(--muted);margin-top:var(--space-1);overflow-wrap:anywhere}
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
    .eyebrow{display:inline-flex;min-height:32px;align-items:center;padding:0 var(--space-2);border-radius:999px;background:#e9f5ef;color:var(--teal);font-weight:900;font-size:.875rem}
    h1{font-size:clamp(2.5rem,5vw,4.75rem);line-height:1.02;margin:var(--space-2) 0;color:var(--teal);overflow-wrap:anywhere}
    h2{font-size:clamp(1.75rem,3vw,2.5rem);line-height:1.12;margin:0 0 var(--space-3);color:var(--teal);overflow-wrap:anywhere}
    h3{margin:0 0 var(--space-1);font-size:1.05rem;color:var(--ink);overflow-wrap:anywhere}
    p{overflow-wrap:anywhere}
    .hero-copy{font-size:1.125rem;color:var(--muted);margin:0 0 var(--space-3)}
    .hero-actions{display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-3)}
    .cat-card{position:relative;margin-top:var(--space-4);min-height:320px;padding:var(--space-4);overflow:hidden}
    .cat-card:before{content:"";position:absolute;inset:auto -48px -64px auto;width:224px;height:224px;border-radius:50%;background:var(--pink)}
    .cat-illustration{position:relative;display:flex;align-items:center;justify-content:center;min-height:224px}
    .cat-illustration svg{width:min(100%,360px);height:auto}
    .feature-zone .headline{font-size:clamp(2rem,4vw,3.5rem);line-height:1.05;margin:0 0 var(--space-3);color:var(--ink)}
    .feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-2)}
    .feature-card{padding:var(--space-3);min-height:192px}
    .feature-icon{width:64px;height:64px;border-radius:16px;background:#e9f5ef;display:flex;align-items:center;justify-content:center;margin-bottom:var(--space-2);font-size:1.75rem;color:var(--teal)}
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
    .social-btn{background:#fff;color:var(--ink);border:1px solid var(--line)}
    .section-intro{max-width:736px;color:var(--muted);font-size:1.05rem;margin:0 0 var(--space-4)}
    .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-3)}
    .card{padding:var(--space-3);min-width:0}
    .step-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:var(--space-2)}
    .step{padding:var(--space-3);min-height:176px;position:relative}
    .step-num{width:40px;height:40px;border-radius:50%;background:var(--coral);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;margin-bottom:var(--space-2)}
    .contact-panel{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:var(--space-3);align-items:center;padding:var(--space-4)}
    .contact-panel>div{grid-column:1/span 8}
    .contact-panel>a{grid-column:9/span 4}
    .visual-only{font-size:.875rem;color:var(--muted);margin:0}
    @media(max-width:900px){.header-inner{height:auto;min-height:80px;grid-template-columns:1fr auto;gap:var(--space-2);padding:var(--space-2) 0}.nav,.header-cta{display:none}.mobile-nav{display:block;grid-column:1/-1}.mobile-nav summary{min-height:44px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;background:#fff;font-weight:900;cursor:pointer}.mobile-nav div{display:grid;gap:var(--space-1);padding:var(--space-2) 0}.mobile-nav a{min-height:44px;display:flex;align-items:center;color:var(--ink);font-weight:800;text-decoration:none}.hero-grid{grid-template-columns:repeat(8,minmax(0,1fr))}.welcome-zone,.feature-zone{grid-column:1/-1}.feature-grid,.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.step-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.login-left,.login-right{grid-column:1/-1}.login-right{border-left:0;border-top:1px solid var(--line)}.contact-panel>div,.contact-panel>a{grid-column:1/-1}}
    @media(max-width:430px){.brand{grid-template-columns:40px minmax(0,1fr)}.brand-icon{width:40px;height:40px;border-radius:8px}.brand-icon svg{width:32px;height:32px}.brand-tag{font-size:.7rem}.hero{padding:var(--space-4) 0}.cat-card{min-height:264px;padding:var(--space-3)}.feature-grid,.cards,.step-grid{grid-template-columns:1fr}.feature-card{min-height:160px}.hero-actions .mp-btn{width:100%}.login-left,.login-right,.contact-panel{padding:var(--space-3)}}
  </style>
</head>
<body>
  <div class="mp-page">
  <header class="site-header">
    <div class="mp-container header-inner">
      <a class="brand" href="/?lang=${lang}" aria-label="MishiPass home">
        <span class="brand-icon" aria-hidden="true">${catPeekSvg()}</span>
        <span><span class="wordmark">MishiPass</span><span class="brand-tag">The digital passport for your cat</span></span>
      </a>
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
          <span class="eyebrow">Welcome back!</span>
          <h1>MishiPass</h1>
          <p class="hero-copy">Sign in to continue managing your cat's passport.</p>
          <p class="hero-copy">A privacy-first dynamic QR system for everyday cat care, missing alerts, and documentation-only records.</p>
          <div class="hero-actions">
            <a class="mp-btn mp-btn-primary" href="/dashboard?lang=${lang}">${t(lang, "dashboard")}</a>
            <a class="mp-btn mp-btn-secondary" href="/recovery-board?lang=${lang}">${t(lang, "recoveryBoard")}</a>
          </div>
          <div class="mp-card cat-card" aria-label="${t(lang, "rootHeroAlt")}">
            <div class="cat-illustration">${heroCatSvg()}</div>
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
            <div class="divider">OR</div>
            <button class="social-btn" type="button" aria-disabled="true">Continue with Google</button>
            <button class="social-btn" type="button" aria-disabled="true">Continue with Apple</button>
            <p>Don't have an account? <a href="/dashboard?lang=${lang}">Sign up</a></p>
            <p class="visual-only">Provider buttons are visual only in this design pass.</p>
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
  </div>
  ${LANGUAGE_SCRIPT}
</body>
</html>`;
}

function buildHistoryHtml(request: Request): string {
  const lang = getLanguageFromRequest(request);
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${t(lang, "history")} — MishiPass</title><style>*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;max-width:780px;margin:2rem auto;padding:0 1rem;line-height:1.65;color:#111}a{color:#111}.language{margin-bottom:1rem}.language label{display:block;font-size:.8rem;font-weight:700}.language select{padding:.55rem;border:1px solid #ccc;border-radius:6px;min-height:42px}h1{font-size:clamp(1.8rem,6vw,2.5rem);overflow-wrap:anywhere}p{overflow-wrap:anywhere}</style></head><body><div class="language">${languageSelectHtml(lang)}</div><p><a href="/?lang=${lang}">&larr; ${t(lang, "home")}</a></p><h1>${t(lang, "history")}</h1><p>${t(lang, "historyIntro1")}</p><p>${t(lang, "historyIntro2")}</p><p>${t(lang, "historyIntro3")}</p>${LANGUAGE_SCRIPT}</body></html>`;
}

export function handleRoot(request: Request): Response {
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
  return htmlResponse(buildRootHtml(request));
}

export function handleHistory(request: Request): Response {
  return htmlResponse(buildHistoryHtml(request));
}
