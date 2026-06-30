const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/init');
const { generateOTP, sendOTP } = require('../utils/mailer');
const router = express.Router();

async function saveOTP(email, otp, type) {
  await pool.query('DELETE FROM otp_tokens WHERE email=$1 AND type=$2', [email, type]);
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  await pool.query('INSERT INTO otp_tokens (email,otp,type,expires_at) VALUES ($1,$2,$3,$4)',
    [email.toLowerCase(), otp, type, expires]);
}

async function verifyOTP(email, otp, type) {
  const r = await pool.query(
    'SELECT * FROM otp_tokens WHERE email=$1 AND otp=$2 AND type=$3 AND expires_at > NOW()',
    [email.toLowerCase(), otp, type]);
  if (!r.rows[0]) return false;
  await pool.query('DELETE FROM otp_tokens WHERE email=$1 AND type=$2', [email, type]);
  return true;
}

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.sendFile('login.html', { root: require('path').join(__dirname, '../public') });
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.json({ ok: false, error: 'All fields are required.' });
    if (password.length < 6) return res.json({ ok: false, error: 'Password must be at least 6 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json({ ok: false, error: 'Please enter a valid email address.' });
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return res.json({ ok: false, error: 'Username: 3-30 chars, letters/numbers/underscore only.' });

    const existing = await pool.query('SELECT username, email FROM users WHERE LOWER(username)=$1 OR LOWER(email)=$2',
      [username.trim().toLowerCase(), email.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      const taken = existing.rows[0];
      const field = taken.email.toLowerCase() === email.trim().toLowerCase() ? 'Email' : 'Username';
      return res.json({ ok: false, error: `${field} is already taken. Try another.` });
    }

    const otp = generateOTP();
    await saveOTP(email.trim().toLowerCase(), otp, 'verify');
    await sendOTP(email.trim().toLowerCase(), otp, 'verify');
    res.json({ ok: true, step: 'verify' });
  } catch (e) {
    console.error('Register error:', e);
    res.json({ ok: false, error: 'Failed to send OTP. Check email config in .env' });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { username, email, password, otp } = req.body;
    if (!otp) return res.json({ ok: false, error: 'Please enter the OTP.' });
    const valid = await verifyOTP(email.trim().toLowerCase(), otp.trim(), 'verify');
    if (!valid) return res.json({ ok: false, error: 'Invalid or expired OTP. Try again.' });

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (username,email,password,is_verified) VALUES ($1,$2,$3,true) RETURNING id,username,email',
      [username.trim().toLowerCase(), email.trim().toLowerCase(), hash]);
    const user = result.rows[0];
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.email = user.email;
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23505') {
      const field = e.detail?.includes('email') ? 'Email' : 'Username';
      return res.json({ ok: false, error: `${field} is already taken.` });
    }
    console.error(e);
    res.json({ ok: false, error: 'Server error. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) return res.json({ ok: false, error: 'All fields are required.' });
    const result = await pool.query('SELECT * FROM users WHERE LOWER(username)=$1 OR LOWER(email)=$1',
      [login.trim().toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.json({ ok: false, error: 'Invalid username/email or password.' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ ok: false, error: 'Invalid username/email or password.' });
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.email = user.email;
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.json({ ok: false, error: 'Server error. Please try again.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ ok: false, error: 'Email is required.' });
    const r = await pool.query('SELECT id FROM users WHERE LOWER(email)=$1', [email.trim().toLowerCase()]);
    if (!r.rows[0]) return res.json({ ok: true }); // silent — don't reveal if email exists
    const otp = generateOTP();
    await saveOTP(email.trim().toLowerCase(), otp, 'reset');
    await sendOTP(email.trim().toLowerCase(), otp, 'reset');
    res.json({ ok: true });
  } catch (e) {
    console.error('Forgot password error:', e);
    res.json({ ok: false, error: 'Failed to send OTP. Check email config in .env' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.json({ ok: false, error: 'All fields are required.' });
    if (newPassword.length < 6) return res.json({ ok: false, error: 'Password must be at least 6 characters.' });
    const valid = await verifyOTP(email.trim().toLowerCase(), otp.trim(), 'reset');
    if (!valid) return res.json({ ok: false, error: 'Invalid or expired OTP. Try again.' });
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password=$1 WHERE LOWER(email)=$2', [hash, email.trim().toLowerCase()]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.json({ ok: false, error: 'Server error. Please try again.' });
  }
});

router.post('/change-password', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ ok: false, error: 'Not logged in' });
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.json({ ok: false, error: 'All fields required.' });
    if (newPassword.length < 6) return res.json({ ok: false, error: 'New password must be at least 6 characters.' });
    const result = await pool.query('SELECT password FROM users WHERE id=$1', [req.session.userId]);
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!valid) return res.json({ ok: false, error: 'Current password is incorrect.' });
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hash, req.session.userId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.json({ ok: false, error: 'Server error.' });
  }
});

module.exports = router;
