// Tiny element builder, so components read like markup and never use innerHTML.
//   h("li", { class: "entry", hidden: true, onclick: fn, dataset: { t: "x" }, style: { color: "red" } }, "text", childEl, [moreChildren])
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key.startsWith("on")) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key === "style") Object.assign(el.style, value);
    else el.setAttribute(key, value === true ? "" : value);
  }
  el.append(...children.flat().filter(child => child != null && child !== false));
  return el;
}
