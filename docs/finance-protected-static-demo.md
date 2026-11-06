# Protected static Finance demonstration

6 November 2026. A separate production static entry reuses the fictional Preview
providers/screens without importing operational App, authentication, API clients
or live stores. The existing operational production Preview restriction in
`src/App.tsx` is unchanged. Setting a Preview flag does not enable it in production.

## Build and validate

```
npm ci
npm run build
npm run build:finance-demo
npm run check:finance-demo
```

The demo build uses `finance-demo.html`, `src/finance-demo/main.tsx` and
`vite.finance-demo.config.ts`, then renames only its generated HTML to index.html
under `dist-finance-demo`. The operational dist/index.html is untouched. A bundle
graph guard rejects operational src/context, src/lib, App and Axios dependencies.
The demo config does not load .env files and does not expose VITE variables.

The page has no Google font or external resource dependency. CSP blocks connect
requests, form submission, plugins and base URL changes. The browser check covers
all 22 routes at desktop/mobile widths, explicit entry/reset on reload, token
preservation, disabled financial actions and no API/external network requests.
Only source assets and fictional session data are used. Do not enter client data.

## Hosting approval gate

Do not expose the demo before server/hosting-level authentication is configured.
The static entry is NOT an authentication mechanism. Use a separate protected
project/domain, never the operational deployment or production alias. No Django
or ERPNext service, database, secret, integration gate or migration is required.

For Vercel, use a separate project linked to the reviewed frontend branch:

- Build command: `npm run build:finance-demo`.
- Output directory: `dist-finance-demo`.
- Dedicated config: `vercel.finance-demo.json`, selected explicitly (CLI supports
  `--local-config vercel.finance-demo.json`); do not overwrite operational vercel.json.
- Enable deployment protection for the demo's preview URLs AND any demo production
  alias/custom domain before upload/sharing. Require approved client identities or
  an approved access mechanism; do not distribute protection-bypass links/tokens.
- No environment secrets or operational API URL. Confirm the dedicated config and
  CSP headers apply on the exact client URL; no third-party scripts are required.
- Anonymous/incognito requests must be denied before HTML, JS and assets. Verify
  both root and direct `/finance/preview/...` links cannot bypass protection.
- Authorized client accepts the Demo Data gate; posting, approval, activation,
  synchronization, bank connection and exports stay disabled. Drafts reset on reload.

Once hosting and deployment are separately approved, a deployment operator can
use the reviewed hosting CLI with `--local-config vercel.finance-demo.json` in
this separate project. No deployment command was executed in this batch.
After acceptance, record the frontend commit and deployment ID and retire access
after the demonstration. Roll back by disabling the demo deployment/alias; no
backend or accounting rollback is necessary.

The HTML CSP is defense in depth; frame-ancestors and full response policy must be
applied as response headers, as shown in the dedicated hosting configuration.
Hosting features and client access entitlement must be verified in the actual
account before deployment. Do not serve Vite dev/preview as the hosted application.
