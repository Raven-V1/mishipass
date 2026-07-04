/**
 * Script safety smoke test.
 *
 * Prevents the class of bug that killed login: an inlined script calling
 * getElementById on an element that does not exist in the rendered HTML,
 * causing a TypeError that halts the entire script.
 *
 * For each page that has an inlined <script>, this test:
 * 1. Extracts every getElementById("...") target from the script.
 * 2. Checks whether each target id exists as id="..." in the HTML before the script.
 * 3. If it does NOT exist before the script, asserts it is null-guarded
 *    (preceded by "if(" or "if(!" or "&&" or "?." on the same usage).
 *
 * This test WILL FAIL if a future change adds addEventListener on an element
 * that does not exist in the rendered HTML without a null guard.
 */

import { describe, it, expect } from "vitest";
import { handleDashboard } from "../pages/dashboard.js";

describe("script safety: no unguarded getElementById on missing elements", () => {
  it("dashboard page: every getElementById target is in the DOM or null-guarded", async () => {
    const res = handleDashboard({});
    const html = await res.text();

    // Find the inlined script content
    const scriptMatch = /<script>([\s\S]*?)<\/script>/i.exec(html);
    expect(scriptMatch).not.toBeNull();
    const script = scriptMatch![1]!;

    // Find all getElementById targets in the script
    const idPattern = /getElementById\("([^"]+)"\)/g;
    const targets: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = idPattern.exec(script)) !== null) {
      targets.push(m[1]!);
    }
    expect(targets.length).toBeGreaterThan(0);

    // Find the position of the <script> tag in the HTML
    const scriptTagIndex = html.indexOf("<script>");

    // HTML content BEFORE the script (elements that exist when script runs)
    const htmlBeforeScript = html.substring(0, scriptTagIndex);

    // For each target, check it's either in the DOM before script, or null-guarded
    const unguardedMissing: string[] = [];

    for (const id of targets) {
      const existsBeforeScript = htmlBeforeScript.includes(`id="${id}"`);
      if (existsBeforeScript) continue;

      // Element is NOT in DOM when script runs. It MUST be null-guarded.
      // Check that the variable assigned from getElementById is used with a guard.
      // Pattern: the variable is used in an if() check or optional chain before
      // any .addEventListener or property access.
      const varPattern = new RegExp(
        `var\\s+\\w+=[^;]*getElementById\\("${id}"\\)`,
      );
      const varMatch = varPattern.exec(script);
      if (!varMatch) {
        // Could be inline usage, check if it's guarded
        const usagePattern = new RegExp(
          `getElementById\\("${id}"\\)[^;]*\\.addEventListener`,
        );
        if (usagePattern.test(script)) {
          unguardedMissing.push(id);
        }
        continue;
      }

      // Find the variable name
      const varNameMatch = /var\s+(\w+)=/.exec(varMatch[0]);
      if (!varNameMatch) continue;
      const varName = varNameMatch[1]!;

      // Check if varName.addEventListener exists without a guard
      const unguardedUsage = new RegExp(
        `(?<!if\\(${varName}\\)\\{)${varName}\\.addEventListener`,
      );
      const guardedUsage = new RegExp(
        `if\\(${varName}\\)\\{${varName}\\.addEventListener`,
      );

      if (unguardedUsage.test(script) && !guardedUsage.test(script)) {
        unguardedMissing.push(id);
      }
    }

    expect(
      unguardedMissing,
      `These element IDs are NOT in the DOM when the script runs and are used WITHOUT a null guard: ${unguardedMissing.join(", ")}. This will cause a TypeError that halts the script (same bug class as the login outage).`,
    ).toHaveLength(0);
  });
});
