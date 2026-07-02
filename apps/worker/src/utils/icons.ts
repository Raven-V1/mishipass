/**
 * MishiPass icon library — vendored SVG paths from IBM Carbon Design System.
 *
 * License: Apache-2.0
 * Source: https://github.com/carbon-design-system/carbon/tree/main/packages/icons
 * Only the specific icons needed are vendored here to avoid dependency bloat.
 *
 * Usage: each function returns an inline SVG string safe for Worker-rendered HTML.
 * All icons use a 16x16 or 20x20 viewBox. Pass `size` to scale.
 */

export function iconLock(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M12 7V5a4 4 0 0 0-8 0v2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-3 0H7V5a1 1 0 0 1 2 0Z"/></svg>`;
}

export function iconDocument(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M10 1H3v14h10V4Zm1 12H5V3h4v3h2Z"/></svg>`;
}

export function iconQrCode(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M1 1h6v6H1Zm2 2v2h2V3ZM9 1h6v6H9Zm2 2v2h2V3ZM1 9h6v6H1Zm2 2v2h2v-2Zm8-2h2v2h-2Zm-2 0h2v4h-2v2h4v-2h-2v-2h2V9H9Z"/></svg>`;
}

export function iconNotification(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M8 1a1 1 0 0 0-1 1v.29A4 4 0 0 0 4 6v3l-1 2h4a1 1 0 0 0 2 0h4l-1-2V6a4 4 0 0 0-3-3.87V2a1 1 0 0 0-1-1Z"/></svg>`;
}

export function iconHealth(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M11 2H9V0H7v2H5v2h2v2h2V4h2V2Zm-3 6a5 5 0 0 0-5 5v2h10v-2a5 5 0 0 0-5-5Z"/></svg>`;
}

export function iconGroup(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><circle cx="5" cy="4" r="2"/><circle cx="11" cy="4" r="2"/><path d="M5 7a3 3 0 0 0-3 3v2h6v-2a3 3 0 0 0-3-3Zm6 0a3 3 0 0 0-2.46 1.28A4 4 0 0 1 10 12h4v-2a3 3 0 0 0-3-3Z"/></svg>`;
}

export function iconHome(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M8 1 1 6v9h5V9h4v6h5V6Z"/></svg>`;
}

export function iconEmail(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M14 3H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Zm-1.2 2L8 8 3.2 5Z"/></svg>`;
}

export function iconCat(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M4 1 2 5v3a6 6 0 0 0 12 0V5l-2-4-2 3H6Z"/><circle cx="6" cy="7" r="1"/><circle cx="10" cy="7" r="1"/></svg>`;
}
