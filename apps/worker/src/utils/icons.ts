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

export function iconGlobe(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm5 6H9.5A12 12 0 0 0 9 3.3 5 5 0 0 1 13 7ZM8 3.1c.3.6.6 1.9.7 3.9H7.3c.1-2 .4-3.3.7-3.9ZM3 9h3.5c.1 1.4.3 2.7.6 3.7A5 5 0 0 1 3 9Zm3.5-2H3a5 5 0 0 1 4.1-3.7A12 12 0 0 0 6.5 7ZM8 12.9c-.3-.6-.6-1.9-.7-3.9h1.4c-.1 2-.4 3.3-.7 3.9ZM8.9 12.7c.3-1 .5-2.3.6-3.7H13a5 5 0 0 1-4.1 3.7Z"/></svg>`;
}

export function iconLogout(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M7 2H2v12h5v-2H4V4h3V2Zm4.6 2.6L10.2 6H6v2h4.2l1.4 1.4L15 7Z"/></svg>`;
}

export function iconShield(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M8 1 2 3v4c0 3.7 2.4 6.7 6 8 3.6-1.3 6-4.3 6-8V3Zm0 2.1 4 1.3V7c0 2.6-1.5 4.7-4 5.8C5.5 11.7 4 9.6 4 7V4.4Z"/></svg>`;
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

export function iconMegaphone(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M13 2 6 5H2v5h2l1 4h2l-1-4 7 3Zm-2 3v5L6 8V7Z"/></svg>`;
}

export function iconHealth(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M11 2H9V0H7v2H5v2h2v2h2V4h2V2Zm-3 6a5 5 0 0 0-5 5v2h10v-2a5 5 0 0 0-5-5Z"/></svg>`;
}

export function iconStethoscope(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M3 1h2v2H4v4a2 2 0 1 0 4 0V3H7V1h2v6a4 4 0 0 1-3 3.87V12a2 2 0 0 0 4 0v-1a3 3 0 1 1 2 0v1a4 4 0 0 1-8 0v-1.13A4 4 0 0 1 2 7V3H1V1Zm9 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/></svg>`;
}

export function iconGroup(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><circle cx="5" cy="4" r="2"/><circle cx="11" cy="4" r="2"/><path d="M5 7a3 3 0 0 0-3 3v2h6v-2a3 3 0 0 0-3-3Zm6 0a3 3 0 0 0-2.46 1.28A4 4 0 0 1 10 12h4v-2a3 3 0 0 0-3-3Z"/></svg>`;
}

export function iconHome(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M8 1 1 6v9h5V9h4v6h5V6Z"/></svg>`;
}

export function iconHeart(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M8 14 2.6 8.6A3.2 3.2 0 0 1 7 4.1L8 5l1-1a3.2 3.2 0 0 1 4.4 4.6Z"/></svg>`;
}

export function iconGift(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M14 5h-2.3A2.5 2.5 0 0 0 8 2.1 2.5 2.5 0 0 0 4.3 5H2v3h1v6h10V8h1Zm-4.7-1.5c.5 0 .9.4.9.9s-.4.9-.9.9H8V4.4c.2-.6.7-.9 1.3-.9Zm-2.6 0c.6 0 1.1.3 1.3.9v.9H6.7c-.5 0-.9-.4-.9-.9s.4-.9.9-.9ZM5 8h2v4H5Zm4 0h2v4H9Z"/></svg>`;
}

export function iconPrint(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M4 1h8v3H4Zm8 8v6H4V9Zm2-4H2a1 1 0 0 0-1 1v4h3V8h8v2h3V6a1 1 0 0 0-1-1Z"/></svg>`;
}

export function iconEmail(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M14 3H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Zm-1.2 2L8 8 3.2 5Z"/></svg>`;
}

export function iconSettings(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M9 1H7l-.4 2a5 5 0 0 0-1 .4L3.9 2.2 2.2 3.9l1.2 1.7a5 5 0 0 0-.4 1L1 7v2l2 .4c.1.4.2.7.4 1l-1.2 1.7 1.7 1.7 1.7-1.2c.3.2.6.3 1 .4L7 15h2l.4-2c.4-.1.7-.2 1-.4l1.7 1.2 1.7-1.7-1.2-1.7c.2-.3.3-.6.4-1L15 9V7l-2-.4a5 5 0 0 0-.4-1l1.2-1.7-1.7-1.7-1.7 1.2a5 5 0 0 0-1-.4Zm-1 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/></svg>`;
}

export function iconContact(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M2 2h12v12H2Zm2 2v8h8V4Zm2 1h4v2H6Zm0 3h4v1H6Zm0 2h3v1H6Z"/></svg>`;
}

export function iconCamera(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M6 2 5 4H2v10h12V4h-3l-1-2Zm2 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/></svg>`;
}

export function iconTrash(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M6 1h4l1 2h3v2H2V3h3Zm-2 5h8l-.6 9H4.6Z"/></svg>`;
}

export function iconGoogle(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="${size}" height="${size}" aria-hidden="true"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.1-.2-1.6H9v3.1h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.8c1.7-1.5 2.8-3.8 2.8-6.4Z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.8-2.2c-.8.5-1.8.8-3.2.8a5.5 5.5 0 0 1-5.2-3.8H.9v2.3A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.8 10.6a5.4 5.4 0 0 1 0-3.4V4.9H.9a9 9 0 0 0 0 8Z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15 2.3A8.9 8.9 0 0 0 9 0 9 9 0 0 0 .9 4.9l2.9 2.3A5.5 5.5 0 0 1 9 3.6Z"/></svg>`;
}

export function iconApple(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M11.4 8.4c0-1.7 1.4-2.5 1.5-2.6-.8-1.1-2-1.3-2.4-1.3-1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6c-1.1 0-2.2.7-2.8 1.7-1.2 2.1-.3 5.2.9 6.9.6.8 1.3 1.8 2.2 1.7.9 0 1.2-.6 2.2-.6s1.3.6 2.2.6c.9 0 1.5-.8 2.1-1.7.7-1 1-2 1-2-.1 0-2.2-.8-2.2-2.7ZM9.9 3.4c.5-.6.8-1.4.7-2.2-.7 0-1.5.5-2 1.1-.4.5-.8 1.4-.7 2.1.8.1 1.5-.4 2-1Z"/></svg>`;
}

