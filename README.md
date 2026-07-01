# ✦ MyNotebook

Multi-user personal notebook with OTP email verification, forgot password, rich text editor, and cloud database.

## ✨ Features
- 👤 Open registration with **email verification OTP**
- 🔑 **Forgot password** via email OTP
- 📂 Categories with custom colors
- 📝 Rich block editor: Paragraph, H1, H2, Bullets, Numbered, Checklist, Quote, Code, Divider
- 🔍 Full-text search
- ☁️ PostgreSQL (Supabase) — data saved forever

## 🚀 Setup

### 1. Get Gmail App Password (for sending OTPs)
1. Go to myaccount.google.com → Security → 2-Step Verification → turn ON
2. Then: Security → App Passwords → Select app: Mail → Generate
3. Copy the 16-character password shown

### 2. Configure .env
```
DATABASE_URL=postgresql://postgres:YOUR_PASS@db.xxx.supabase.co:5432/postgres?sslmode=require
SESSION_SECRET=any-random-string
NODE_ENV=development
MAIL_USER=yourgmail@gmail.com
MAIL_PASS=xxxx-xxxx-xxxx-xxxx
```

### 3. Run
```bash
npm install
npm start
```

## ☁️ Deploy on Render
1. Push to GitHub
2. render.com → New Web Service → connect repo
3. Build: `npm install` | Start: `npm start`
4. Add env vars: DATABASE_URL, SESSION_SECRET, NODE_ENV=production, MAIL_USER, MAIL_PASS
