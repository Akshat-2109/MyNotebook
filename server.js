require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDB } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'mynotebook-default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

app.use('/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));

app.get('/', (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login');
  res.sendFile('app.html', { root: path.join(__dirname, 'public') });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n✦ MyNotebook running → http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  console.error('→ Check your DATABASE_URL in .env file');
  process.exit(1);
});
