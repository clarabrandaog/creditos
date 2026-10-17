// Small pure helpers. No DOM in here.

// lowercase and strip accents, so "lucia" matches "Lúcia"
export const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// sort rows A to Z by .name
export const sortByName = rows => rows.slice().sort((a, b) => a.name.localeCompare(b.name, "en"));

// the item with the highest key, or undefined for an empty list
export const latest = (list, key) => list.slice().sort((a, b) => (key(a) < key(b) ? 1 : -1))[0];

// "2026-09-12" -> "12 Sep 2026". Fixed month names, so it reads the same in every browser and locale.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const formatDate = iso => {
  const [year, month, day] = iso.split("-");
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
};

// A full http(s) address as a URL, otherwise null, so a bad value in the data never becomes a javascript: link.
export function safeLink(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed : null;
  } catch { return null; }
}
