# Push Notifications (Android + iPhone)

This project supports Web Push notifications using:
- Service Worker (`/sw.js`)
- Browser Push API (`/js/push.js`)
- Supabase table `push_subscriptions` for subscription storage

## Compatibility

- Android: Chrome/Edge (installed or browser mode)
- iPhone: iOS/iPadOS 16.4+ with app added to Home Screen (PWA install required)

## 1) Apply database schema

Run `supabase/schema.sql` in Supabase SQL Editor, or at minimum run the `push_subscriptions` table and policy section.

## 2) Generate VAPID keys

Use any Web Push key generator (example with `web-push` npm package):

```bash
npx web-push generate-vapid-keys
```

Save both keys. Put the **public key** into `js/config.js`:

```js
VAPID_PUBLIC_KEY: "YOUR_PUBLIC_VAPID_KEY"
```

Keep the private key secret (server-side only).

## 3) Enable notifications in app

1. Open the app and sign in.
2. On `index.html`, click **Enable Notifications**.
3. Accept the browser permission prompt.
4. A row is saved in `push_subscriptions`.

## 4) iPhone specific setup

1. Open your deployed URL in Safari.
2. Tap Share -> **Add to Home Screen**.
3. Launch the installed app from Home Screen.
4. Enable notifications from within the app.

## 5) Send notifications (server-side)

You need a backend job/function to send push payloads using the private VAPID key.
Typical flow:
- Query `push_subscriptions` for target user.
- Send push payload to each endpoint.
- Remove invalid subscriptions (410/404 responses).

## Payload shape supported by current service worker

```json
{
  "title": "Lightwell Rewards",
  "body": "New update",
  "url": "./pages/rewards.html",
  "icon": "./icons/tab_purchase.webp",
  "badge": "./icons/tab_purchase.webp"
}
```
