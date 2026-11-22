# Ninja Cat: Shadow Run

A complete, production-ready 2D Japanese pixel-art platform runner built with **Next.js 15**, **TypeScript**, **Phaser 3**, **Tailwind CSS**, **Supabase**, and the **Telegram WebApp SDK**.

## Features
- **Custom 24-Frame Pixel-Art Character Spritesheet (`64x64` per frame):** Idle, 6-frame Run, Jump, Fall, Land, Hurt/Damage, Death, and Coin Collection states faithful to the orange tabby Ninja Cat reference.
- **3 Dynamic Japanese Biomes with 4-Layer Parallax:** Moonlit Temple, Sakura Dawn, and Emerald Bamboo with Mount Fuji silhouettes, pagodas, torii gates, cherry blossoms, and glowing lanterns.
- **Responsive Mobile & Desktop Controls:** Single tap / click / `SPACE` / `UP` for jump and double-jump, touch-scroll locking, and Telegram `BackButton` support.
- **Real Supabase Backend & Anti-Cheat:** HMAC-SHA256 verification of Telegram `initData`, signed session tokens, server-side physics/score validation, and PostgreSQL Row Level Security.

## Quick Start (Local / Termux)
```bash
cp .env.example .env.local
npm install
npm run dev
```
Open `http://localhost:3000`. In development (`NODE_ENV !== "production"` and `NEXT_PUBLIC_ENABLE_DEV_AUTH=true`), a local browser dev player is automatically authenticated.

## Supabase Database Setup
1. Create a new Supabase project.
2. Open the **SQL Editor** and run `supabase/migrations/001_initial_schema.sql`.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and your Vercel project settings.

## Vercel Deployment
```bash
npm run build
npx vercel --prod
```
Set `NEXT_PUBLIC_ENABLE_DEV_AUTH=false` in Vercel Production environment variables and provide a strong `SESSION_SECRET`.

## Telegram Bot Setup
1. Message `@BotFather` on Telegram and create a bot with `/newbot` to get `TELEGRAM_BOT_TOKEN`.
2. Run `/newapp` in `@BotFather`, select your bot, set title **Ninja Cat: Shadow Run**, upload `public/assets/ui/ninja-cat-emblem.png`, and paste your HTTPS Vercel URL.
3. Add `TELEGRAM_BOT_TOKEN` to Vercel environment variables and redeploy.
