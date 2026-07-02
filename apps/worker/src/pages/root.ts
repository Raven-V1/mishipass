import { htmlResponse } from "../utils/html.js";
import { getLanguageFromRequest, LANGUAGE_SCRIPT, languageSelectHtml, t } from "../utils/i18n.js";

function buildRootHtml(request: Request): string {
  const lang = getLanguageFromRequest(request);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MishiPass Beta 1.5</title>
  <meta name="description" content="${t(lang, "tagline")}" />
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:4rem auto;padding:0 1rem;color:#111;line-height:1.6}
    h1{font-size:2.25rem;margin-bottom:0.25rem}
    .tagline{color:#555;margin-bottom:1.5rem;font-size:1.1rem}
    .desc{margin-bottom:1.5rem}
    .cta{display:inline-block;padding:0.75rem 1.5rem;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:1rem;margin-bottom:1rem}
    .language{margin-bottom:1.25rem} .language label{display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.25rem}.language select{padding:0.45rem;border:1px solid #ccc;border-radius:4px}
  </style>
</head>
<body>
  <div class="language">${languageSelectHtml(lang)}</div>
  <h1>MishiPass Beta 1.5</h1>
  <p class="tagline">${t(lang, "tagline")}</p>
  <p class="desc">${t(lang, "description")}</p>
  <a class="cta" href="/dashboard?lang=${lang}">${t(lang, "dashboard")}</a>
  ${LANGUAGE_SCRIPT}
</body>
</html>`;
}

export function handleRoot(request: Request): Response {
  const method = request.method;
  if (method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return htmlResponse(buildRootHtml(request));
}
