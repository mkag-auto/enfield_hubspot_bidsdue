// pages/api/deals.js
import { list, download } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    const { blobs } = await list({ prefix: "deals.json" });

    if (!blobs.length) {
      return res.status(200).json({ deals: [], updatedAt: null });
    }

    const response = await download(blobs[0].url);
    const { deals, updatedAt } = await response.json();

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ deals, updatedAt });
  } catch (err) {
    console.error("Deals fetch error:", err);
    return res.status(500).json({ error: "Could not read deals", detail: err.message });
  }
}
