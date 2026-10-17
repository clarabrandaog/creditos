import { h } from "../lib/dom.js";
import { HOLD_MS } from "../config.js";

// Press and hold (pointer, or Space/Enter) for `ms`. The fill follows the CSS variable --p.
// Letting go early resets it. onComplete() runs once the hold finishes.
export function HoldButton({ label, ariaLabel, hint = "Press and hold to stamp", ms = HOLD_MS, onComplete }) {
  const button = h("button", { class: "hold-button", type: "button", "aria-label": ariaLabel ?? label },
    label, h("span", { class: "hold-button__hint" }, hint));
  let frame = 0, startedAt = 0, active = false;

  const setProgress = p => button.style.setProperty("--p", p);
  const stop = () => {
    if (!active) return;
    cancelAnimationFrame(frame);
    active = false;
    setProgress(0);
  };
  const step = () => {
    if (!button.isConnected) { stop(); return; }          // the view changed mid-hold
    const p = Math.min((performance.now() - startedAt) / ms, 1);
    setProgress(p);
    if (p < 1) { frame = requestAnimationFrame(step); return; }
    active = false;
    onComplete();
  };
  const start = () => {
    if (active) return;
    active = true;
    startedAt = performance.now();
    frame = requestAnimationFrame(step);
  };

  button.addEventListener("pointerdown", e => { e.preventDefault(); start(); });
  ["pointerup", "pointerleave", "pointercancel", "blur"].forEach(type => button.addEventListener(type, stop));
  button.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); start(); } });
  button.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") stop(); });
  button.addEventListener("contextmenu", e => e.preventDefault());
  return button;
}
