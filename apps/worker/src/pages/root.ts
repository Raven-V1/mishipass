import { htmlResponse } from "../utils/html.js";

const ROOT_HTML = `<!DOCTYPE html>
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

export function handleRoot(method: string): Response {
  if (method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return htmlResponse(ROOT_HTML);
}
