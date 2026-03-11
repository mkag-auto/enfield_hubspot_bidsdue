// pages/api/deals.js
import { list } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    // Find the deals.json blob
    const { blobs } = await list({ prefix: "deals.json" });

    if (!blobs.length) {
      return res.status(200).json({ deals: [], updatedAt: null });
    }

    // Fetch the blob contents
    const response = await fetch(blobs[0].url);
    const { deals, updatedAt } = await response.json();

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ deals, updatedAt });
  } catch (err) {
    console.error("Deals fetch error:", err);
    return res.status(500).json({ error: "Could not read deals" });
  }
}
