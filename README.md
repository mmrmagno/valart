<div align="center">
  <img src="public/favicon.svg" width="56" alt="VALART logo">
  <h1>VALART</h1>
  <p>ASCII art for Valorant chat: draw it, copy it, get it into the gallery.</p>
  <p><a href="https://val.marc-os.com">val.marc-os.com</a></p>
</div>

## What it does

- **Draw** on a grid sized for Valorant chat (26 columns for FHD, 27 for stretched, up to 13 lines).
  Mouse, touch, pen and keyboard all work. Undo and redo with Ctrl+Z / Ctrl+Y.
- **Copy** the result and paste it straight into chat, or download it as text.
- **Submit** it to the gallery. No account needed: a submission becomes a pull request on this repo,
  and it appears on the site once it is merged.

## How it works

The site is static: [Astro](https://astro.build) renders the gallery from `src/content/gallery/*.json`
at build time, and the drawing tool is a small React island. nginx serves the result.

Submissions go to a tiny Go service in `submit/`. It checks a Cloudflare Turnstile token, validates the
art, rate limits, and opens a pull request through a GitHub App that can only write to this repository.
Merging the PR publishes the art: CI builds a new image and the deployment picks it up.

```
src/content/gallery/   one JSON file per artwork, schema-checked at build
src/pages/             gallery, /art/<id>, /create, 404
src/components/        Creator.tsx (the drawing tool), ArtCard, Header, Footer
submit/                the submission service (Go, standard library only)
infra/                 nginx config and security headers
```

## Adding art by hand

Add a file to `src/content/gallery/`:

```json
{
  "name": "Apple head",
  "author": "Marc",
  "art": "░░█░░\n░███░",
  "gridSize": { "width": 5, "height": 2 },
  "submittedAt": "2025-05-20T16:06:23.722Z"
}
```

The build fails on a malformed file, so a broken entry can never take the site down.

## Development

```sh
pnpm install
pnpm dev          # http://localhost:4321
pnpm check        # type check
pnpm build        # static site in dist/

cd submit && go test -race ./...
```

`PUBLIC_TURNSTILE_SITE_KEY` turns on the submit form at build time. Without it the form explains that
submissions are closed and everything else works.

## License

MIT, see [LICENSE](LICENSE). Not affiliated with Riot Games.
