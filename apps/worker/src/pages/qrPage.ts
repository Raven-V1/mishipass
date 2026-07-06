import { getCatForOwner, getContactSettingsForOwner, getMissingAlertForOwner } from "../db/index.js";
import { MISHIPASS_DESIGN_CSS, escapeHtml, htmlResponse } from "../utils/html.js";
import { generateQrSvg } from "../utils/qr.js";
import type { RequestContext } from "../middleware/session.js";
import { type LanguageCode, t } from "../utils/i18n.js";
import { renderTopNav, TOP_NAV_CSS } from "./partials/topNav.js";
import { iconContact, iconGift, iconHeart, iconHome, iconPrint, iconQrCode, iconShield } from "../utils/icons.js";

export async function handleQrPage(
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
  const [contactSettings, missingAlert] = await Promise.all([
    getContactSettingsForOwner(db, publicId, ctx.ownerId),
    getMissingAlertForOwner(db, publicId, ctx.ownerId),
  ]);

  const safeName = escapeHtml(cat.name);
  const safeId = escapeHtml(publicId);
  const publicUrl = `${publicBaseUrl}/c/${publicId}`;
  const safeUrl = escapeHtml(publicUrl);
  const qrSvg = generateQrSvg(publicUrl);
  const rewardVisible = Boolean(missingAlert?.reward_visible && missingAlert.reward_amount);
  const rewardText = rewardVisible ? escapeHtml(missingAlert!.reward_amount!) : "";
  const contactText = contactSettings?.contact_mode === "phone" && contactSettings.public_phone
    ? escapeHtml(contactSettings.public_phone)
    : t(lang, "contactThroughMishipass");
  const frontCatVisual = cat.photo_r2_key
    ? `<img class="front-figure" src="/media/cats/${safeId}/photo" alt="${safeName}" />`
    : `<div class="front-figure front-figure-placeholder"><span>${safeName}</span></div>`;

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(lang, "qrCard")} — ${safeName} — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    ${TOP_NAV_CSS}
    body{padding:var(--space-3)}
    .qr-shell{max-width:1140px;margin:0 auto;padding:var(--space-3) 0 var(--space-6)}
    .back-link{display:inline-flex;margin:var(--space-2) 0;font-size:.875rem;font-weight:800}
    .qr-hero{display:grid;gap:var(--space-1);margin:var(--space-2) 0 var(--space-4)}
    .qr-hero-kicker{display:flex;align-items:center;gap:var(--space-1);font-size:.875rem;color:var(--brand-coral);font-weight:900}
    .qr-hero h1{display:flex;align-items:center;gap:var(--space-1);font-size:clamp(2.25rem,6vw,3.5rem);line-height:1.02;color:var(--teal);margin:0}
    .qr-hero-sub{color:var(--muted);margin:0;font-weight:700;font-size:1rem}
    .print-section{padding:var(--space-4)}
    .print-header{font-weight:900;font-size:1.25rem;color:var(--teal);margin:0 0 var(--space-1);display:flex;align-items:center;justify-content:center;gap:var(--space-1)}
    .print-sub{font-size:.9375rem;color:var(--muted);margin:0 0 var(--space-4);text-align:center;font-weight:700}
    .qr-stage{border-radius:18px;background:#fff;box-shadow:0 18px 44px rgba(56,38,26,.08);border:1px solid var(--line);padding:var(--space-4) var(--space-3) var(--space-3);margin-bottom:var(--space-4)}
    .card-pair{display:grid;grid-template-columns:minmax(0,1fr) 36px minmax(0,1fr);gap:var(--space-3);align-items:center}
    .printable-card{position:relative;border:2px dashed #f0b39f;border-radius:18px;padding:var(--space-3);aspect-ratio:1.36/1;background:linear-gradient(180deg,#fffaf6 0%,#fffdfb 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.6);overflow:hidden}
    .printable-card:before{content:"";position:absolute;inset:14px;border-radius:16px;background:linear-gradient(160deg,rgba(255,240,233,.78),rgba(232,250,247,.40));z-index:0}
    .printable-card:after{content:"";position:absolute;inset:auto -44px -48px auto;width:168px;height:168px;border-radius:50%;background:rgba(251,138,104,.10);z-index:0}
    .printable-card>*{position:relative;z-index:1}
    .card-label{display:inline-flex;align-items:center;justify-content:center;min-height:28px;padding:0 .9rem;border-radius:999px;background:#fff0e9;color:var(--brand-coral);font-size:.6875rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin:0 auto var(--space-2)}
    .front-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(160px,188px);gap:var(--space-2);align-items:center}
    .front-info{display:grid;justify-items:center;gap:var(--space-2)}
    .front-figure{width:176px;height:176px;border-radius:50%;object-fit:cover;background:#fff;box-shadow:0 8px 20px rgba(56,38,26,.08)}
    .front-figure-placeholder{display:grid;place-items:center;background:linear-gradient(135deg,#fff,#fff6f1);color:var(--teal);font-weight:900;font-size:1.125rem}
    .front-qr-stack{display:grid;justify-items:center;gap:var(--space-2)}
    .card-qr{display:grid;place-items:center;border-radius:18px;padding:12px;background:#fff;border:2px solid #f0b39f;box-shadow:0 8px 24px rgba(56,38,26,.10)}
    .card-qr svg{display:block;width:42mm;height:42mm}
    .reward-pill,.contact-pill{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:34px;padding:0 14px;border-radius:999px;font-size:.8125rem;font-weight:800;background:#fff;border:1px solid var(--line);color:var(--ink)}
    .reward-pill{background:#fff4ec;color:var(--brand-coral)}
    .front-copy{font-size:1rem;color:var(--ink);font-weight:800;text-align:center}
    .back-card{display:grid;justify-items:center;align-content:center;text-align:center}
    .cat-chip{display:inline-flex;align-items:center;justify-content:center;padding:.35rem .9rem;border-radius:999px;background:#fff;color:var(--teal);font-size:.75rem;font-weight:900;border:1px solid var(--line);margin:0 auto var(--space-2)}
    .back-headline{font-size:2rem;font-weight:900;color:var(--ink);line-height:1.08;margin:var(--space-2) 0}
    .back-headline span{color:var(--brand-coral)}
    .back-divider{width:72%;height:1px;background:var(--line);margin:0 auto var(--space-3)}
    .back-list{list-style:none;padding:0;margin:0 auto var(--space-3);width:min(100%,260px);display:grid;gap:var(--space-2);text-align:left}
    .back-list li{display:flex;align-items:flex-start;gap:10px;font-size:.95rem;color:var(--ink);font-weight:700}
    .back-list li svg{color:var(--teal);margin-top:2px}
    .brand-mark{font-size:1.8rem;font-weight:900;color:var(--brand-coral);margin:.5rem 0 0}
    .brand-mark span{color:var(--brand-mint)}
    .scissors{font-size:1.3rem;color:var(--muted);line-height:1;align-self:center;justify-self:center}
    .qr-actions{display:flex;gap:var(--space-2);justify-content:center;flex-wrap:wrap}
    .qr-actions button,.qr-actions a{flex:1 1 240px;max-width:280px;min-height:52px}
    .pdf-btn{background:#fff;color:var(--teal);border-color:var(--line)}
    .print-card-btn{background:var(--brand-orange);border-color:var(--brand-orange);color:#fff}
    .tip-note{display:flex;align-items:center;justify-content:center;gap:8px;font-size:.875rem;color:var(--muted);font-weight:700;margin:var(--space-2) 0 0;text-align:center}
    @media print {
      .no-print{display:none!important}
      body{margin:0;padding:0;background:white}
      .qr-shell{max-width:none;padding:0}
      .print-section{padding:0}
      .qr-stage{border:0;box-shadow:none;padding:0;margin:0}
      .card-pair{display:grid;grid-template-columns:1fr 6mm 1fr;gap:6mm;padding:6mm}
      .printable-card{border:1.5px dashed #d8c8bd;border-radius:8px;padding:5mm;aspect-ratio:1.36/1}
      .front-card{grid-template-columns:minmax(0,1fr) 40mm}
      .front-figure{width:32mm;height:32mm}
      .card-qr svg{width:40mm;height:40mm}
      .back-headline{font-size:16pt}
    }
    @media(max-width:920px){.card-pair{grid-template-columns:1fr}.scissors{display:none}.front-card{grid-template-columns:1fr}}
    @media(max-width:560px){body{padding:var(--space-2)}.print-section{padding:var(--space-3)}.qr-actions button,.qr-actions a{flex-basis:100%;max-width:none}.back-headline{font-size:1.65rem}.front-figure{width:144px;height:144px}.card-qr svg{width:36mm;height:36mm}}
  </style>
</head>
<body>
  <main class="qr-shell">
    <div class="no-print">
      ${renderTopNav(lang, { authenticated: true, active: "dashboard" })}
      <a class="back-link mp-back" href="/dashboard/cats/${safeId}?lang=${lang}">&larr; ${safeName}</a>
    </div>

    <div class="qr-hero no-print">
      <p class="qr-hero-kicker">${iconQrCode(20)} <span>${t(lang, "qrCard")} / Printable Tag</span></p>
      <h1>${iconQrCode(32)} <span>${t(lang, "qrCard")} / Printable Tag</span></h1>
      <p class="qr-hero-sub">${t(lang, "printDoubleSided")} - ${t(lang, "cutInstruction")}</p>
    </div>

    <section class="mp-card print-section">
      <p class="print-header no-print">${t(lang, "printDoubleSided")}</p>
      <p class="print-sub no-print">${t(lang, "cutInstruction")}</p>
      <div class="qr-stage">
        <div class="card-pair">
          <div class="printable-card front-card">
            <div class="front-info">
              <p class="card-label">FRONT</p>
              ${frontCatVisual}
              <p class="contact-pill">${iconShield(16)} <span>${contactText}</span></p>
            </div>
            <div class="front-qr-stack">
              <div class="card-qr" aria-label="${safeName} QR" id="print-qr-svg">${qrSvg}</div>
              ${rewardVisible ? `<p class="reward-pill">${iconGift(16)} <span>${rewardText}</span></p>` : ""}
              <p class="front-copy">${rewardVisible ? "Help bring me home!" : "Scan to open my profile."}</p>
            </div>
          </div>
          <span class="scissors no-print" aria-hidden="true">&#9986;</span>
          <div class="printable-card back-card">
            <p class="card-label">BACK</p>
            <div class="cat-chip">MishiPass ID</div>
            <p class="back-headline">If you find this cat,<br /><span>scan this QR.</span></p>
            <div class="back-divider"></div>
            <ul class="back-list">
              <li>${iconContact(16)} <span>${t(lang, "scanToView")}</span></li>
              <li>${iconShield(16)} <span>${t(lang, "ownerWillBeNotified")}</span></li>
              <li>${iconHeart(16)} <span>${t(lang, "emergencyContact")}</span></li>
              <li>${iconHome(16)} <span>${t(lang, "thankYouForHelping")}</span></li>
            </ul>
            <p class="brand-mark">Mishi<span>Pass</span></p>
          </div>
        </div>
      </div>
      <div class="qr-actions no-print">
        <button class="mp-btn pdf-btn" id="download-pdf-btn">${t(lang, "downloadPdf")}</button>
        <button class="mp-btn print-card-btn" id="print-card-btn">${iconPrint(18)} <span>${t(lang, "printCard")}</span></button>
      </div>
      <p class="tip-note no-print">${iconGift(16)} <span>${t(lang, "tipPrintCardstock")}</span></p>
    </section>
  </main>
  <script>
  function copyPublicLink(){
    var url=${JSON.stringify(safeUrl)};
    var btn=document.getElementById("copy-link-btn");
    if(!btn)return;
    if(navigator.clipboard){
      navigator.clipboard.writeText(url).then(function(){
        btn.textContent=${JSON.stringify(t(lang, "linkCopied"))};
        setTimeout(function(){btn.textContent=${JSON.stringify(t(lang, "copyLink"))};},2000);
      }).catch(fallback);
    } else { fallback(); }
    function fallback(){
      var ta=document.createElement("textarea");
      ta.value=url;ta.style.position="fixed";ta.style.opacity="0";
      document.body.appendChild(ta);ta.select();document.execCommand("copy");
      document.body.removeChild(ta);
      btn.textContent=${JSON.stringify(t(lang, "linkCopied"))};
      setTimeout(function(){btn.textContent=${JSON.stringify(t(lang, "copyLink"))};},2000);
    }
  }
  function bytesFromString(value){
    var bytes=new Uint8Array(value.length);
    for(var i=0;i<value.length;i++)bytes[i]=value.charCodeAt(i)&255;
    return bytes;
  }
  function jpegDataUrlToPdf(dataUrl,width,height){
    var base64=dataUrl.split(",")[1]||"";
    var binary=atob(base64);
    var imgBytes=bytesFromString(binary);
    var pageWidth=612;
    var pageHeight=Math.max(420,Math.round(pageWidth*(height/width)));
    var stream="q\\n"+pageWidth+" 0 0 "+pageHeight+" 0 0 cm\\n/Im0 Do\\nQ";
    var objects=[];
    objects.push("1 0 obj\\n<< /Type /Catalog /Pages 2 0 R >>\\nendobj\\n");
    objects.push("2 0 obj\\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\\nendobj\\n");
    objects.push("3 0 obj\\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+pageWidth+" "+pageHeight+"] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\\nendobj\\n");
    objects.push({header:"4 0 obj\\n<< /Type /XObject /Subtype /Image /Width "+width+" /Height "+height+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+imgBytes.length+" >>\\nstream\\n",bytes:imgBytes,footer:"\\nendstream\\nendobj\\n"});
    objects.push("5 0 obj\\n<< /Length "+stream.length+" >>\\nstream\\n"+stream+"\\nendstream\\nendobj\\n");
    var chunks=[bytesFromString("%PDF-1.4\\n")];
    var offsets=[0];
    var cursor=chunks[0].length;
    objects.forEach(function(obj){
      offsets.push(cursor);
      if(typeof obj==="string"){
        var part=bytesFromString(obj);
        chunks.push(part);
        cursor+=part.length;
      }else{
        var header=bytesFromString(obj.header);
        var footer=bytesFromString(obj.footer);
        chunks.push(header,obj.bytes,footer);
        cursor+=header.length+obj.bytes.length+footer.length;
      }
    });
    var xrefStart=cursor;
    var xref="xref\\n0 6\\n0000000000 65535 f \\n";
    for(var i=1;i<offsets.length;i++)xref+=String(offsets[i]).padStart(10,"0")+" 00000 n \\n";
    xref+="trailer\\n<< /Size 6 /Root 1 0 R >>\\nstartxref\\n"+xrefStart+"\\n%%EOF";
    chunks.push(bytesFromString(xref));
    return new Blob(chunks,{type:"application/pdf"});
  }
  async function renderCardCanvas(){
    var svgNode=document.querySelector("#print-qr-svg svg");
    if(!svgNode)throw new Error("qr_missing");
    var serializer=new XMLSerializer();
    var svgMarkup=serializer.serializeToString(svgNode);
    var svgBlob=new Blob([svgMarkup],{type:"image/svg+xml;charset=utf-8"});
    var svgUrl=URL.createObjectURL(svgBlob);
    try{
      var qrImage=new Image();
      qrImage.decoding="async";
      qrImage.src=svgUrl;
      await qrImage.decode();
      var canvas=document.createElement("canvas");
      canvas.width=1800;
      canvas.height=980;
      var ctx=canvas.getContext("2d");
      ctx.fillStyle="#fffaf6";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle="#ffffff";
      ctx.strokeStyle="#eec3b3";
      ctx.lineWidth=4;
      function roundRect(x,y,w,h,r){
        ctx.beginPath();
        ctx.moveTo(x+r,y);
        ctx.arcTo(x+w,y,x+w,y+h,r);
        ctx.arcTo(x+w,y+h,x,y+h,r);
        ctx.arcTo(x,y+h,x,y,r);
        ctx.arcTo(x,y,x+w,y,r);
        ctx.closePath();
      }
      roundRect(96,120,1608,720,32);ctx.fill();ctx.stroke();
      roundRect(156,188,680,544,28);ctx.stroke();
      roundRect(964,188,580,544,28);ctx.stroke();
      ctx.fillStyle="#153c3b";
      ctx.font="700 28px Arial";
      ctx.fillText("FRONT",446,220);
      ctx.fillText("BACK",1222,220);
      ctx.fillStyle="#111";
      ctx.font="700 70px Arial";
      ctx.fillText("If you find this cat,",1040,370);
      ctx.fillStyle="#fb7654";
      ctx.fillText("scan this QR.",1090,450);
      ctx.strokeStyle="#ead8d0";
      ctx.beginPath();ctx.moveTo(1040,500);ctx.lineTo(1445,500);ctx.stroke();
      ctx.fillStyle="#153c3b";
      ctx.font="700 34px Arial";
      var backLines=${JSON.stringify([
        t(lang, "scanToView"),
        t(lang, "ownerWillBeNotified"),
        t(lang, "emergencyContact"),
        t(lang, "thankYouForHelping"),
      ])};
      backLines.forEach(function(line,index){ctx.fillText(line,1120,560+(index*72));});
      ctx.fillStyle="#fb7654";
      ctx.font="700 58px Arial";
      ctx.fillText("Mishi",1155,772);
      ctx.fillStyle="#66d1c3";
      ctx.fillText("Pass",1288,772);
      ctx.fillStyle="#fff";
      ctx.beginPath();ctx.arc(336,412,132,0,Math.PI*2);ctx.fill();
      ctx.drawImage(qrImage,430,306,230,230);
      ctx.fillStyle="#fff";
      ctx.strokeStyle="#ead8d0";
      roundRect(236,606,388,52,24);ctx.fill();ctx.stroke();
      ctx.fillStyle="#153c3b";
      ctx.font="700 28px Arial";
      ctx.fillText(${JSON.stringify(contactText)},260,640);
      ${rewardVisible ? `ctx.fillStyle="#fff4ec";ctx.strokeStyle="#f0b39f";roundRect(476,560,178,48,20);ctx.fill();ctx.stroke();ctx.fillStyle="#fb7654";ctx.font="700 28px Arial";ctx.fillText(${JSON.stringify(rewardText)},506,593);` : ``}
      ctx.fillStyle="#153c3b";
      ctx.font="700 34px Arial";
      ctx.fillText(${JSON.stringify(rewardVisible ? "Help bring me home!" : "Scan to open my profile.")},410,700);
      return canvas;
    }finally{
      URL.revokeObjectURL(svgUrl);
    }
  }
  async function downloadPdf(){
    var btn=document.getElementById("download-pdf-btn");
    if(btn)btn.disabled=true;
    try{
      var canvas=await renderCardCanvas();
      var dataUrl=canvas.toDataURL("image/jpeg",0.92);
      var pdfBlob=jpegDataUrlToPdf(dataUrl,canvas.width,canvas.height);
      var link=document.createElement("a");
      link.href=URL.createObjectURL(pdfBlob);
      link.download=${JSON.stringify(`${publicId}-qr-card.pdf`)};
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function(){URL.revokeObjectURL(link.href);},1000);
    }catch(err){
      alert("Could not create PDF.");
    }finally{
      if(btn)btn.disabled=false;
    }
  }
  document.getElementById("download-pdf-btn").addEventListener("click",downloadPdf);
  document.getElementById("print-card-btn").addEventListener("click",function(){window.print();});
  </script>
</body>
</html>`;

  return htmlResponse(html);
}
