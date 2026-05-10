import { describe, it, expect } from "vitest";
import { sanitizeHtmlToText } from "@/lib/jd/fetch";

describe("sanitizeHtmlToText", () => {
  it("strips tags", () => {
    expect(sanitizeHtmlToText("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });
  it("collapses whitespace", () => {
    expect(sanitizeHtmlToText("<p>foo</p>\n\n\n<p>  bar  </p>")).toBe("foo\nbar");
  });
  it("strips scripts and styles", () => {
    expect(sanitizeHtmlToText("<style>x { y: 1 }</style><p>visible</p><script>evil()</script>")).toBe("visible");
  });
});
