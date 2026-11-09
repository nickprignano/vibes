# Putting Vibes on Cloudflare

Vibes is static files, served by Cloudflare Workers static assets with no Worker script.
[`wrangler.jsonc`](../wrangler.jsonc) names the Worker `vibes` and serves the repo folder;
[`.assetsignore`](../.assetsignore) leaves out the tests, tools and docs. There's no build step.

The owner does these steps in the Cloudflare dashboard. Nothing here needs a key or token in the
repo: Cloudflare's GitHub app deploys on each push to `main`.

## One-time setup

1. In the Cloudflare dashboard, open **Workers & Pages**, choose **Create application**, then
   **GitHub**.
2. Sign in to GitHub if asked, and pick `nickprignano/vibes`.
3. Settings:
   - **Project name**: `vibes`. It must match `name` in `wrangler.jsonc`, or the build fails.
   - **Production branch**: `main`.
   - **Build command**: leave empty.
   - **Deploy command**: `npx wrangler deploy` (the default).
   - **Root directory**: `/` (the default).
4. Choose **Save and Deploy**. When it finishes, Vibes is on the `vibes` `workers.dev` address the
   dashboard shows. Open it and watch a piece or two to check.
5. Add the domain: open the `vibes` Worker, then its **Domains** tab (older dashboards:
   **Settings**, **Domains & Routes**), **Add**, **Custom domain**, and enter `vibes.prignano.ai`. Cloudflare adds the DNS record and
   certificate itself, because the domain's zone is already on the account.
6. Optional: on the same tab, turn off the `workers.dev` address so Vibes
   has one home.
Vibes isn't a game, so it gets no /games card; prignano.ai's Projects list picks it up on its
own as a public repo.

## After that

Every merge to `main` deploys on its own. Other branches get preview builds if
**Settings**, **Builds** has non-production branch builds turned on. To roll back, open the
Worker's **Deployments** tab and pick an earlier version.

## Checking it

- `https://vibes.prignano.ai/` starts a piece at once, with the controls bar along the bottom.
- `https://vibes.prignano.ai/test/` and `/tools/` return 404 (left out by `.assetsignore`).
- The browser console shows no errors.

## Installing and watching offline (manual check)

Do this once after each build that changes the app, on a real phone (the spec keeps it out of CI):

1. Windows (Edge or Chrome): open the site and choose **Install** in the address bar (or the
   menu's **Apps**, **Install this site as an app**). iPhone or iPad: Safari, Share, **Add to
   Home Screen**. Android: Chrome, **Install app**.
2. Open the installed app once while online, then go offline (airplane mode, or unplug), close it
   and open it again. Pieces should still play.
3. Press F for full screen: the screen should stay on past the computer's sleep timeout while
   Keep screen on is lit. The installed app opens in its own window, not full screen, so F is
   needed each time.
4. After a new version is merged, reopen the app: the bar shows **Update**, which reloads into
   the new version.
