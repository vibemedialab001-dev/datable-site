// 매일 09:00 KST(=00:00 UTC) 다이제스트 — 읽지 않은 문의가 있을 때만 메일 1통
export default async function handler(req, res) {
  if (process.env.CRON_SECRET &&
      req.headers["authorization"] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: "SUPABASE_SECRET_KEY not set" });

  const r = await fetch(
    "https://xenaodixstkagcvlyuri.supabase.co/rest/v1/datable_inquiries" +
    "?read=eq.false&order=created_at.desc&limit=50" +
    "&select=type,name,company,email,phone,message,created_at",
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.json({ sent: false, unread: 0 });
  }
  const lines = rows.map(q =>
    `[${q.type}] ${q.name}${q.company ? " · " + q.company : ""}\n` +
    `${q.email} / ${q.phone} / ${q.created_at.slice(0, 16).replace("T", " ")}\n` +
    `${q.message}`
  ).join("\n\n──────────────\n\n");

  await fetch("https://formsubmit.co/ajax/664ec6a478c2bee2c0e5af9280a8f15f", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", "Accept": "application/json",
      "Origin": "https://datable.co.kr", "Referer": "https://datable.co.kr/",
    },
    body: JSON.stringify({
      _subject: `[datable.co.kr] 읽지 않은 문의 ${rows.length}건 — datable.co.kr/admin 에서 확인`,
      안내: "읽음 처리 전까지 매일 09시에 리마인드됩니다.",
      문의목록: lines,
    }),
  });
  return res.json({ sent: true, unread: rows.length });
}
