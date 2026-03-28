# Zen Bloom Playable Ad

Static mobile-first playable ad for a cozy puzzle game concept.

## Files

- `index.html`: main playable shell and end card
- `styles.css`: visual design, layout, and animations
- `script.js`: puzzle logic, tutorial flow, hinting, and CTA behavior

## Local Run

Serve the folder with any static server, for example:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## Production Hookups

- Replace the `Install Now` button behavior in `script.js` with the real app store URL or MMP CTA.
- If your ad network requires a single-file bundle, inline `styles.css` and `script.js` into `index.html`.
