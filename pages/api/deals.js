// pages/api/deals.js
// Returns stored deals for the TV board to display

import fs from "fs";

const STORAGE_PATH = "/tmp/deals.json";

export default function handler(req, res) {
  try {
    if (!fs.existsSync(STORAGE_PATH)) {
      return res.status(200).json({ deals: [], updatedAt: null });
    }
    const { deals, updatedAt } = JSON.parse(fs.readFileSync(STORAGE_PATH, "utf8"));
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ deals, updatedAt });
  } catch (err) {
    return res.status(500).json({ error: "Could not read deals" });
  }
}
