import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LinkedText } from "./LinkedText";

const html = (text: string) => renderToStaticMarkup(<LinkedText text={text} />);
const A = (href: string, label: string) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;

describe("LinkedText", () => {
  it("shows a Markdown link by its label", () => {
    expect(html("See [Full summary](https://www.example.org/plans/x) now")).toBe(
      `See ${A("https://www.example.org/plans/x", "Full summary")} now`,
    );
  });

  it("links a bare address and leaves trailing punctuation as text", () => {
    expect(html("Read https://example.com/a.")).toBe(`Read ${A("https://example.com/a", "https://example.com/a")}.`);
  });

  it("never links anything but a web address", () => {
    expect(html("[x](javascript:alert(1)) plain")).toBe("[x](javascript:alert(1)) plain");
  });

  it("escapes the text around links", () => {
    expect(html("<b>hi</b>")).toBe("&lt;b&gt;hi&lt;/b&gt;");
  });
});
