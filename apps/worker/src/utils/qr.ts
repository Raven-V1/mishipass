// Internal QR code SVG generator using qrcode-generator.
// Produces inline SVG markup for embedding in Worker-rendered HTML pages.

import qrcode from "qrcode-generator";

/**
 * Generate an inline SVG QR code encoding the given URL.
 * Returns a complete SVG element string suitable for embedding in HTML.
 */
export function generateQrSvg(url: string, size = 200): string {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const cellSize = size / moduleCount;

  let paths = "";
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        const x = col * cellSize;
        const y = row * cellSize;
        paths += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR code">
  <rect width="${size}" height="${size}" fill="#fff" />
  <g fill="#000">${paths}</g>
</svg>`;
}
