# 🛠️ Fix Instructions — diet.swansi.site Login/Register Bug

## Context

The project is at `/var/www/diet-dashboard` (or wherever it's deployed on the server).
Stack: React + Vite frontend, Node.js + Express backend, PostgreSQL database, JWT auth with httpOnly cookies.
Domain: `diet.swansi.site`

## Problem Summary

When clicking **Create Account** or **Sign In** on the login page, nothing happens — no error, no redirect.

**Root Cause:** The production server (Nginx or similar) is serving the React app's `index.html` for ALL requests including `/api/*`. So when the frontend sends `POST /api/auth/register`, it gets back an HTML page (200 OK) instead of the expected JSON response. Axios treats this as success, the code finds no `accessToken` in the response, and silently fails.

**Two fixes are required:**
1. Fix the Node.js `server/index.js` — add an API catch-all guard
2. Fix the Nginx configuration — proxy `/api/*` to Node.js

---

## PART 1 — Code Changes (Apply on the Server in the project directory)

### Step 1 — Fix `server/index.js`

Open the file `server/index.js` and find this block near the bottom:

```js
// Serve React SPA in production
if (process.env.NODE_ENV === 'production') {
  const publicDir = join(__dirname, 'public')
  app.use(express.static(publicDir))
  app.get('*', (req, res) => res.sendFile(join(publicDir, 'index.html')))
}
```

**Replace it with:**

```js
// Serve React SPA in production
if (process.env.NODE_ENV === 'production') {
  const publicDir = join(__dirname, 'public')
  app.use(express.static(publicDir))
  // Explicit 404 for any unmatched /api/* route (prevents SPA fallback eating API calls)
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` })
  })
  // SPA fallback — only for non-API paths
  app.get('*', (req, res) => res.sendFile(join(publicDir, 'index.html')))
}
```

---

### Step 2 — Fix `client/src/context/AuthContext.jsx`

Open `client/src/context/AuthContext.jsx` and find the `login` and `register` functions:

```js
  const login = async (email, password) => {
    const res = await client.post('/auth/login', { email, password })
    setAccessToken(res.data.accessToken)
    setUser(res.data.user)
    return res.data.user
  }

  const register = async (email, password) => {
    const res = await client.post('/auth/register', { email, password })
    setAccessToken(res.data.accessToken)
    setUser(res.data.user)
    return res.data.user
  }
```

**Replace them with:**

```js
  const login = async (email, password) => {
    const res = await client.post('/auth/login', { email, password })
    if (!res.data?.accessToken || !res.data?.user) {
      throw new Error('Unexpected server response — API may be misconfigured.')
    }
    setAccessToken(res.data.accessToken)
    setUser(res.data.user)
    return res.data.user
  }

  const register = async (email, password) => {
    const res = await client.post('/auth/register', { email, password })
    if (!res.data?.accessToken || !res.data?.user) {
      throw new Error('Unexpected server response — API may be misconfigured.')
    }
    setAccessToken(res.data.accessToken)
    setUser(res.data.user)
    return res.data.user
  }
```

---

### Step 3 — Fix `client/src/components/auth/LoginScreen.jsx`

Open `client/src/components/auth/LoginScreen.jsx` and find the `handleSubmit` function:

```js
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (tab === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }
```

**Replace it with:**

```js
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      let user
      if (tab === 'login') {
        user = await login(email, password)
      } else {
        user = await register(email, password)
      }
      // Guard: if no user returned, the API returned unexpected data (e.g. HTML instead of JSON)
      if (!user) {
        setError('Server returned an unexpected response. Please check your connection and try again.')
      }
    } catch (err) {
      // Axios error with a JSON response body from the API
      if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else if (err.response?.status) {
        setError(`Server error (${err.response.status}). Please try again later.`)
      } else if (err.request) {
        // Request was made but no response received (network error / server down)
        setError('Cannot reach the server. Please check your internet connection.')
      } else {
        setError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }
```

---

### Step 4 — Rebuild the React Frontend

After making the code changes above, run this command from the project root directory:

```bash
npm run build
```

This will compile the React app and output it to `server/public/`.

---

## PART 2 — Nginx Configuration (Critical — Root Fix)

> ⚠️ **This is the primary fix.** Without this, all `/api/*` requests will continue returning HTML even after the code changes.

### Check your current Nginx config

```bash
cat /etc/nginx/sites-enabled/diet-dashboard
# or
cat /etc/nginx/sites-available/diet-dashboard
# or
ls /etc/nginx/conf.d/
```

### What the Nginx config MUST have

The `location /api/` block **must** appear before the `location /` block, and **must** proxy to the Node.js backend on port `3001`:

```nginx
server {
    listen 443 ssl http2;
    server_name diet.swansi.site;

    # SSL certs (Certbot manages these)
    ssl_certificate /etc/letsencrypt/live/diet.swansi.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/diet.swansi.site/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # ── CRITICAL: Proxy /api/* to Node.js Express backend ──
    location /api/ {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 300s;
        proxy_cookie_path / "/; SameSite=Lax; Secure";
    }

    # ── Proxy /uploads/* to Node.js as well ──
    location /uploads/ {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
    }

    # ── Serve React SPA static files ──
    root /var/www/diet-dashboard/server/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}

server {
    listen 80;
    server_name diet.swansi.site;
    return 301 https://$host$request_uri;
}
```

### Apply the Nginx fix

```bash
# Edit your nginx config file (adjust path if different)
sudo nano /etc/nginx/sites-available/diet-dashboard

# Test the config for syntax errors
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## PART 3 — Verify Node.js Server is Running

The Node.js Express backend must be running on port `3001` for Nginx to proxy to it.

### Check if it's running

```bash
pm2 list
# or
systemctl status diet-dashboard
# or
ps aux | grep node
```

### Check what's listening on port 3001

```bash
ss -tlnp | grep 3001
# or
lsof -i :3001
```

### Start / restart the server with PM2

```bash
cd /var/www/diet-dashboard
pm2 restart diet-dashboard
# or if not yet configured with PM2:
pm2 start "node server/index.js" --name diet-dashboard
pm2 save
pm2 startup
```

### Verify the `.env` file exists and has all required values

```bash
cat /var/www/diet-dashboard/.env
```

It must contain:

```env
PORT=3001
DATABASE_URL=postgres://user:password@localhost:5432/diet_dashboard
JWT_SECRET=<your-long-random-string>
JWT_REFRESH_SECRET=<another-long-random-string>
NODE_ENV=production
ALLOWED_ORIGINS=https://diet.swansi.site
```

If `.env` is missing or incomplete, create/edit it:

```bash
nano /var/www/diet-dashboard/.env
```

---

## PART 4 — Quick Verification Test

After applying all fixes, test the API directly from the server:

```bash
# Test that the API is reachable through Nginx
curl -X POST https://diet.swansi.site/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' \
  -v

# Expected: JSON response like {"accessToken":"...","user":{...}}
# Bad (old bug): HTML response starting with <!DOCTYPE html>
```

If you get JSON back — the fix is working. ✅
If you still get HTML — Nginx is not proxying `/api/` correctly. ❌

---

## PART 5 — Full Deployment Checklist

Run through these in order:

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Go to the project
cd /var/www/diet-dashboard

# 3. Pull latest code (the fixes are already in the repo)
git pull origin main

# 4. Install any new dependencies (if applicable)
npm install

# 5. Rebuild the React frontend
npm run build

# 6. Fix Nginx config (add /api/ proxy block if missing)
sudo nano /etc/nginx/sites-available/diet-dashboard

# 7. Test & reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# 8. Restart Node.js backend
pm2 restart diet-dashboard

# 9. Test the API endpoint directly
curl -X POST https://diet.swansi.site/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"healthcheck@test.com","password":"test1234"}' \
  -s | python3 -m json.tool

# 10. Open https://diet.swansi.site and try registering
```

---

## Summary of All Changes Made

| File | What Changed |
|------|-------------|
| `server/index.js` | Added explicit `/api/*` → 404 JSON guard before the SPA catch-all to prevent API routes being swallowed by `index.html` fallback |
| `client/src/context/AuthContext.jsx` | Added response validation in `login()` and `register()` — throws an error if the response doesn't contain `accessToken` + `user` |
| `client/src/components/auth/LoginScreen.jsx` | Improved error handling to catch all failure modes: JSON errors, HTTP status codes, network failures, and unexpected responses |
| `nginx.conf.example` | Added a full Nginx config example for reference |

The root cause was **Nginx not proxying `/api/*` to Node.js** — the browser was receiving the React `index.html` for every API call, axios got a silent `200 OK` with HTML content, and no error was shown to the user.
