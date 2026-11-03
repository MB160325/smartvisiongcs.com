// supabase functions deploy notify-admins
// supabase secrets set RESEND_API_KEY=... MAIL_FROM="SMART VISION <no-reply@smartvisiongcs.com>"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    const { id } = await req.json();
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: r } = await db.from('requests').select('*').eq('id', id).is('notified_at', null).maybeSingle();
    if (!r) return json({ skipped: true });
    const { data: to } = await db.from('admin_emails').select('email').eq('notify', true);
    if (!to?.length) return json({ skipped: 'no recipients' });
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;border:1px solid #D4AF37;padding:24px">
      <h2 style="color:#8B6B15;margin:0 0 12px">SMART VISION — ${esc(r.kind)} request</h2>
      <p><b>Name:</b> ${esc(r.name)}<br><b>Email:</b> ${esc(r.email)}<br><b>Phone:</b> ${esc(r.phone)}<br><b>Subject:</b> ${esc(r.subject)}</p>
      <p style="white-space:pre-wrap;background:#f7f4ea;padding:14px">${esc(r.message)}</p></div>`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + Deno.env.get('RESEND_API_KEY'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: Deno.env.get('MAIL_FROM'), to: to.map((x) => x.email), reply_to: r.email || undefined,
        subject: `[SMART VISION] New ${r.kind} request — ${r.name}`, html }) });
    if (res.ok) await db.from('requests').update({ notified_at: new Date().toISOString() }).eq('id', id);
    return json({ ok: res.ok });
  } catch (e) { return json({ error: String(e) }, 500); }
});
