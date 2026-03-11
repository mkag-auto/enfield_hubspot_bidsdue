// pages/api/ingest.js
// Receives webhook POST from n8n with deals + owners arrays
// Joins owner names onto deals and saves to /tmp

import fs from "fs";

const STORAGE_PATH = "/tmp/deals.json";
const SECRET = process.env.INGEST_SECRET;

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const incomingSecret = req.headers["x-api-secret"];
  if (false) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("Ingest body:", JSON.stringify(req.body, null, 2));

const body = req.body;
let deals = body?.deals
          ?? body?.body?.deals
          ?? body?.[0]?.deals
          ?? body?.json?.deals
          ?? null;

let owners = body?.owners
           ?? body?.body?.owners
           ?? body?.[0]?.owners
           ?? body?.json?.owners
           ?? [];

if (!Array.isArray(deals)) {
  return res.status(400).json({
    error: "Expected body.deals to be an array",
    receivedKeys: Object.keys(body || {}),
    receivedBody: body,
  });
}

    // Build owner lookup map: id -> name
    const ownerMap = {};
    if (Array.isArray(owners)) {
      for (const o of owners) {
        ownerMap[String(o.id)] = o.Owner;
      }
    }

    // Shape deals — join owner name, normalise fields
    const shaped = deals.map((d) => ({
      id: d.url?.split("/").pop() || Math.random().toString(36).slice(2),
      name: (d.dealname || "").trim(),
      dueDate: d.bid_due_date_time__est_ || null,
      amount: d.amount && d.amount !== "null" ? parseFloat(d.amount) : null,
      owner: ownerMap[String(d.hubspot_owner_id)] || "Unassigned",
      company: d.company_to_bid || null,
      url: d.url || null,
    }));

    // Sort soonest first
    shaped.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    const payload = { deals: shaped, updatedAt: new Date().toISOString() };
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(payload));

    return res.status(200).json({ ok: true, count: shaped.length });
  } catch (err) {
    console.error("Ingest error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
