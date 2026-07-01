const express = require('express');
const { pool } = require('../db/init');
const router = express.Router();

function auth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ ok: false, error: 'Not logged in' });
  next();
}

// ME
router.get('/me', auth, (req, res) => {
  res.json({ ok: true, username: req.session.username, email: req.session.email || '' });
});

// STATS
router.get('/stats', auth, async (req, res) => {
  try {
    const uid = req.session.userId;
    const [cats, blks, wds] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM categories WHERE user_id=$1', [uid]),
      pool.query('SELECT COUNT(*) FROM blocks b JOIN pages p ON p.id=b.page_id WHERE p.user_id=$1', [uid]),
      pool.query(`SELECT COALESCE(SUM(array_length(regexp_split_to_array(trim(b.text),'\\s+'),1)),0)
                  FROM blocks b JOIN pages p ON p.id=b.page_id
                  WHERE p.user_id=$1 AND trim(b.text)!=''`, [uid])
    ]);
    res.json({
      ok: true,
      categories: +cats.rows[0].count,
      blocks: +blks.rows[0].count,
      words: +wds.rows[0].coalesce || 0
    });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// CATEGORIES
router.get('/categories', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.*, p.title as page_title
       FROM categories c
       LEFT JOIN pages p ON p.category_id = c.id
       WHERE c.user_id=$1
       ORDER BY c.sort_order ASC, c.created_at ASC`,
      [req.session.userId]
    );
    res.json({ ok: true, data: r.rows });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/categories', auth, async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.json({ ok: false, error: 'Name required' });
    const uid = req.session.userId;
    const cat = await pool.query(
      'INSERT INTO categories (user_id,name,color) VALUES ($1,$2,$3) RETURNING *',
      [uid, name.trim(), color || '#6c8fff']
    );
    await pool.query(
      'INSERT INTO pages (user_id,category_id,title) VALUES ($1,$2,$3)',
      [uid, cat.rows[0].id, '']
    );
    res.json({ ok: true, data: cat.rows[0] });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.put('/categories/:id', auth, async (req, res) => {
  try {
    const { name, color } = req.body;
    await pool.query(
      'UPDATE categories SET name=$1, color=$2 WHERE id=$3 AND user_id=$4',
      [name, color, req.params.id, req.session.userId]
    );
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.delete('/categories/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM categories WHERE id=$1 AND user_id=$2',
      [req.params.id, req.session.userId]
    );
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// PAGE
router.get('/page/:catId', auth, async (req, res) => {
  try {
    const uid = req.session.userId;
    const pg = await pool.query(
      'SELECT * FROM pages WHERE category_id=$1 AND user_id=$2',
      [req.params.catId, uid]
    );
    if (!pg.rows[0]) return res.json({ ok: true, data: { title: '', blocks: [] } });
    const blocks = await pool.query(
      'SELECT * FROM blocks WHERE page_id=$1 ORDER BY sort_order ASC',
      [pg.rows[0].id]
    );
    res.json({ ok: true, data: { title: pg.rows[0].title, blocks: blocks.rows } });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.put('/page/:catId', auth, async (req, res) => {
  try {
    const uid = req.session.userId;
    const { title, blocks } = req.body;
    const pg = await pool.query(
      'SELECT id FROM pages WHERE category_id=$1 AND user_id=$2',
      [req.params.catId, uid]
    );
    if (!pg.rows[0]) return res.json({ ok: false, error: 'Page not found' });
    const pageId = pg.rows[0].id;

    await pool.query('UPDATE pages SET title=$1, updated_at=NOW() WHERE id=$2', [title || '', pageId]);
    await pool.query('DELETE FROM blocks WHERE page_id=$1', [pageId]);

    if (blocks && blocks.length > 0) {
      const vals = blocks.map((_, i) => `($${i*5+1},$${i*5+2},$${i*5+3},$${i*5+4},$${i*5+5})`).join(',');
      const args = blocks.flatMap((b, i) => [pageId, b.type, b.text || '', b.checked || false, i]);
      await pool.query(`INSERT INTO blocks (page_id,type,text,checked,sort_order) VALUES ${vals}`, args);
    }
    res.json({ ok: true });
  } catch (e) { console.error(e); res.json({ ok: false, error: e.message }); }
});

// SEARCH
router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ ok: true, data: [] });
    const uid = req.session.userId;
    const like = `%${q}%`;

    const [titles, btext] = await Promise.all([
      pool.query(
        `SELECT p.category_id, p.title as text, c.name as cat_name, c.color, true as "isTitle"
         FROM pages p JOIN categories c ON c.id=p.category_id
         WHERE p.user_id=$1 AND p.title ILIKE $2 LIMIT 6`, [uid, like]
      ),
      pool.query(
        `SELECT p.category_id, b.text, c.name as cat_name, c.color, false as "isTitle"
         FROM blocks b JOIN pages p ON p.id=b.page_id JOIN categories c ON c.id=p.category_id
         WHERE p.user_id=$1 AND b.text ILIKE $2 LIMIT 14`, [uid, like]
      )
    ]);
    res.json({ ok: true, data: [...titles.rows, ...btext.rows] });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// DELETE ACCOUNT
router.delete('/account', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.session.userId]);
    req.session.destroy();
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

module.exports = router;
