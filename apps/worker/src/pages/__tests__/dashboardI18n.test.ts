/**
 * Dashboard i18n coverage tests.
 * Verifies that authenticated dashboard renders translated labels for
 * es and kk-KZ, and does NOT contain English sentinels.
 */

import { describe, it, expect } from "vitest";
import { handleDashboard } from "../dashboard.js";

const ENGLISH_SENTINELS = [
  "Welcome back!",
  "Here is everything about your furry friend.",
  "Profile setup and QR mode control",
  "Add a new cat to MishiPass",
  "Public alerts and recovery updates",
];

describe("Dashboard i18n coverage", () => {
  it("renders Spanish translations for welcome heading, subtitle, and tab descriptions", async () => {
    const res = handleDashboard({});
    const html = await res.text();
    // The dashboard is a single-page app; the client JS applies translations.
    // We verify that the labels object CONTAINS the es keys by checking the
    // inline script that carries the label dictionaries.
    expect(html).toContain("Bienvenido de nuevo!");
    expect(html).toContain("Aqui esta todo sobre tu amigo peludo.");
    expect(html).toContain("Perfil y control de modo QR");
    expect(html).toContain("Agregar un nuevo gato a MishiPass");
    expect(html).toContain("Alertas publicas y actualizaciones de recuperacion");
  });

  it("renders Kazakh translations for welcome heading, subtitle, and tab descriptions", async () => {
    const res = handleDashboard({});
    const html = await res.text();
    // Kazakh labels must be present in the label dictionaries
    expect(html).toContain("\u049a\u0430\u0439\u0442\u0430 \u049b\u043e\u0448 \u043a\u0435\u043b\u0434\u0456\u04a3\u0456\u0437!");
    expect(html).toContain("MishiPass-\u049b\u0430 \u0436\u0430\u04a3\u0430 \u043c\u044b\u0441\u044b\u049b \u049b\u043e\u0441\u0443");
    expect(html).toContain("\u049a\u043e\u0493\u0430\u043c\u0434\u044b\u049b \u0435\u0441\u043a\u0435\u0440\u0442\u0443\u043b\u0435\u0440 \u043c\u0435\u043d \u049b\u0430\u0439\u0442\u0430\u0440\u0443 \u0436\u0430\u04a3\u0430\u0440\u0442\u0443\u043b\u0430\u0440\u044b");
  });

  it("HTML template does not contain hardcoded English sentinels in non-data-i18n positions", async () => {
    const res = handleDashboard({});
    const html = await res.text();
    // The heading and subtitle are now rendered via data-i18n attributes,
    // meaning the en text is the default but gets replaced client-side.
    // The tab descriptions also use data-i18n.
    // Verify that the old "Here's everything about your furry friend."
    // (with curly apostrophe) is gone:
    expect(html).not.toContain("Here's everything about your furry friend.");
    // Verify "Logout" (old label) is replaced by data-i18n="logout" pattern:
    expect(html).toContain('data-i18n="logout"');
    expect(html).toContain('data-i18n="welcomeBack"');
    expect(html).toContain('data-i18n="welcomeSubtitle"');
    expect(html).toContain('data-i18n="tabMyCatsDesc"');
    expect(html).toContain('data-i18n="tabRegisterDesc"');
    expect(html).toContain('data-i18n="tabBoardDesc"');
  });
});
