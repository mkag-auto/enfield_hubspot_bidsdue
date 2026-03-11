import { useEffect, useState, useCallback } from "react";
import Head from "next/head";

const RED = "#851e20";
const MED_RED = "#B84042";
const LIGHT_RED = "#F7ECEC";
const GREY = "#878787";

function getDueInfo(dueDateStr) {
  if (!dueDateStr) return { label: "No Date", timeLabel: null, color: GREY, urgent: false, pulse: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diff = Math.round((dueDay - today) / (1000 * 60 * 60 * 24));

  const timeLabel = due.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });

  if (diff < 0)  return { label: "OVERDUE",  timeLabel, color: RED,     urgent: true,  pulse: true  };
  if (diff === 0) return { label: "TODAY",    timeLabel, color: RED,     urgent: true,  pulse: true  };
  if (diff === 1) return { label: "TOMORROW", timeLabel, color: MED_RED, urgent: true,  pulse: false };
  if (diff <= 7) {
    const day = due.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
    return { label: day.toUpperCase(), timeLabel, color: MED_RED, urgent: true, pulse: false };
  }
  const label = due.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
  return { label, timeLabel, color: GREY, urgent: false, pulse: false };
}

function formatAmount(amount) {
  if (amount === null || amount === undefined) return null;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function initials(name) {
  return name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function BidBoard() {
  const [deals, setDeals]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const fetchDeals = useCallback(async () => {
    try {
      const res  = await fetch("/api/deals");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDeals(data.deals || []);
      setUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : null);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
    const refresh = setInterval(fetchDeals, 2 * 60 * 1000);
    return () => clearInterval(refresh);
  }, [fetchDeals]);

  return (
    <>
      <Head>
        <title>Enfield — Bid Board</title>
        <meta name="viewport" content="width=300" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={s.root}>

        {/* HEADER */}
        <div style={s.header}>
          <div style={s.logo}>ENFIELD</div>
          <div style={s.sub}>BID BOARD</div>
        </div>

        {/* LIST */}
        <div style={s.list}>
          {loading && (
            <div style={s.msg}>
              <div style={s.spinner} />
              Loading…
            </div>
          )}
          {error && !loading && (
            <div style={{ ...s.msg, color: RED }}>⚠ {error}</div>
          )}
          {!loading && !error && deals.length === 0 && (
            <div style={s.msg}>Waiting for first webhook…</div>
          )}

          {deals.map((deal, i) => {
            const due = getDueInfo(deal.dueDate);
            const amt = formatAmount(deal.amount);
            return (
              <div key={deal.id || i} style={{
                ...s.card,
                background:      due.urgent ? "#1c1010" : "#161616",
                border:          `1px solid ${due.urgent ? "#3a1515" : "#222"}`,
                borderLeftColor: due.color,
                borderLeftWidth: 4,
                borderLeftStyle: "solid",
              }}>

                {/* Due label */}
                <div style={{ ...s.dueRow, color: due.color }}>
                  {due.pulse && <span style={s.dot} />}
                  <span style={s.dueLabel}>{due.label}</span>
                </div>

                {/* Due time */}
                {due.timeLabel && (
                  <div style={s.dueTime}>{due.timeLabel}</div>
                )}

                {/* Deal name */}
                <div style={s.dealName}>{deal.name}</div>

                {/* Amount */}
                {amt && <div style={s.amount}>{amt}</div>}

                {/* Owner */}
                <div style={s.ownerRow}>
                  <span style={s.avatar}>{initials(deal.owner)}</span>
                  <span style={s.ownerName}>{deal.owner}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div style={s.footer}>
          {updatedAt
            ? `Updated ${updatedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
            : "Waiting for data"}
        </div>

      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#111;overflow-x:hidden}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#111}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.15}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </>
  );
}

const s = {
  root:      { width:300, minHeight:"100vh", background:"#111", fontFamily:"'DM Sans',sans-serif", display:"flex", flexDirection:"column", borderRight:`3px solid ${RED}` },
  header:    { background:RED, padding:"12px 14px 10px", textAlign:"center", borderBottom:`2px solid ${MED_RED}`, flexShrink:0 },
  logo:      { color:"#fff", fontSize:20, fontWeight:700, fontFamily:"'DM Serif Display',serif", letterSpacing:3 },
  sub:       { color:LIGHT_RED, fontSize:10, letterSpacing:2, opacity:0.8, marginTop:2 },
  list:      { flex:1, overflowY:"auto", padding:"10px 0" },
  card:      { margin:"0 10px 12px", borderRadius:4, padding:"12px 12px 10px", position:"relative" },
  dueRow:    { display:"flex", alignItems:"center", gap:6, marginBottom:4 },
  dot:       { width:8, height:8, borderRadius:"50%", background:RED, display:"inline-block", animation:"pulse 1.4s ease-in-out infinite", flexShrink:0 },
  dueLabel:  { fontSize:19, fontWeight:800, letterSpacing:1, textTransform:"uppercase" },
  dueTime:   { color:GREY, fontSize:13, marginBottom:7, letterSpacing:0.3 },
  dealName:  { color:"#eee", fontSize:17, fontWeight:600, lineHeight:1.35, marginBottom:8 },
  amount:    { color:LIGHT_RED, fontSize:22, fontFamily:"'DM Serif Display',serif", marginBottom:8 },
  ownerRow:  { display:"flex", alignItems:"center", gap:7 },
  avatar:    { width:26, height:26, borderRadius:"50%", background:RED, color:"#fff", fontSize:11, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  ownerName: { color:"#ccc", fontSize:16, fontWeight:500 },
  msg:       { color:GREY, fontSize:13, textAlign:"center", padding:"20px 12px", display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  spinner:   { width:18, height:18, border:"2px solid #333", borderTop:`2px solid ${RED}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  footer:    { background:"#0e0e0e", borderTop:"1px solid #1f1f1f", padding:"8px 12px", textAlign:"center", color:"#333", fontSize:9, letterSpacing:0.5, flexShrink:0 },
};
