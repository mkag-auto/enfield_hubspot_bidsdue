// pages/index.js
import { useEffect, useState, useCallback } from "react";
import Head from "next/head";

const RED = "#851e20";
const MED_RED = "#B84042";
const LIGHT_RED = "#F7ECEC";
const GREY = "#878787";

function getDueInfo(dueDateStr) {
  if (!dueDateStr) return { label: "No Date", color: GREY, urgent: false, daysOut: 999 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dateLabel = due.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });

  if (diff < 0)  return { label: "OVERDUE", sublabel: dateLabel, color: RED, urgent: true, pulse: true, daysOut: diff };
  if (diff === 0) return { label: "DUE TODAY", sublabel: dateLabel, color: RED, urgent: true, pulse: true, daysOut: 0 };
  if (diff === 1) return { label: "DUE TOMORROW", sublabel: dateLabel, color: MED_RED, urgent: true, pulse: false, daysOut: 1 };
  if (diff <= 7)  return { label: `${dayNames[due.getDay()].toUpperCase()} — ${dateLabel}`, sublabel: `${diff} days`, color: MED_RED, urgent: true, pulse: false, daysOut: diff };
  return { label: dateLabel, sublabel: `${diff} days`, color: GREY, urgent: false, pulse: false, daysOut: diff };
}

function formatAmount(amount) {
  if (amount === null || amount === undefined) return null;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function initials(name) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function BidBoard() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(new Date());

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/deals");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDeals(data.deals);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
    const refresh = setInterval(fetchDeals, 5 * 60 * 1000); // every 5 min
    const clock = setInterval(() => setNow(new Date()), 30000);
    return () => { clearInterval(refresh); clearInterval(clock); };
  }, [fetchDeals]);

  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const urgentCount = deals.filter((d) => getDueInfo(d.dueDate).daysOut <= 7).length;

  return (
    <>
      <Head>
        <title>Enfield — Bid Board</title>
        <meta name="viewport" content="width=220" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={styles.root}>
        {/* ── HEADER ── */}
        <div style={styles.header}>
          <div style={styles.headerLogo}>ENFIELD</div>
          <div style={styles.headerSub}>BID BOARD</div>
          <div style={styles.headerTime}>{timeStr}</div>
          <div style={styles.headerDate}>{dateStr}</div>
        </div>

        {/* ── STATS BAR ── */}
        <div style={styles.statsBar}>
          <div style={styles.statPill}>
            <span style={{ ...styles.badge, background: RED }}>{deals.length}</span>
            <span style={styles.statLabel}>BIDDING</span>
          </div>
          {urgentCount > 0 && (
            <div style={styles.statPill}>
              <span style={{ ...styles.badge, background: MED_RED }}>{urgentCount}</span>
              <span style={styles.statLabel}>THIS WEEK</span>
            </div>
          )}
        </div>

        {/* ── DEALS ── */}
        <div style={styles.list}>
          {loading && (
            <div style={styles.statusMsg}>
              <div style={styles.spinner} />
              <span>Loading…</span>
            </div>
          )}

          {error && !loading && (
            <div style={{ ...styles.statusMsg, color: RED }}>
              ⚠ {error}
            </div>
          )}

          {!loading && !error && deals.length === 0 && (
            <div style={styles.statusMsg}>No active bids.</div>
          )}

          {deals.map((deal) => {
            const due = getDueInfo(deal.dueDate);
            const amt = formatAmount(deal.amount);
            return (
              <div key={deal.id} style={{
                ...styles.card,
                borderLeft: `3px solid ${due.color}`,
                background: due.urgent ? "#1c1010" : "#161616",
                border: `1px solid ${due.urgent ? "#3a1515" : "#222"}`,
                borderLeftColor: due.color,
                borderLeftWidth: 3,
                borderLeftStyle: "solid",
              }}>
                {/* Due line */}
                <div style={{ ...styles.dueRow, color: due.color }}>
                  {due.pulse && <span style={styles.dot} />}
                  <span style={styles.dueLabel}>{due.label}</span>
                </div>

                {/* Deal name */}
                <div style={styles.dealName}>{deal.name}</div>

                {/* Amount */}
                {amt && (
                  <div style={styles.amount}>{amt}</div>
                )}

                {/* Owner */}
                <div style={styles.ownerRow}>
                  <span style={styles.avatar}>{initials(deal.owner)}</span>
                  <span style={styles.ownerName}>{deal.owner}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── FOOTER ── */}
        <div style={styles.footer}>
          {lastUpdated && (
            <span>Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
          )}
        </div>

        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #111; overflow-x: hidden; }
          ::-webkit-scrollbar { width: 3px; }
          ::-webkit-scrollbar-track { background: #111; }
          ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
          @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.15 } }
          @keyframes spin { to { transform: rotate(360deg) } }
        `}</style>
      </div>
    </>
  );
}

const styles = {
  root: {
    width: 220,
    minHeight: "100vh",
    background: "#111",
    fontFamily: "'DM Sans', sans-serif",
    display: "flex",
    flexDirection: "column",
    borderRight: `3px solid ${RED}`,
  },
  header: {
    background: RED,
    padding: "14px 12px 10px",
    textAlign: "center",
    borderBottom: `2px solid ${MED_RED}`,
    flexShrink: 0,
  },
  headerLogo: {
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "'DM Serif Display', serif",
    letterSpacing: 3,
  },
  headerSub: {
    color: LIGHT_RED,
    fontSize: 8,
    letterSpacing: 2,
    opacity: 0.8,
    marginTop: 1,
  },
  headerTime: {
    color: LIGHT_RED,
    fontSize: 13,
    fontWeight: 600,
    marginTop: 7,
  },
  headerDate: {
    color: LIGHT_RED,
    fontSize: 9,
    opacity: 0.7,
    marginTop: 2,
  },
  statsBar: {
    background: "#1a1a1a",
    borderBottom: "1px solid #2a2a2a",
    padding: "6px 10px",
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexShrink: 0,
  },
  statPill: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  badge: {
    color: "#fff",
    borderRadius: 2,
    fontSize: 10,
    fontWeight: 700,
    padding: "1px 5px",
    minWidth: 18,
    textAlign: "center",
  },
  statLabel: {
    color: GREY,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
  },
  card: {
    margin: "0 8px 10px",
    borderRadius: 3,
    padding: "9px 10px 8px",
    position: "relative",
  },
  dueRow: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: RED,
    display: "inline-block",
    animation: "pulse 1.4s ease-in-out infinite",
    flexShrink: 0,
  },
  dueLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  dealName: {
    color: "#eee",
    fontSize: 11,
    fontWeight: 600,
    lineHeight: 1.35,
    marginBottom: 5,
  },
  amount: {
    color: LIGHT_RED,
    fontSize: 13,
    fontFamily: "'DM Serif Display', serif",
    fontWeight: 400,
    marginBottom: 5,
  },
  ownerRow: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: RED,
    color: "#fff",
    fontSize: 7,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ownerName: {
    color: GREY,
    fontSize: 9,
  },
  statusMsg: {
    color: GREY,
    fontSize: 10,
    textAlign: "center",
    padding: "20px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  spinner: {
    width: 16,
    height: 16,
    border: `2px solid #333`,
    borderTop: `2px solid ${RED}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  footer: {
    background: "#0e0e0e",
    borderTop: "1px solid #1f1f1f",
    padding: "7px 12px",
    textAlign: "center",
    color: "#333",
    fontSize: 8,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
};
