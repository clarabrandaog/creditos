// Splits a title into lines and works out a font size so each line fills the ticket width.
// Even lines are wide, odd lines condensed (see .ticket__title-line--wide / --narrow in ticket.css).

// Words of 1 or 2 letters join the next word, so "A Last Showing" becomes "A Last" and "Showing".
export function titleLines(title) {
  const lines = [];
  let carry = "";
  for (const word of title.split(" ")) {
    if ([...word].length <= 2) carry += `${word} `;
    else { lines.push(carry + word); carry = ""; }
  }
  if (carry.trim()) lines.push(carry.trim());
  return lines;
}

// widthPerChar is roughly how wide one capital letter is, as a fraction of the font size
export function fitLines(title) {
  return titleLines(title).map((text, i) => {
    const wide = i % 2 === 0;
    const widthPerChar = wide ? 0.8 : 0.48;
    return { text, wide, size: `min(30cqw, ${(100 / ([...text].length * widthPerChar)).toFixed(1)}cqw)` };
  });
}

// fitLines only estimates, so a line with wide letters (W, M) can run past the edge.
// Once the element is on the page, and again once the font has loaded, measure each line and
// scale it down to fit. Sizes stay relative to the container (cqw), so the fix holds at any width.
// spans are the rendered lines, in the same order as fitted.
export function shrinkToFit(heading, spans, fitted) {
  const fit = () => {
    if (!heading.isConnected) return;
    const room = heading.clientWidth;
    spans.forEach((span, i) => {
      span.style.fontSize = fitted[i].size;
      const needed = span.scrollWidth + 3;            // + the misprint offset
      if (needed > room) span.style.fontSize = `calc(${fitted[i].size} * ${(room / needed).toFixed(3)})`;
    });
  };
  requestAnimationFrame(fit);
  document.fonts?.ready.then(fit);
}
