// pages/api/deals.js
// Server-side only — HubSpot API key never exposed to browser

export default async function handler(req, res) {
  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
  const BIDDING_STAGE_ID = process.env.HUBSPOT_BIDDING_STAGE_ID;

  if (!HUBSPOT_API_KEY || !BIDDING_STAGE_ID) {
    return res.status(500).json({
      error: "Missing HUBSPOT_API_KEY or HUBSPOT_BIDDING_STAGE_ID environment variables.",
    });
  }

  try {
    // Step 1: Search for deals in the "Bidding" pipeline stage
    const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "dealstage",
                operator: "EQ",
                value: BIDDING_STAGE_ID,
              },
            ],
          },
        ],
        properties: ["dealname", "closedate", "amount", "hubspot_owner_id"],
        limit: 100,
      }),
    });

    if (!searchRes.ok) {
      const err = await searchRes.text();
      console.error("HubSpot search error:", err);
      return res.status(502).json({ error: "HubSpot API error", detail: err });
    }

    const { results } = await searchRes.json();

    // Step 2: Collect unique owner IDs and batch-fetch owner names
    const ownerIds = [...new Set(results.map((d) => d.properties.hubspot_owner_id).filter(Boolean))];

    const ownerMap = {};
    if (ownerIds.length > 0) {
      await Promise.all(
        ownerIds.map(async (id) => {
          const ownerRes = await fetch(`https://api.hubapi.com/crm/v3/owners/${id}`, {
            headers: { Authorization: `Bearer ${HUBSPOT_API_KEY}` },
          });
          if (ownerRes.ok) {
            const owner = await ownerRes.json();
            ownerMap[id] = `${owner.firstName} ${owner.lastName}`.trim();
          }
        })
      );
    }

    // Step 3: Shape the response
    const deals = results.map((deal) => ({
      id: deal.id,
      name: deal.properties.dealname || "Unnamed Deal",
      dueDate: deal.properties.closedate || null,
      amount: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
      owner: ownerMap[deal.properties.hubspot_owner_id] || "Unassigned",
    }));

    // Sort by soonest due date
    deals.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate"); // 5 min cache
    return res.status(200).json({ deals });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
