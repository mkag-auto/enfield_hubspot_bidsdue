# Enfield Bid Board

Narrow vertical TV dashboard showing active **Bidding** deals from HubSpot.
Auto-refreshes every 5 minutes. Deploys to Vercel in ~2 minutes.

---

## Setup

### 1 — HubSpot Private App Token
1. In HubSpot: **Settings → Integrations → Private Apps**
2. Create a new app, give it these scopes:
   - `crm.objects.deals.read`
   - `crm.objects.owners.read`
3. Copy the token — it starts with `pat-na1-...`

### 2 — Find Your "Bidding" Stage ID
Run this in your terminal (replace YOUR_TOKEN):
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.hubapi.com/crm/v3/pipelines/deals" | \
  python3 -m json.tool | grep -A2 '"Bidding"'
```
Copy the `id` value next to the "Bidding" stage.

### 3 — Deploy to Vercel
1. Push this folder to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. In **Environment Variables**, add:
   - `HUBSPOT_API_KEY` = your token
   - `HUBSPOT_BIDDING_STAGE_ID` = the stage ID from step 2
4. Deploy — Vercel gives you a URL like `enfield-bid-board.vercel.app`

### 4 — TV Setup
Open the Vercel URL in a browser on the TV, set zoom to fit the 220px column.

---

## Local Dev
```bash
cp .env.example .env.local
# fill in your values
npm install
npm run dev
# open http://localhost:3000
```
