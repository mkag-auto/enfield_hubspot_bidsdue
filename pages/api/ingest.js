// pages/api/ingest.js
import { put } from "@vercel/blob";

const SECRET = process.env.INGEST_SECRET;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const incomingSecret = req.headers["x-api-secret"];
  if (!SECRET || incomingSecret !== SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // n8n can nest the payload at different levels depending on config
    const root =
      (Array.isArray(req.body?.deals)        && req.body)       ||
      (Array.isArray(req.body?.body?.deals)  && req.body.body)  ||
      (Array.isArray(req.body?.data?.deals)  && req.body.data)  ||
      null;

    if (!root) {
      return res.status(400).json({
        error: "Expected body.deals to be an array",
        receivedKeys: Object.keys(req.body || {}),
        receivedBody: req.body,
      });
    }

    const { deals, owners } = root;

    // Build owner lookup: id -> name
    const ownerMap = {};
    if (Array.isArray(owners)) {
      for (const o of owners) {
        ownerMap[String(o.id)] = o.Owner;
      }
    }

    // Shape and join owner names
    const shaped = deals.map((d) => ({
      id: d.url?.split("/").pop() || Math.random().toString(36).slice(2),
      name: (d.dealname || "").trim(),
      dueDate: d.bid_due_date_time__est_ || null,
      amount: d.amount && d.amount !== "null" ? parseFloat(d.amount) : null,
      owner: ownerMap[String(d.hubspot_owner_id)] || "Unassigned",
      company: d.company_to_bid || null,
      url: d.url || null,
    }));

    shaped.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    const payload = JSON.stringify({ deals: shaped, updatedAt: new Date().toISOString() });

    // Save to Vercel Blob — overwrites the same file each time
    await put("deals.json", payload, {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });

    return res.status(200).json({ ok: true, count: shaped.length });
  } catch (err) {
    console.error("Ingest error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
