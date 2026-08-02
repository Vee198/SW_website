/**
 * SW Strategic Solutions Group — Contact Form Worker
 *
 * หน้าที่
 *   GET  /*                 เสิร์ฟหน้าเว็บจากโฟลเดอร์ dist/ (ผ่าน binding ASSETS)
 *   POST /api/contact       รับข้อมูลจากฟอร์มติดต่อ → ตรวจ → เก็บลง D1 → ส่งอีเมลแจ้งผ่าน Resend
 *   GET  /api/submissions   ดึงรายการที่เก็บไว้ (ต้องมี token) — ?format=csv ได้ไฟล์ CSV
 *   GET  /api/health        เช็คว่า Worker ยังมีชีวิต
 *
 * ข้อมูลทั้งหมดอยู่ในบัญชี Cloudflare ของบริษัทเอง ไม่ผ่านตัวกลางภายนอก
 * (ยกเว้นตัวส่งอีเมล Resend ซึ่งเห็นเฉพาะเนื้อหาอีเมลแจ้งเตือน)
 *
 * ตัวแปรที่ต้องตั้ง — ดู worker/README.md
 *   vars    : ALLOWED_ORIGIN, MAIL_TO, MAIL_FROM
 *   secrets : RESEND_API_KEY, EXPORT_TOKEN
 *   binding : DB (D1 — ฐานข้อมูล acc_db ใช้ร่วมกับโปรเจกต์อื่น ตารางของเว็บนี้คือ sw_contact_submissions)
 */

const MAX = { name: 120, company: 160, email: 160, phone: 40, topic: 200, message: 4000 };

/* ---------- ตัวช่วย ------------------------------------------------------ */

function corsHeaders(env, request) {
  // อนุญาตเฉพาะโดเมนที่ตั้งไว้ (คั่นหลายอันด้วยจุลภาค) — กันคนอื่นเอาฟอร์มเราไปยิง
  const allow = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  const ok = allow.includes(origin) ? origin : (allow[0] || '');
  return {
    'Access-Control-Allow-Origin': ok,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status, extra) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extra || {}),
  });
}

/** ตัดอักขระควบคุม (เว้น \n \t) ตัดช่องว่างหัวท้าย และจำกัดความยาว */
function clean(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

/** เก็บ IP แบบแฮชเพื่อทำ rate limit ได้โดยไม่ต้องเก็บ IP จริง (หลัก PDPA: เก็บเท่าที่จำเป็น) */
async function hashIp(ip, salt) {
  const buf = new TextEncoder().encode((salt || 'sw') + '|' + (ip || ''));
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}

function esc(s) {
  return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ---------- ส่งอีเมลแจ้งเตือน ------------------------------------------- */

async function notify(env, row) {
  if (!env.RESEND_API_KEY) return { skipped: 'ไม่ได้ตั้ง RESEND_API_KEY' };

  const rows = [
    ['ชื่อ', row.name],
    ['บริษัท', row.company],
    ['อีเมล', row.email],
    ['โทรศัพท์', row.phone],
    ['บริการที่สนใจ', row.topic],
    ['ข้อความ', row.message],
    ['ภาษาที่ใช้ดูเว็บ', row.lang],
    ['เวลา (ไทย)', row.created_local],
  ];

  const html = `<div style="font-family:Georgia,'Times New Roman',serif;max-width:620px;margin:0 auto;background:#FFFFFF;color:#3D4757;padding:32px;border-top:3px solid #0E1A2B">
  <p style="margin:0;font-size:11px;letter-spacing:.22em;color:#68717F;text-transform:uppercase">SW Strategic Solutions Group</p>
  <h2 style="margin:14px 0 24px;color:#0E1A2B;font-size:24px;font-weight:400">มีผู้ติดต่อใหม่จากเว็บไซต์</h2>
  <table style="width:100%;border-collapse:collapse;font-size:15px;font-family:-apple-system,'Segoe UI',sans-serif">
    ${rows.map(([k, v]) => `<tr>
      <td style="padding:11px 16px 11px 0;color:#68717F;white-space:nowrap;vertical-align:top;border-top:1px solid #E2E5EA;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${esc(k)}</td>
      <td style="padding:11px 0;border-top:1px solid #E2E5EA;white-space:pre-wrap;color:#0E1A2B">${esc(v) || '<span style="color:#8C95A3">&mdash;</span>'}</td>
    </tr>`).join('')}
  </table>
  <p style="margin-top:26px;font-size:12px;color:#8C95A3;font-family:-apple-system,'Segoe UI',sans-serif">รหัสอ้างอิง ${esc(row.id)} &middot; ตอบกลับอีเมลฉบับนี้เพื่อคุยกับลูกค้าได้ทันที</p>
</div>`;

  const text = rows.map(([k, v]) => k + ': ' + (v || '-')).join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: (env.MAIL_TO || '').split(',').map(s => s.trim()).filter(Boolean),
      reply_to: row.email || undefined,
      subject: 'ติดต่อใหม่จากเว็บไซต์ — ' + (row.name || 'ไม่ระบุชื่อ') + (row.company ? ' (' + row.company + ')' : ''),
      html,
      text,
    }),
  });

  if (!res.ok) return { error: 'resend ' + res.status + ' ' + (await res.text()).slice(0, 300) };
  return { ok: true };
}

/* ---------- POST /api/contact ------------------------------------------- */

async function handleContact(request, env, ctx) {
  let body = {};
  const type = request.headers.get('Content-Type') || '';
  try {
    if (type.includes('application/json')) {
      body = await request.json();
    } else {
      const fd = await request.formData();
      fd.forEach((v, k) => { body[k] = v; });
    }
  } catch (e) {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  // 1) honeypot — บอทมักกรอกทุกช่องรวมถึงช่องที่คนมองไม่เห็น
  if (clean(body.botcheck, 10)) return json({ ok: true, note: 'ignored' }, 200);

  // 2) ตรวจข้อมูล
  const row = {
    name: clean(body.name, MAX.name),
    company: clean(body.company, MAX.company),
    email: clean(body.email, MAX.email).toLowerCase(),
    phone: clean(body.phone, MAX.phone),
    topic: clean(body.topic, MAX.topic),
    message: clean(body.message, MAX.message),
    lang: clean(body.lang, 4) === 'en' ? 'en' : 'th',
    consent: body.consent === true || body.consent === 'on' || body.consent === '1' ? 1 : 0,
  };

  const bad = [];
  if (!row.name) bad.push('name');
  if (!validEmail(row.email)) bad.push('email');
  if (!row.consent) bad.push('consent');
  if (bad.length) return json({ ok: false, error: 'validation', fields: bad }, 422);

  // 3) rate limit — IP เดียวกันส่งได้ไม่เกิน 3 ครั้งใน 15 นาที
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ipHash = await hashIp(ip, env.EXPORT_TOKEN || 'sw-salt');
  try {
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM sw_contact_submissions WHERE ip_hash = ? AND created_at > datetime('now','-15 minutes')"
    ).bind(ipHash).first();
    if (recent && recent.n >= 3) return json({ ok: false, error: 'rate_limited' }, 429);
  } catch (e) { /* ตารางยังไม่มี → ปล่อยผ่าน ค่อยไปพังตอน insert แล้วเห็น log ชัดกว่า */ }

  // 4) เก็บลง D1
  const id = crypto.randomUUID();
  const cf = request.cf || {};
  await env.DB.prepare(
    `INSERT INTO sw_contact_submissions
      (id, name, company, email, phone, topic, message, lang, consent, ip_hash, country, user_agent, referer)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, row.name, row.company, row.email, row.phone, row.topic, row.message,
    row.lang, row.consent, ipHash, cf.country || '',
    (request.headers.get('User-Agent') || '').slice(0, 300),
    (request.headers.get('Referer') || '').slice(0, 300)
  ).run();

  // 5) ส่งอีเมลแจ้ง — ไม่ให้ผู้ใช้รอ และถ้าอีเมลล้มก็ไม่ทำให้ข้อมูลหาย (บันทึกไปแล้ว)
  row.id = id;
  row.created_local = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  ctx.waitUntil(notify(env, row).then(r => { if (r && r.error) console.error('notify:', r.error); }));

  return json({ ok: true, id });
}

/* ---------- GET /api/submissions ---------------------------------------- */

async function handleExport(request, env) {
  const url = new URL(request.url);
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '') || url.searchParams.get('token') || '';
  if (!env.EXPORT_TOKEN || token !== env.EXPORT_TOKEN) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1000);
  const { results } = await env.DB.prepare(
    `SELECT id, created_at, name, company, email, phone, topic, message, lang, consent, country
     FROM sw_contact_submissions ORDER BY created_at DESC LIMIT ?`
  ).bind(limit).all();

  if (url.searchParams.get('format') === 'csv') {
    const cols = ['created_at', 'name', 'company', 'email', 'phone', 'topic', 'message', 'lang', 'consent', 'country', 'id'];
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = '﻿' + cols.join(',') + '\n' +
      results.map(r => cols.map(c => q(r[c])).join(',')).join('\n');
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sw-contact-submissions.csv"',
      },
    });
  }
  return json({ ok: true, count: results.length, results });
}

/* ---------- entry point -------------------------------------------------- */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(env, request);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (url.pathname === '/api/health') {
        return json({ ok: true, service: 'sw-contact', time: new Date().toISOString() }, 200, cors);
      }

      if (url.pathname === '/api/contact' && request.method === 'POST') {
        const res = await handleContact(request, env, ctx);
        Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }

      if (url.pathname === '/api/submissions' && request.method === 'GET') {
        return await handleExport(request, env);   // ไม่ใส่ CORS โดยตั้งใจ — เรียกจาก curl เท่านั้น
      }

      // ไม่ตรงเส้นทาง API — ถ้าเป็นคนเปิดเว็บ ให้หน้า 404 ที่ออกแบบไว้ ไม่ใช่ JSON ดิบ
      if (!url.pathname.startsWith('/api/') && env.ASSETS) {
        const page = await env.ASSETS.fetch(new URL('/404.html', url.origin));
        return new Response(page.body, {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return json({ ok: false, error: 'not_found' }, 404, cors);
    } catch (err) {
      console.error('worker error:', err && err.stack ? err.stack : err);
      return json({ ok: false, error: 'server_error' }, 500, cors);
    }
  },
};
