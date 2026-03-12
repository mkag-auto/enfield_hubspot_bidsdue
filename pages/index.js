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

  if (diff < 0)  return { label: "OVERDUE",  groupKey: "overdue",   timeLabel, color: RED,     urgent: true,  pulse: true,  sortOrder: -1 };
  if (diff === 0) return { label: "TODAY",    groupKey: "today",     timeLabel, color: RED,     urgent: true,  pulse: true,  sortOrder: 0  };
  if (diff === 1) return { label: "TOMORROW", groupKey: "tomorrow",  timeLabel, color: MED_RED, urgent: true,  pulse: false, sortOrder: 1  };
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

// Group deals by their due date label, preserving sort order
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

  // Sort groups chronologically
  groups.sort((a, b) => a.sortOrder - b.sortOrder);
  return groups;
}

export default function BidBoard() {
  const [deals, setDeals]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [updatedAt, setUpdatedAt]   = useState(null);
  const [now, setNow]               = useState(new Date());

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
    const clock   = setInterval(() => setNow(new Date()), 30000);
    return () => { clearInterval(refresh); clearInterval(clock); };
  }, [fetchDeals]);

  const timeStr     = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dateStr     = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const urgentCount = deals.filter(d => getDueInfo(d.dueDate).urgent).length;
  const groups      = groupDeals(deals);

  return (
    <>
      <Head>
        <title>Enfield — Bid Board</title>
        <meta name="viewport" content="width=220" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={s.root}>

        {/* HEADER */}
        <div style={s.header}>
          <div style={s.logo}>ENFIELD</div>
          <div style={s.sub}>BID BOARD</div>
          <div style={s.time}>{timeStr}</div>
          <div style={s.date}>{dateStr}</div>
        </div>

        {/* STATS */}
        <div style={s.statsBar}>
          <div style={s.pill}>
            <span style={{ ...s.badge, background: RED }}>{deals.length}</span>
            <span style={s.statLabel}>BIDDING</span>
          </div>
          {urgentCount > 0 && (
            <div style={s.pill}>
              <span style={{ ...s.badge, background: MED_RED }}>{urgentCount}</span>
              <span style={s.statLabel}>THIS WEEK</span>
            </div>
          )}
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

              {/* DEALS WITHIN GROUP — compact rows */}
              {group.deals.map((deal, i) => {
                const amt = formatAmount(deal.amount);
                return (
                  <div key={deal.id || i} style={{
                    ...s.card,
                    background: group.urgent ? "#1c1010" : "#161616",
                    border: `1px solid ${group.urgent ? "#3a1515" : "#222"}`,
                    borderLeftColor: group.color,
                    borderLeftWidth: 3,
                    borderLeftStyle: "solid",
                  }}>
                    {/* Time (only shown once per deal, not the date label — that's the header) */}
                    {deal.due.timeLabel && (
                      <div style={s.dueTime}>{deal.due.timeLabel}</div>
                    )}

                    {/* Deal name */}
                    <div style={s.dealName}>{deal.name}</div>

                    {/* Amount + Owner on same row */}
                    <div style={s.metaRow}>
                      {amt && <span style={s.amount}>{amt}</span>}
                      <div style={s.ownerRow}>
                        <span style={s.avatar}>{initials(deal.owner)}</span>
                        <span style={s.ownerName}>{deal.owner}</span>
                      </div>
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
  root:        { width:220, minHeight:"100vh", background:"#111", fontFamily:"'DM Sans',sans-serif", display:"flex", flexDirection:"column", borderRight:`3px solid ${RED}` },
  header:      { background:RED, padding:"14px 12px 10px", textAlign:"center", borderBottom:`2px solid ${MED_RED}`, flexShrink:0 },
  logo:        { color:"#fff", fontSize:15, fontWeight:700, fontFamily:"'DM Serif Display',serif", letterSpacing:3 },
  sub:         { color:LIGHT_RED, fontSize:8, letterSpacing:2, opacity:0.8, marginTop:1 },
  time:        { color:LIGHT_RED, fontSize:13, fontWeight:600, marginTop:7 },
  date:        { color:LIGHT_RED, fontSize:9, opacity:0.7, marginTop:2 },
  statsBar:    { background:"#1a1a1a", borderBottom:"1px solid #2a2a2a", padding:"6px 10px", display:"flex", gap:8, alignItems:"center", flexShrink:0 },
  pill:        { display:"flex", alignItems:"center", gap:5 },
  badge:       { color:"#fff", borderRadius:2, fontSize:10, fontWeight:700, padding:"1px 5px", minWidth:18, textAlign:"center" },
  statLabel:   { color:GREY, fontSize:8, letterSpacing:0.8 },
  list:        { flex:1, overflowY:"auto", padding:"6px 0 8px" },

  // Groups
  group:       { marginBottom:6 },
  groupHeader: { display:"flex", alignItems:"center", gap:5, padding:"5px 10px 4px", borderBottom:"1px solid", marginBottom:2 },
  groupLabel:  { fontSize:8, fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", flex:1 },
  groupCount:  { fontSize:8, fontWeight:700, opacity:0.7 },
  dot:         { width:5, height:5, borderRadius:"50%", display:"inline-block", animation:"pulse 1.4s ease-in-out infinite", flexShrink:0 },

  // Cards — more compact now that date is hoisted to header
  card:        { margin:"0 8px 6px", borderRadius:3, padding:"7px 9px 6px", position:"relative" },
  dueTime:     { color:GREY, fontSize:8, marginBottom:3, letterSpacing:0.3 },
  dealName:    { color:"#eee", fontSize:11, fontWeight:600, lineHeight:1.3, marginBottom:4 },
  metaRow:     { display:"flex", alignItems:"center", justifyContent:"space-between", gap:4 },
  amount:      { color:LIGHT_RED, fontSize:12, fontFamily:"'DM Serif Display',serif", flexShrink:0 },
  ownerRow:    { display:"flex", alignItems:"center", gap:4, minWidth:0 },
  avatar:      { width:15, height:15, borderRadius:"50%", background:RED, color:"#fff", fontSize:6, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  ownerName:   { color:GREY, fontSize:9, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },

  msg:         { color:GREY, fontSize:10, textAlign:"center", padding:"20px 12px", display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  spinner:     { width:16, height:16, border:"2px solid #333", borderTop:`2px solid ${RED}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  footer:      { background:"#0e0e0e", borderTop:"1px solid #1f1f1f", padding:"7px 12px", textAlign:"center", color:"#333", fontSize:8, letterSpacing:0.5, flexShrink:0 },
};
