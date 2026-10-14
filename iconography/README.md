# LuchoAI iconography

Leaf-style icons that replace the emojis used across the app.

- `leaf/` has one SVG per icon (48 files, 24×24 viewBox).
- `icons.json` maps each emoji to its icon file and what it stands for.
- `index.html` is a review sheet (open it in a browser). `index.png` is a screenshot of it.
- `proposals/` holds the earlier style explorations. They are not used by the app.

## Rules

- A white leaf badge, tilted a different amount per icon, with a green duotone glyph at 50% scale.
- Each glyph is centred on the largest circle that fits inside its leaf, not on the 24×24 box.
  Align icons by the leaf when placing them in a row.
- Colours are fixed (`#1a7f3c` on white). The leaf works on dark backgrounds as it is white.
- Use at 28px or larger. Below that the brain, ball and faces lose detail.
- Mood faces differ by eyes and mouth, not colour. Keep a text label next to them.
- Icons are decorative when a label sits beside them: use `aria-hidden="true"`. An icon-only
  button needs an `aria-label` on the button.

## Not replaced

`→ ← ↑ ✓ ✗` are typographic characters, not emojis, so they stay as text.
`smile-happy` is a spare face that no emoji maps to.
