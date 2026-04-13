// ── Colour helpers for node background styling ─────────────────────────────

/** Darken a #rrggbb hex colour by `amount` (0–1). */
function darkenHex(hex, amount = 0.3) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const dr = Math.max(0, Math.round(r * (1 - amount)))
  const dg = Math.max(0, Math.round(g * (1 - amount)))
  const db = Math.max(0, Math.round(b * (1 - amount)))
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`
}

function sRGBtoLinear(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** WCAG relative luminance of a #rrggbb hex colour. */
function getLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b)
}

/**
 * Given a custom background hex colour, returns an inline style object that:
 *  - Sets `background` to the colour
 *  - Sets `borderColor` to a 30%-darkened shade
 *  - Overrides `--text` / `--text-muted` / `--accent-dim` CSS vars for readability
 * Returns undefined when `color` is falsy so nodes fall back to CSS-variable defaults.
 */
export function getNodeStyle(color) {
  if (!color) return undefined
  const lum = getLuminance(color)
  const dark = lum > 0.5
  return {
    background: color,
    borderColor: darkenHex(color),
    '--text':      dark ? '#1a1820' : '#e8e4dc',
    '--text-muted': dark ? '#4a4855' : '#7a7585',
    '--accent-dim': dark ? '#6a5030' : '#7a6440',
    '--node-border-shadow': darkenHex(color, 0.5),
  }
}

// ── Detail-content helper ──────────────────────────────────────────────────

/**
 * Returns true if a detailContent JSON string contains any non-whitespace text.
 * A freshly-created TipTap doc (empty paragraph) returns false.
 */
export function hasDetailContent(detailContent) {
  if (!detailContent) return false
  try {
    const doc = JSON.parse(detailContent)
    const hasText = (nodes) =>
      nodes?.some(
        (n) =>
          (n.type === 'text' && n.text?.trim().length > 0) ||
          hasText(n.content)
      ) ?? false
    return hasText(doc.content)
  } catch {
    return false
  }
}
