# Lightwell Rewards

Lightwell Rewards is a static web app powered by Supabase Auth, Postgres, Storage, and Realtime.

## Features

- Rewards hub page with tabs for Purchase Requests, Allowance, Sticker Book, and Wishlist
- Role-aware actions (`owner` and `member`) enforced by RLS policies
- Realtime updates for purchase requests, allowance ledger, stickers, and grocery list
- Optional web push notification registration (Android + iPhone PWA)
- Static hosting friendly (GitHub Pages) with no build tool required

## Project layout

- `index.html` - app entry page
- `pages/rewards.html` - main rewards experience
- `pages/*.html` - additional standalone pages
- `js/auth.js` - auth/session UI and redirects
- `js/ui.js` - shared toast and modal utilities
- `js/push.js` - browser push subscription flow
- `js/rewards/*.js` - rewards page modules
- `supabase/schema.sql` - starter DB schema, triggers, and RLS policies

## Run locally

This project is static. You can run it with any local static server.

Example with Python:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Configure Supabase

1. Create a Supabase project.
2. Enable Email auth provider.
3. Configure Site URL and Redirect URLs for your deployment URL.
4. Run `supabase/schema.sql` in SQL Editor.
5. Update `js/config.js` with your project URL and anon key.
6. Add your VAPID public key to `js/config.js` (`VAPID_PUBLIC_KEY`).
7. Have each user sign in once, then add their `auth.users.id` to `app_members`.

See `docs/SETUP.md` for the deployment-oriented version of these steps.
For push setup, see `docs/PUSH_NOTIFICATIONS.md`.
