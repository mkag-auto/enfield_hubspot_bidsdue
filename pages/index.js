import { useEffect, useState, useCallback } from "react";
import Head from "next/head";

const RED = "#851e20";
const MED_RED = "#B84042";
const LIGHT_RED = "#F7ECEC";
const GREY = "#878787";

function getDueInfo(dueDateStr) {
  if (!dueDateStr) return { label: "No Date", groupKey: "no-date", timeLabel: null, color: GREY, urgent: false, pulse: false, sortOrder: 9999 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diff = Math.round((dueDay - today) / (1000 * 60 * 60 * 24));

  const timeLabel = due.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });

  if (diff < 0)   return { label: "OVERDUE",  groupKey: "overdue",  timeLabel, color: RED,     urgent: true,  pulse: true,  sortOrder: -1  };
  if (diff === 0) return { label: "TODAY",    groupKey: "today",    timeLabel, color: RED,     urgent: true,  pulse: true,  sortOrder: 0   };
  if (diff === 1) return { label: "TOMORROW", groupKey: "tomorrow", timeLabel, color: MED_RED, urgent: true,  pulse: false, sortOrder: 1   };
  if (diff <= 7) {
    const day = due.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
    return { label: day.toUpperCase(), groupKey: `week-${diff}`, timeLabel, color: MED_RED, urgent: true, pulse: false, sortOrder: diff };
  }
  const label = due.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
  return { label, groupKey: label, timeLabel, color: GREY, urgent: false, pulse: false, sortOrder: diff };
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

function groupDeals(deals) {
  const groups = [];
  const seen = {};

  for (const deal of deals) {
    const due = getDueInfo(deal.dueDate);
    if (!seen[due.groupKey]) {
      seen[due.groupKey] = { label: due.label, color: due.color, urgent: due.urgent, pulse: due.pulse, sortOrder: due.sortOrder, deals: [] };
      groups.push(seen[due.groupKey]);
    }
    seen[due.groupKey].deals.push({ ...deal, due });
  }

  groups.sort((a, b) => a.sortOrder - b.sortOrder);
  return groups;
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

  const groups = groupDeals(deals);

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

          {groups.map((group) => (
            <div key={group.label} style={s.group}>

              {/* DATE GROUP HEADER */}
              <div style={{ ...s.groupHeader, color: group.color, borderColor: group.color }}>
                {group.pulse && <span style={{ ...s.dot, background: group.color }} />}
                <span style={s.groupLabel}>{group.label}</span>
                <span style={{ ...s.groupCount, color: group.color }}>{group.deals.length}</span>
              </div>

              {/* DEALS WITHIN GROUP */}
              {group.deals.map((deal, i) => {
                const amt = formatAmount(deal.amount);
                return (
                  <div key={deal.id || i} style={{
                    ...s.card,
                    background:      group.urgent ? "#1c1010" : "#161616",
                    border:          `1px solid ${group.urgent ? "#3a1515" : "#222"}`,
                    borderLeftColor: group.color,
                    borderLeftWidth: 4,
                    borderLeftStyle: "solid",
                  }}>

                    {/* Time — date label is now the group header */}
                    {deal.due.timeLabel && (
                      <div style={s.dueTime}>{deal.due.timeLabel}</div>
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
          ))}
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
  root:        { width:300, minHeight:"100vh", background:"#111", fontFamily:"'DM Sans',sans-serif", display:"flex", flexDirection:"column", borderRight:`3px solid ${RED}` },
  header:      { background:RED, padding:"12px 14px 10px", textAlign:"center", borderBottom:`2px solid ${MED_RED}`, flexShrink:0 },
  logo:        { color:"#fff", fontSize:20, fontWeight:700, fontFamily:"'DM Serif Display',serif", letterSpacing:3 },
  sub:         { color:LIGHT_RED, fontSize:10, letterSpacing:2, opacity:0.8, marginTop:2 },
  list:        { flex:1, overflowY:"auto", padding:"10px 0" },

  // Groups
  group:       { marginBottom:8 },
  groupHeader: { display:"flex", alignItems:"center", gap:8, padding:"6px 12px 5px", borderBottom:"1px solid", marginBottom:4 },
  groupLabel:  { fontSize:19, fontWeight:800, letterSpacing:1, textTransform:"uppercase", flex:1 },
  groupCount:  { fontSize:13, fontWeight:700, opacity:0.7 },
  dot:         { width:8, height:8, borderRadius:"50%", display:"inline-block", animation:"pulse 1.4s ease-in-out infinite", flexShrink:0 },

  // Cards — exact sizes from your original
  card:        { margin:"0 10px 12px", borderRadius:4, padding:"12px 12px 10px", position:"relative" },
  dueTime:     { color:GREY, fontSize:13, marginBottom:7, letterSpacing:0.3 },
  dealName:    { color:"#eee", fontSize:17, fontWeight:600, lineHeight:1.35, marginBottom:8 },
  amount:      { color:LIGHT_RED, fontSize:22, fontFamily:"'DM Serif Display',serif", marginBottom:8 },
  ownerRow:    { display:"flex", alignItems:"center", gap:7 },
  avatar:      { width:26, height:26, borderRadius:"50%", background:RED, color:"#fff", fontSize:11, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  ownerName:   { color:"#ccc", fontSize:16, fontWeight:500 },
  msg:         { color:GREY, fontSize:13, textAlign:"center", padding:"20px 12px", display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  spinner:     { width:18, height:18, border:"2px solid #333", borderTop:`2px solid ${RED}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  footer:      { background:"#0e0e0e", borderTop:"1px solid #1f1f1f", padding:"8px 12px", textAlign:"center", color:"#333", fontSize:9, letterSpacing:0.5, flexShrink:0 },
};
