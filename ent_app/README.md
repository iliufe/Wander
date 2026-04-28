# Wander Web

Wander is now set up as a single-service web app:

- `npm run build` creates the frontend bundle in `dist/`
- `npm start` serves both the React app and the `/api` endpoints from `server/index.mjs`
- client-side routes such as `/routes`, `/community`, and `/profile` fall back to `index.html`

## Local Development

Install dependencies first if needed:

```powershell
npm install
```

Start the split development stack:

```powershell
npm run dev
```

That runs:

- Vite on `http://localhost:5173`
- the API server on `http://localhost:8788`

## Local Production Check

Build the frontend and run the single-service server:

```powershell
npm run build
npm start
```

Open:

```text
http://localhost:8788
```

Health check:

```text
http://localhost:8788/api/health
```

## Environment Variables

Create `.env.server.local` for local-only secrets:

```env
WANDER_API_PORT=8788
DASHSCOPE_API_KEY=your_dashscope_key
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_INTENT_MODEL=qwen-plus
AMAP_WEB_SERVICE_KEY=your_amap_web_service_key
VITE_AMAP_JS_KEY=your_amap_javascript_key
VITE_AMAP_SECURITY_JSCODE=your_amap_security_jscode
```

For production, set these in your hosting platform dashboard instead of committing them.

## Deploy As One Service

This repo is ready for Node web platforms such as Render or Railway.

- Build command: `npm run build`
- Start command: `npm start`
- Health check path: `/api/health`

Required production env vars:

- `DASHSCOPE_API_KEY`
- `DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1`
- `QWEN_INTENT_MODEL=qwen-plus`
- `AMAP_WEB_SERVICE_KEY`
- `VITE_AMAP_JS_KEY`
- `VITE_AMAP_SECURITY_JSCODE`
- `WANDER_BASIC_AUTH_USER` optional, recommended for internal testing
- `WANDER_BASIC_AUTH_PASSWORD` optional, recommended for internal testing
- `WANDER_USER_DB_PATH=./data/wander-users.json` optional file path for the first user database

If your platform provides `PORT`, `server/index.mjs` will use it automatically.

## User Database

Wander now has backend auth endpoints and a server-side user database:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/session`
- `PATCH /api/auth/profile`
- `POST /api/auth/logout`

Passwords are stored as PBKDF2 hashes, not plain text, and the browser receives an HttpOnly session cookie.

The default local database file is:

```text
data/wander-users.json
```

This `data/` folder is ignored by Git so user accounts are not committed. For Render, attach a persistent disk and set `WANDER_USER_DB_PATH` to a path on that disk if you need accounts to survive redeploys and instance restarts. For a larger public launch, replace this file-backed store with Postgres/Supabase, keeping the same auth API shape.

## Deploy To Render

This repo now includes [`render.yaml`](./render.yaml), so you can deploy it as a single Node web service.

1. Push this `ent_app` folder to GitHub.
2. In Render, create a new Blueprint deploy from that repo.
3. If the repository root contains this app as a subfolder, set the Blueprint path to `ent_app/render.yaml`. The service uses `rootDir: ent_app` so Render runs build/start commands inside the app folder.
4. Set these environment variables in Render:
   - `DASHSCOPE_API_KEY`
   - `AMAP_WEB_SERVICE_KEY`
   - `VITE_AMAP_JS_KEY`
   - `VITE_AMAP_SECURITY_JSCODE`
5. Click deploy.
6. After Render finishes, open the generated URL such as:

```text
https://wander-web.onrender.com
```

Your homepage, routes page, and `/api/health` will all come from the same deployed service.

## Internal Test Website With A Domain

For the first internal test, the simplest path is Render Blueprint deployment plus a custom domain.

1. Push this project to GitHub. Do not commit `.env.local` or `.env.server.local`; they are already ignored by `.gitignore`.
2. In Render, create a Blueprint from `ent_app/render.yaml`, or create a Node web service manually with Root Directory set to `ent_app`.
3. Set the production environment variables in Render. Use dashboard secrets, not files in the repo.
4. Set `WANDER_BASIC_AUTH_USER` and `WANDER_BASIC_AUTH_PASSWORD` if you want the whole site protected by a browser password prompt.
5. Deploy and confirm `https://your-render-url/api/health` returns `ok: true`.
6. In Render, add your custom domain, for example `test.yourdomain.com`.
7. In your domain DNS provider, add the CNAME record that Render shows for that custom domain.
8. Wait for DNS and HTTPS certificate activation, then open `https://test.yourdomain.com`.
9. In the AMap/Gaode console, add the deployed domain to the JavaScript Web key security settings. Include both the Render URL and your custom domain while testing.

Important production notes:

- `VITE_AMAP_JS_KEY` and `VITE_AMAP_SECURITY_JSCODE` are baked into the frontend during `npm run build`, so changing them requires a redeploy.
- `AMAP_WEB_SERVICE_KEY` and `DASHSCOPE_API_KEY` are used by the Node server; changing them in Render usually requires a service restart or redeploy.
- If Basic Auth is enabled, share the domain plus the Basic Auth account/password with internal testers before they use the app login page.
