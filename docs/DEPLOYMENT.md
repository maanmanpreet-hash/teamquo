# Deployment

## Required environment

Set these in the deployment environment:

- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`
- `VITE_OAUTH_PORTAL_URL`
- `OWNER_OPEN_ID`
- `OWNER_NAME`
- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`
- `VITE_FRONTEND_FORGE_API_KEY`
- `VITE_FRONTEND_FORGE_API_URL`

Production must have a real `DATABASE_URL`.

If `DATABASE_URL` is missing, the app falls back to preview mode. Preview mode is only for local development and must not be used for deployment.

## Build and start

- Install: `pnpm install`
- Build: `pnpm build`
- Start: `pnpm start`

`pnpm start` runs the bundled server from `dist/index.js` with `NODE_ENV=production`.

## Pre-deploy checks

- `pnpm check`
- `pnpm test`
- `pnpm build`

## Notes

- Local preview quote persistence uses `.preview-quotes.json`. That file is ignored and should not be deployed.
- Customer quote data depends on the database. Confirm migrations are applied before first production use.
