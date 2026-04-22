function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailHtml(alerts = [], digestMode = "instant") {
  const safeAlerts = alerts.length ? alerts : [{ symbol: 'MIDNIGHT', posture: 'Test alert', confidence: 100, text: 'Your email delivery path is working.' }];
  const items = safeAlerts
    .map(
      (alert) => `
        <div style="padding:14px 16px;border-radius:14px;border:1px solid rgba(148,163,184,.18);background:#111827;margin-bottom:12px;">
          <div style="font-size:12px;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(alert.type || alert.source || "signal")}</div>
          <div style="font-size:18px;font-weight:800;color:#f8fafc;margin-bottom:8px;">${escapeHtml(alert.symbol || "Asset")} • ${escapeHtml(alert.posture || "Signal")} • ${escapeHtml(String(alert.confidence || "--"))}%</div>
          <div style="color:#cbd5e1;line-height:1.6;">${escapeHtml(alert.text || alert.body || "A new signal update was detected.")}</div>
        </div>`
    )
    .join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#0f172a;padding:24px;color:#f8fafc;">
      <div style="max-width:640px;margin:0 auto;background:linear-gradient(135deg,#0d1530,#181c2f);border:1px solid rgba(148,163,184,.18);border-radius:24px;padding:28px;">
        <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#bcd0ff;margin-bottom:10px;">Midnight Signal</div>
        <div style="font-size:32px;font-weight:900;line-height:1.05;margin-bottom:12px;">${digestMode === "digest" ? "Your signal digest is ready" : "A new signal alert just fired"}</div>
        <div style="font-size:16px;line-height:1.7;color:#cbd5e1;margin-bottom:18px;">Markets shifted while you were away. Here’s the latest read from Midnight Signal.</div>
        ${items}
        <div style="margin-top:18px;color:#94a3b8;font-size:13px;line-height:1.6;">You’re receiving this because email alerts are enabled in Midnight Signal.</div>
      </div>
    </div>`;
}

function buildEmailText(alerts = [], digestMode = "instant") {
  const header = digestMode === "digest" ? "Midnight Signal digest" : "Midnight Signal alert";
  const safeAlerts = alerts.length ? alerts : [{ symbol: 'MIDNIGHT', posture: 'Test alert', confidence: 100, text: 'Your email delivery path is working.' }];
  const lines = safeAlerts.map((alert) => `- ${alert.symbol || "Asset"} | ${alert.posture || "Signal"} | ${alert.confidence || "--"}% | ${alert.text || alert.body || "A new signal update was detected."}`);
  return [header, "", ...lines].join("\n");}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim();
    const alerts = Array.isArray(body?.alerts) ? body.alerts.slice(0, 6) : [];
    const digestMode = body?.digestMode === "digest" ? "digest" : "instant";

    if (!email) {
      return Response.json({ ok: false, message: "Missing delivery email." }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.ALERTS_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;

    if (!resendKey || !from) {
      return Response.json({
        ok: true,
        mode: "mock",
        message: "Alert route is configured, but live email delivery needs RESEND_API_KEY and ALERTS_FROM_EMAIL.",
      });
    }

    const payload = {
      from,
      to: [email],
      subject: body?.test ? "Midnight Signal test alert" : digestMode === "digest" ? "Midnight Signal digest" : "Midnight Signal alert",
      html: buildEmailHtml(alerts, digestMode),
      text: buildEmailText(alerts, digestMode),
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json({ ok: false, message: data?.message || "Unable to send email alert." }, { status: 500 });
    }

    return Response.json({ ok: true, mode: "live", id: data?.id || null, sentAt: new Date().toISOString() });
  } catch (error) {
    return Response.json({ ok: false, message: error?.message || "Unable to send email alert." }, { status: 500 });
  }
}
