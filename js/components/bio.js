import { h } from "../lib/dom.js";
import { safeLink } from "../lib/utils.js";

// A person's short bio and their one link, side by side and bottom-aligned (stacked on a phone). text: blank lines start a new paragraph.
// The link is labelled with its site name ("example.com"). Returns null when there is nothing to show.
export function Bio({ text, link }) {
  const url = link && safeLink(link);
  const paragraphs = (text ?? "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (!paragraphs.length && !url) return null;
  return h("section", { class: "bio", "aria-label": "About" },
    paragraphs.length > 0 && h("div", { class: "bio__text" }, paragraphs.map(p => h("p", {}, p))),
    url && h("a", { class: "link-btn bio__link", href: url.href, target: "_blank", rel: "noopener noreferrer" },
      `${url.hostname.replace(/^www\./, "")} ↗`));
}
