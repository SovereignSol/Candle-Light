# Setup

## 1) GitHub Pages
- Create a new repo and add these files with the same folder structure.
- Repo Settings -> Pages -> Deploy from branch -> main / (root).

## 2) Supabase
- Create a new Supabase project.
- Authentication -> Providers: enable Email (OTP/magic link).
- Authentication -> URL Configuration:
  - Site URL: your GitHub Pages origin (example: https://YOURNAME.github.io)
  - Add Redirect URLs for the same origin (and /index.html).

## 3) Database
- Run `/supabase/schema.sql` in Supabase SQL Editor.

## 3.1) Storage bucket (for sticker images)
- Create a Storage bucket named `stickers`.
- Upload sticker image files and store their relative file path in `stickers.image_path`.

## 4) App config
- Put your Supabase Project URL and anon key into `/js/config.js`.

## 5) Add members
- After each person signs in once, add their `auth.users.id` into `app_members`.
- Until a user is listed in `app_members`, RLS will block reads and writes.

## 6) Pages
- Primary app page: `/pages/rewards.html`.
- Home entry: `/index.html`.
