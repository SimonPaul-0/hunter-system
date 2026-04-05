import { useState, useEffect, useRef } from "react";

/* ══════ CONSTANTS ══════════════════════════════════════════ */
const RANKS = [
  { i:0, label:"E",        color:"#64748b", glow:"#64748b44", next:500,    minQ:2, bonusXP:15  },
  { i:1, label:"D",        color:"#34d399", glow:"#34d39944", next:2500,   minQ:3, bonusXP:25  },
  { i:2, label:"C",        color:"#38bdf8", glow:"#38bdf844", next:7000,   minQ:3, bonusXP:40  },
  { i:3, label:"B",        color:"#a78bfa", glow:"#a78bfa44", next:18000,  minQ:4, bonusXP:60  },
  { i:4, label:"A",        color:"#fb923c", glow:"#fb923c44", next:40000,  minQ:5, bonusXP:90  },
  { i:5, label:"S",        color:"#fbbf24", glow:"#fbbf2444", next:100000, minQ:6, bonusXP:140 },
  { i:6, label:"National", color:"#f472b6", glow:"#f472b644", next:250000, minQ:6, bonusXP:200 },
  { i:7, label:"Monarch",  color:"#c084fc", glow:"#c084fc44", next:null,   minQ:7, bonusXP:350 },
];
const SC = {
  STR:{ label:"Strength",    icon:"⚔️",  c:"#ef4444", desc:"Gym & workouts"       },
  AGI:{ label:"Agility",     icon:"💨",  c:"#38bdf8", desc:"Cardio & running"     },
  VIT:{ label:"Vitality",    icon:"💚",  c:"#22c55e", desc:"Sleep & nutrition"    },
  INT:{ label:"Intelligence",icon:"📚",  c:"#818cf8", desc:"Study & reading"      },
  PER:{ label:"Perception",  icon:"👁️", c:"#eab308", desc:"Mindfulness & focus"  },
  CHA:{ label:"Charisma",    icon:"✨",  c:"#ec4899", desc:"Social interactions"  },
};
const SK = ["STR","AGI","VIT","INT","PER","CHA"];
const QP = [
  { id:"gym",      name:"Train at Gym",      icon:"🏋️", xp:80, stats:{ STR:3, VIT:1 }, diff:"normal" },
  { id:"run",      name:"Morning Run",       icon:"🏃", xp:60, stats:{ AGI:3, VIT:1 }, diff:"normal" },
  { id:"stretch",  name:"Stretch/Mobility",  icon:"🤸", xp:35, stats:{ AGI:2 },        diff:"easy"   },
  { id:"eat",      name:"Eat Clean",         icon:"🥗", xp:50, stats:{ VIT:3 },        diff:"easy"   },
  { id:"water",    name:"Drink 2L Water",    icon:"💧", xp:30, stats:{ VIT:2 },        diff:"easy"   },
  { id:"sleep",    name:"Sleep 8 Hours",     icon:"😴", xp:50, stats:{ VIT:4 },        diff:"easy"   },
  { id:"cold",     name:"Cold Shower",       icon:"🚿", xp:45, stats:{ STR:1, PER:2 }, diff:"hard"   },
  { id:"study",    name:"Study 1+ Hour",     icon:"📖", xp:70, stats:{ INT:4 },        diff:"normal" },
  { id:"meditate", name:"Meditate",          icon:"🧘", xp:40, stats:{ PER:3, INT:1 }, diff:"easy"   },
  { id:"read",     name:"Read 30 Min",       icon:"📕", xp:40, stats:{ INT:3, PER:1 }, diff:"easy"   },
  { id:"social",   name:"Meaningful Talk",   icon:"💬", xp:35, stats:{ CHA:3 },        diff:"easy"   },
  { id:"journal",  name:"Journal Entry",     icon:"📝", xp:30, stats:{ INT:1, PER:2 }, diff:"easy"   },
];
const DM    = { easy:1.0, normal:1.5, hard:2.0 };
const td    = () => new Date().toISOString().slice(0,10);
const genId = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
const INIT  = {
  name:"Hunter", totalXP:0, hunterId:null,
  statXP:{ STR:0, AGI:0, VIT:0, INT:0, PER:0, CHA:0 },
  streak:0, longestStreak:0, lastDay:null,
  dailyLog:{}, activePresets:["gym","eat","water","sleep"], customQuests:[],
};

/* ══════ localStorage STORAGE HELPERS ═══════════════════════ */
const storage = {
  get: (key) => {
    try {
      const val = localStorage.getItem(key);
      return val ? { value: val } : null;
    } catch { return null; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  },
};

/* ══════ HELPERS ════════════════════════════════════════════ */
function rankInfo(xp) {
  let rem = xp;
  for (let i = 0; i < RANKS.length; i++) {
    const r = RANKS[i];
    if (!r.next || rem < r.next) {
      return { r, rem, pct: r.next ? Math.min(100, (rem / r.next) * 100) : 100 };
    }
    rem -= r.next;
  }
  return { r: RANKS[RANKS.length - 1], rem: xp, pct: 100 };
}
function sLvl(xp) { return Math.max(1, Math.floor(1 + Math.sqrt((xp || 0) / 30))); }
function sLvlPct(xp) {
  const lv = sLvl(xp);
  const base = Math.pow(lv - 1, 2) * 30;
  const next = Math.pow(lv, 2) * 30;
  return Math.min(100, ((xp - base) / (next - base)) * 100);
}

/* ══════ CSS ════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #03030a; font-family: 'Rajdhani', sans-serif; color: #e2e8f0; min-height: 100vh; overscroll-behavior: none; }
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb { background: #1a1a35; border-radius: 2px; }
input, textarea {
  background: #08081a; border: 1px solid #1a1a35; color: #e2e8f0;
  border-radius: 8px; padding: 10px 14px;
  font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 500;
  outline: none; width: 100%;
}
input:focus, textarea:focus { border-color: #6d28d9; box-shadow: 0 0 0 1px #6d28d966; }
button { cursor: pointer; font-family: 'Rajdhani', sans-serif; }
select {
  background: #08081a; border: 1px solid #1a1a35; color: #e2e8f0;
  border-radius: 8px; padding: 10px 14px;
  font-family: 'Rajdhani', sans-serif; font-size: 14px; outline: none; width: 100%;
}
@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes toastIn { from { opacity:0; transform:translateX(110%); } to { opacity:1; transform:translateX(0); } }
@keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translateX(110%); } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
@keyframes floatY { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }
@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
@keyframes blinkCur { 0%,100% { opacity:1; } 50% { opacity:0; } }
.fade-up { animation: fadeUp 0.4s ease; }
.float-anim { animation: floatY 3.5s ease-in-out infinite; }
.pulse-anim { animation: pulse 2s ease-in-out infinite; }
.spin-el { display:inline-block; animation: spin 0.9s linear infinite; }
.blink-cur::after { content: "▌"; animation: blinkCur 0.8s infinite; }
`;

/* ══════ HEX RADAR ══════════════════════════════════════════ */
function HexChart({ statXP }) {
  const cx = 100, cy = 100, R = 72, ML = 40;
  const angle = (i) => (Math.PI * 2 * i) / 6 - Math.PI / 2;

  const lvls = SK.map((k) => Math.min(sLvl(statXP[k] || 0), ML));
  const web = SK.map((k, i) => {
    const f = lvls[i] / ML;
    return [cx + R * f * Math.cos(angle(i)), cy + R * f * Math.sin(angle(i))];
  });

  function gridPath(f) {
    const pts = SK.map((_, i) => [cx + R * f * Math.cos(angle(i)), cy + R * f * Math.sin(angle(i))]);
    return pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
  }

  const webPath = web.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";

  return (
    <svg width={200} height={200} viewBox="0 0 200 200" style={{ overflow: "visible" }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <path key={f} d={gridPath(f)} fill="none" stroke="#1a1a35" strokeWidth="1" />
      ))}
      {SK.map((_, i) => (
        <line key={i} x1={cx} y1={cy}
          x2={cx + R * Math.cos(angle(i))} y2={cy + R * Math.sin(angle(i))}
          stroke="#1a1a35" strokeWidth="1" />
      ))}
      <path d={webPath} fill="rgba(109,40,217,0.18)" stroke="#7c3aed" strokeWidth="2"
        style={{ filter: "drop-shadow(0 0 6px #7c3aed88)" }} />
      {web.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="4" fill={SC[SK[i]].c}
          style={{ filter: `drop-shadow(0 0 5px ${SC[SK[i]].c})` }} />
      ))}
      {SK.map((k, i) => {
        const lx = cx + (R + 18) * Math.cos(angle(i));
        const ly = cy + (R + 18) * Math.sin(angle(i));
        return (
          <text key={k} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fill={SC[k].c} fontSize="10" fontWeight="700" fontFamily="Rajdhani,sans-serif"
            style={{ filter: `drop-shadow(0 0 4px ${SC[k].c}88)` }}>
            {k}
          </text>
        );
      })}
    </svg>
  );
}

/* ══════ HOME ═══════════════════════════════════════════════ */
function HomePanel({ s }) {
  const { r, pct } = rankInfo(s.totalXP);
  const today = td();
  const log = s.dailyLog[today] || { completed: [] };
  const allQ = [...QP.filter((q) => s.activePresets.includes(q.id)), ...s.customQuests];
  const done = log.completed.length;
  const tsl = SK.reduce((a, k) => a + sLvl(s.statXP[k] || 0), 0);
  const needMore = Math.max(0, r.minQ - done);

  return (
    <div className="fade-up" style={{ padding: "20px 16px 100px" }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ fontFamily: "Orbitron", fontSize: 10, letterSpacing: 5, color: "#334155", marginBottom: 6 }}>
          ◆ SYSTEM INTERFACE ◆
        </div>
        <h1 style={{
          fontFamily: "Orbitron", fontSize: 24, fontWeight: 900, letterSpacing: 2,
          background: "linear-gradient(135deg,#7c3aed,#3b82f6)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 0 18px #7c3aed88)", marginBottom: 4,
        }}>HUNTER SYSTEM</h1>
        <div style={{ fontSize: 13, color: "#475569", letterSpacing: 2, fontWeight: 600 }}>
          WELCOME BACK, {s.name.toUpperCase()}
        </div>
      </div>

      {/* Rank card */}
      <div className="float-anim" style={{
        borderRadius: 20, padding: "22px", marginBottom: 13,
        background: "linear-gradient(135deg,#06061a,#0a0a1e)",
        border: `1.5px solid ${r.color}33`,
        boxShadow: `0 0 40px ${r.glow},inset 0 0 50px ${r.color}06`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -30, right: -30, width: 150, height: 150,
          background: `radial-gradient(circle,${r.color}15,transparent 70%)`,
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "Orbitron", fontSize: 9, letterSpacing: 3, color: "#475569", marginBottom: 5 }}>
              CURRENT RANK
            </div>
            <div style={{
              fontFamily: "Orbitron", fontSize: 34, fontWeight: 900,
              color: r.color, textShadow: `0 0 18px ${r.color}`, lineHeight: 1,
            }}>{r.label}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: 2, marginBottom: 3 }}>STREAK</div>
            <div style={{
              fontFamily: "Orbitron", fontSize: 24, fontWeight: 700,
              color: s.streak > 0 ? "#fbbf24" : "#334155",
              textShadow: s.streak > 0 ? "0 0 12px #fbbf2488" : "none",
            }}>
              {s.streak}<span style={{ fontSize: 11, fontFamily: "Rajdhani" }}>d</span>
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: r.color }}>{s.totalXP.toLocaleString()} XP</span>
            <span style={{ color: "#334155" }}>
              {r.next ? `${r.next.toLocaleString()} to ${RANKS[r.i + 1]?.label || "MAX"}` : "MAX RANK"}
            </span>
          </div>
          <div style={{ height: 7, background: "#0a0a1a", borderRadius: 7, border: `1px solid ${r.color}22`, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: `linear-gradient(90deg,${r.color}77,${r.color})`,
              borderRadius: 7, boxShadow: `0 0 10px ${r.color}77`,
              transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
            }} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid #1a1a35" }}>
          {SK.map((k) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, marginBottom: 1 }}>{SC[k].icon}</div>
              <div style={{ fontFamily: "Orbitron", fontSize: 12, fontWeight: 700, color: SC[k].c }}>
                {sLvl(s.statXP[k] || 0)}
              </div>
              <div style={{ fontSize: 8, color: "#334155", letterSpacing: 1 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's status */}
      <div style={{
        background: "#06061a", borderRadius: 15, padding: "15px", marginBottom: 11,
        border: `1px solid ${needMore > 0 ? "#ef444422" : "#22c55e22"}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "Orbitron", fontSize: 9, letterSpacing: 3, color: "#475569" }}>TODAY</div>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1,
            color: needMore === 0 ? "#22c55e" : needMore === 1 ? "#fbbf24" : "#ef4444",
          }}>
            {needMore === 0 ? `✓ ${done}/${allQ.length} DONE` : `⚠ ${needMore} MORE NEEDED (${done}/${r.minQ} min)`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {allQ.map((q) => {
            const isDone = log.completed.includes(q.id);
            return (
              <div key={q.id} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 8px",
                borderRadius: 7, fontSize: 11, fontWeight: 600,
                background: isDone ? "#0f2a1a" : "#0a0a18",
                border: `1px solid ${isDone ? "#22c55e44" : "#1a1a35"}`,
                color: isDone ? "#22c55e" : "#334155",
              }}>
                {q.icon} {isDone ? "✓" : ""} {q.name}
              </div>
            );
          })}
        </div>
        {allQ.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#334155", fontStyle: "italic" }}>
            Go to the <span style={{ color: "#a78bfa", fontWeight: 700 }}>QUESTS tab</span> to log each one ↓
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {[
          { label: "LONGEST STREAK", v: `${s.longestStreak}d`, icon: "🏆", c: "#fbbf24" },
          { label: "TOTAL STAT LVL",  v: tsl,                   icon: "📊", c: "#818cf8" },
          { label: "QUESTS TODAY",    v: `${done}/${allQ.length}`, icon: "📋", c: "#38bdf8" },
          { label: "DAYS LOGGED",     v: Object.keys(s.dailyLog).length, icon: "📅", c: "#34d399" },
        ].map((c) => (
          <div key={c.label} style={{ background: "#06061a", borderRadius: 11, padding: "12px", border: "1px solid #1a1a35" }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{c.icon}</div>
            <div style={{ fontFamily: "Orbitron", fontSize: 19, fontWeight: 700, color: c.c }}>{c.v}</div>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: 1.5, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 11, padding: "11px 13px", borderRadius: 9, background: "#06060f", border: "1px solid #1a1a35" }}>
        <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.65 }}>
          <span style={{ color: "#ef4444", fontWeight: 700 }}>⚡ WARNING: </span>
          Miss <span style={{ color: r.color, fontWeight: 700 }}>{r.minQ} quests/day</span> and your streak breaks —{" "}
          <span style={{ color: "#ef4444" }}>XP resets to ZERO</span>. Higher ranks demand more. Complete{" "}
          <span style={{ color: "#fbbf24" }}>extra quests for bonus XP</span>.
        </div>
      </div>
    </div>
  );
}

/* ══════ STATS ══════════════════════════════════════════════ */
function StatsPanel({ s }) {
  const { r } = rankInfo(s.totalXP);
  return (
    <div className="fade-up" style={{ padding: "20px 16px 100px" }}>
      <div style={{ fontFamily: "Orbitron", fontSize: 10, letterSpacing: 4, color: "#334155", marginBottom: 18, textAlign: "center" }}>
        ◆ HUNTER STATISTICS ◆
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <HexChart statXP={s.statXP} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {SK.map((k) => {
          const xp = s.statXP[k] || 0;
          const lv = sLvl(xp);
          const pct = sLvlPct(xp);
          return (
            <div key={k} style={{
              background: "#06061a", borderRadius: 13, padding: "13px",
              border: `1px solid ${SC[k].c}22`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ fontSize: 19 }}>{SC[k].icon}</span>
                  <div>
                    <div style={{ fontFamily: "Orbitron", fontSize: 11, fontWeight: 700, color: SC[k].c, letterSpacing: 1 }}>
                      {SC[k].label.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 10, color: "#334155", marginTop: 1 }}>{SC[k].desc}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "Orbitron", fontSize: 20, fontWeight: 900, color: SC[k].c, textShadow: `0 0 10px ${SC[k].c}88` }}>
                    {lv}
                  </div>
                  <div style={{ fontSize: 8, color: "#334155", letterSpacing: 1 }}>LEVEL</div>
                </div>
              </div>
              <div style={{ height: 5, background: "#0a0a18", borderRadius: 5, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: `linear-gradient(90deg,${SC[k].c}88,${SC[k].c})`,
                  borderRadius: 5, boxShadow: `0 0 6px ${SC[k].c}66`, transition: "width 0.6s ease",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "#334155" }}>
                <span>{xp} XP</span>
                <span>{Math.round(pct)}% → lv {lv + 1}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, background: "#06061a", borderRadius: 13, padding: "14px", border: "1px solid #1a1a35" }}>
        <div style={{ fontFamily: "Orbitron", fontSize: 9, letterSpacing: 3, color: "#334155", marginBottom: 11 }}>
          RANK LADDER
        </div>
        {RANKS.map((rk) => {
          const isCur = rk.i === r.i;
          const passed = rk.i < r.i;
          return (
            <div key={rk.i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "7px 9px", borderRadius: 7, marginBottom: 3,
              background: isCur ? `${rk.color}12` : "transparent",
              borderLeft: isCur ? `2px solid ${rk.color}` : "2px solid transparent",
              opacity: passed ? 0.28 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontFamily: "Orbitron", fontSize: 12, fontWeight: 700, color: rk.color }}>{rk.label}</span>
                {isCur && <span style={{ fontSize: 9, color: rk.color, fontWeight: 700 }}>◄ YOU</span>}
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#475569" }}>
                <span>{rk.minQ} quests/day min</span>
                <span style={{ color: rk.color }}>+{rk.bonusXP} bonus</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════ QUESTS ═════════════════════════════════════════════ */
function QuestsPanel({ s, setState, toast }) {
  const [sub, setSub] = useState("today");
  const [adding, setAdding] = useState(false);
  const [newQ, setNewQ] = useState({ name: "", icon: "⚡", xp: 50, stats: {}, diff: "normal" });
  const [si, setSI] = useState({ STR: "", AGI: "", VIT: "", INT: "", PER: "", CHA: "" });

  const today = td();
  const log = s.dailyLog[today] || { completed: [], xpGained: 0, statGained: {} };
  const { r } = rankInfo(s.totalXP);
  const allQ = [...QP.filter((q) => s.activePresets.includes(q.id)), ...s.customQuests];
  const DC = { easy: "#22c55e", normal: "#fbbf24", hard: "#ef4444" };
  const doneCount = log.completed.length;

  function completeQuest(q) {
    if (log.completed.includes(q.id)) {
      toast("Already completed today!", "warn");
      return;
    }
    const isBonus = doneCount >= r.minQ;
    const xpGain = Math.round(q.xp * DM[q.diff]) + (isBonus ? r.bonusXP : 0);

    setState((prev) => {
      const pl = prev.dailyLog[today] || { completed: [], xpGained: 0, statGained: {} };
      const nsx = { ...prev.statXP };
      const nsg = { ...pl.statGained };
      Object.entries(q.stats || {}).forEach(([k, v]) => {
        nsx[k] = (nsx[k] || 0) + v;
        nsg[k] = (nsg[k] || 0) + v;
      });
      const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let ns = prev.streak;
      if (!prev.lastDay || prev.lastDay === yest) ns = prev.streak + 1;
      else if (prev.lastDay === today) ns = prev.streak;
      return {
        ...prev,
        totalXP: prev.totalXP + xpGain,
        statXP: nsx,
        streak: ns,
        longestStreak: Math.max(prev.longestStreak, ns),
        lastDay: today,
        dailyLog: {
          ...prev.dailyLog,
          [today]: {
            completed: [...pl.completed, q.id],
            xpGained: (pl.xpGained || 0) + xpGain,
            statGained: nsg,
          },
        },
      };
    });
    toast(isBonus ? `🔥 BONUS! +${xpGain} XP` : `💪 +${xpGain} XP — ${q.name}`, isBonus ? "bonus" : "xp");
  }

  function addCustom() {
    if (!newQ.name.trim()) { toast("Quest needs a name", "warn"); return; }
    const stats = {};
    Object.entries(si).forEach(([k, v]) => { const n = parseInt(v); if (n > 0) stats[k] = n; });
    setState((prev) => ({ ...prev, customQuests: [...prev.customQuests, { ...newQ, id: `c-${Date.now()}`, stats }] }));
    setNewQ({ name: "", icon: "⚡", xp: 50, stats: {}, diff: "normal" });
    setSI({ STR: "", AGI: "", VIT: "", INT: "", PER: "", CHA: "" });
    setAdding(false);
    toast("Quest created!", "success");
  }

  return (
    <div className="fade-up" style={{ padding: "20px 16px 100px" }}>
      <div style={{ fontFamily: "Orbitron", fontSize: 10, letterSpacing: 4, color: "#334155", marginBottom: 16, textAlign: "center" }}>
        ◆ QUEST BOARD ◆
      </div>

      {sub === "today" && allQ.length > 0 && (
        <div style={{ background: "#0a0a1e", borderRadius: 10, padding: "10px 13px", marginBottom: 12, border: "1px solid #7c3aed22" }}>
          <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
            <span style={{ color: "#a78bfa", fontWeight: 700 }}>HOW TO COMPLETE: </span>
            Tap the <span style={{ color: "#a78bfa", fontWeight: 700 }}>+XP button</span> on any quest you've done today.
            You can complete <span style={{ color: "#fbbf24", fontWeight: 700 }}>ALL {allQ.length} quests</span> — every one beyond the {r.minQ}-quest minimum earns{" "}
            <span style={{ color: "#fbbf24", fontWeight: 700 }}>+{r.bonusXP} bonus XP</span> on top.
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 15, background: "#06061a", borderRadius: 10, padding: 4, border: "1px solid #1a1a35" }}>
        {["today", "presets", "custom"].map((t) => (
          <button key={t} onClick={() => setSub(t)} style={{
            flex: 1, padding: "7px", borderRadius: 7, border: "none",
            background: sub === t ? "#0f0f30" : "transparent",
            color: sub === t ? "#a78bfa" : "#334155",
            fontFamily: "Orbitron", fontSize: 8, fontWeight: 700, letterSpacing: 1.5, transition: "all 0.2s",
          }}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {sub === "today" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
            <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>
              {doneCount}/{allQ.length} completed
            </span>
            <span style={{ fontSize: 11, color: r.color, fontWeight: 700 }}>
              MIN {r.minQ} · {doneCount >= r.minQ ? "✓ MET" : `${r.minQ - doneCount} more to go`}
            </span>
          </div>
          {allQ.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#1e293b", fontSize: 13 }}>
              Enable quests in the Presets tab first.
            </div>
          )}
          {allQ.map((q) => {
            const done = log.completed.includes(q.id);
            const willBeBonus = !done && doneCount >= r.minQ;
            const xpV = Math.round(q.xp * DM[q.diff]) + (willBeBonus ? r.bonusXP : 0);
            return (
              <div key={q.id} style={{
                background: done ? "#0a1f14" : "#06061a",
                borderRadius: 13, padding: "13px", marginBottom: 7,
                border: `1px solid ${done ? "#22c55e33" : "#1a1a35"}`,
                opacity: done ? 0.65 : 1, transition: "all 0.3s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ fontSize: 22 }}>{q.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: done ? "#4ade80" : "#e2e8f0" }}>
                        {q.name}
                      </div>
                      <div style={{ display: "flex", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 9, padding: "1px 5px", borderRadius: 3,
                          background: `${DC[q.diff]}18`, color: DC[q.diff], fontWeight: 700, letterSpacing: 1,
                        }}>
                          {q.diff.toUpperCase()}
                        </span>
                        {Object.entries(q.stats || {}).map(([k, v]) => (
                          <span key={k} style={{
                            fontSize: 9, padding: "1px 5px", borderRadius: 3,
                            background: `${SC[k].c}18`, color: SC[k].c,
                          }}>+{v} {k}</span>
                        ))}
                        {willBeBonus && (
                          <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#fbbf2418", color: "#fbbf24", fontWeight: 700 }}>
                            🔥 BONUS +{r.bonusXP}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {done ? (
                    <div style={{ fontSize: 22, color: "#22c55e" }}>✓</div>
                  ) : (
                    <button
                      onClick={() => completeQuest(q)}
                      style={{
                        padding: "8px 14px", borderRadius: 8,
                        border: `1px solid ${willBeBonus ? "#fbbf2466" : "#7c3aed44"}`,
                        background: willBeBonus ? "#1a1400" : "#0f0f30",
                        color: willBeBonus ? "#fbbf24" : "#a78bfa",
                        fontFamily: "Orbitron", fontSize: 10, fontWeight: 700,
                        letterSpacing: 1, transition: "all 0.2s",
                        boxShadow: willBeBonus ? "0 0 12px #fbbf2422" : "none",
                      }}
                    >
                      +{xpV} XP
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sub === "presets" && (
        <div>
          <div style={{ fontSize: 12, color: "#334155", marginBottom: 11, lineHeight: 1.6 }}>
            Toggle which quests appear on your daily board.
          </div>
          {QP.map((q) => {
            const on = s.activePresets.includes(q.id);
            return (
              <div key={q.id}
                onClick={() => setState((p) => ({
                  ...p,
                  activePresets: on ? p.activePresets.filter((x) => x !== q.id) : [...p.activePresets, q.id],
                }))}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "#06061a", borderRadius: 11, padding: "11px", marginBottom: 6,
                  border: `1px solid ${on ? "#7c3aed44" : "#1a1a35"}`,
                  cursor: "pointer", boxShadow: on ? "0 0 10px #7c3aed11" : "none", transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 19 }}>{q.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: on ? "#e2e8f0" : "#475569" }}>{q.name}</div>
                    <div style={{ fontSize: 10, color: "#334155" }}>+{Math.round(q.xp * DM[q.diff])} XP</div>
                  </div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: on ? "#7c3aed" : "transparent",
                  border: `2px solid ${on ? "#7c3aed" : "#1e293b"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "#fff", transition: "all 0.2s",
                  boxShadow: on ? "0 0 8px #7c3aed" : "none",
                }}>
                  {on ? "✓" : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sub === "custom" && (
        <div>
          {s.customQuests.map((q) => (
            <div key={q.id} style={{
              background: "#06061a", borderRadius: 11, padding: "12px", marginBottom: 6,
              border: "1px solid #1a1a35", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 19 }}>{q.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{q.name}</div>
                  <div style={{ fontSize: 10, color: "#334155" }}>+{Math.round(q.xp * DM[q.diff])} XP · {q.diff}</div>
                </div>
              </div>
              <button
                onClick={() => setState((p) => ({ ...p, customQuests: p.customQuests.filter((x) => x.id !== q.id) }))}
                style={{ background: "transparent", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 6, padding: "3px 9px", fontSize: 11 }}
              >✕</button>
            </div>
          ))}
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              style={{
                width: "100%", padding: "12px", borderRadius: 11, marginTop: 4,
                background: "#0a0a1e", border: "1px dashed #7c3aed44",
                color: "#7c3aed", fontFamily: "Orbitron", fontSize: 10, letterSpacing: 2,
              }}
            >+ CREATE CUSTOM QUEST</button>
          ) : (
            <div style={{ background: "#06061a", borderRadius: 13, padding: "15px", border: "1px solid #7c3aed33", marginTop: 7 }}>
              <div style={{ fontFamily: "Orbitron", fontSize: 9, letterSpacing: 3, color: "#7c3aed", marginBottom: 11 }}>NEW QUEST</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, letterSpacing: 1 }}>QUEST NAME</div>
                <input value={newQ.name} onChange={(e) => setNewQ((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Evening Walk" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, letterSpacing: 1 }}>ICON</div>
                  <input value={newQ.icon} onChange={(e) => setNewQ((p) => ({ ...p, icon: e.target.value }))} style={{ textAlign: "center", fontSize: 18 }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, letterSpacing: 1 }}>BASE XP</div>
                  <input type="number" value={newQ.xp} min={10} max={200} onChange={(e) => setNewQ((p) => ({ ...p, xp: parseInt(e.target.value) || 50 }))} />
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, letterSpacing: 1 }}>DIFFICULTY</div>
                <select value={newQ.diff} onChange={(e) => setNewQ((p) => ({ ...p, diff: e.target.value }))}>
                  <option value="easy">Easy ×1.0</option>
                  <option value="normal">Normal ×1.5</option>
                  <option value="hard">Hard ×2.0</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 6, letterSpacing: 1 }}>STAT GAINS (optional)</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
                  {SK.map((k) => (
                    <div key={k}>
                      <div style={{ fontSize: 9, color: SC[k].c, marginBottom: 2 }}>{k}</div>
                      <input
                        type="number" min={0} max={10} value={si[k]}
                        onChange={(e) => setSI((p) => ({ ...p, [k]: e.target.value }))}
                        placeholder="0" style={{ padding: "5px 7px", textAlign: "center" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={addCustom}
                  style={{
                    flex: 1, padding: "11px", borderRadius: 9, border: "none",
                    background: "linear-gradient(135deg,#7c3aed,#3b82f6)", color: "#fff",
                    fontFamily: "Orbitron", fontSize: 10, fontWeight: 700, letterSpacing: 2,
                  }}
                >CREATE</button>
                <button
                  onClick={() => setAdding(false)}
                  style={{ padding: "11px 13px", borderRadius: 9, border: "1px solid #1a1a35", background: "transparent", color: "#475569", fontSize: 13 }}
                >✕</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════ AI ASSISTANT ═══════════════════════════════════════ */
function AssistantPanel({ s }) {
  const { r } = rankInfo(s.totalXP);
  const todayDone = (s.dailyLog[td()]?.completed || []).length;
  const statsLine = SK.map((k) => `${k} Lv.${sLvl(s.statXP[k] || 0)}`).join(" | ");

  const SYS = `You are THE SYSTEM — the cold, omniscient AI guide inside a Solo Leveling-inspired self-improvement app.

Speak EXACTLY like The System from Solo Leveling: clinical, authoritative, occasionally ominous. Use formats like [SYSTEM NOTIFICATION], [QUEST ASSIGNED], [WARNING], [ANALYSIS COMPLETE]. Address the user as "Hunter ${s.name}".

Hunter Profile:
- Name: ${s.name}
- Rank: ${r.label}-Rank (${r.i + 1}/8)
- Total XP: ${s.totalXP.toLocaleString()}
- Streak: ${s.streak} days | Best: ${s.longestStreak} days
- Stats: ${statsLine}
- Daily minimum: ${r.minQ} quests | Completed today: ${todayDone}

Give specific, personalized advice on fitness, nutrition, habits, mindset, studying, discipline. Reference their actual stats and rank. Be intense, demanding, but accurate. Keep to 3-5 sentences unless a detailed plan is asked for. Never break character.`;

  const initMsg = {
    role: "assistant",
    text: `[SYSTEM NOTIFICATION]\n\nHunter ${s.name} — profile recognized.\n\nRank: ${r.label}. Streak: ${s.streak} days. I have analyzed your stats.\n\n${statsLine}\n\nI observe every skipped rep, every late night, every choice. Ask me anything — training, nutrition, discipline, the path to Monarch.`,
  };

  const [msgs, setMsgs] = useState([initMsg]);
  const [inp, setInp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const histRef = useRef([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  async function send() {
    if (!inp.trim() || loading) return;
    const text = inp.trim();
    setInp("");
    setErrMsg("");
    setMsgs((p) => [...p, { role: "user", text }]);
    histRef.current = [...histRef.current, { role: "user", content: text }];
    setLoading(true);

    try {
      // Call our Vercel serverless function proxy instead of Anthropic directly
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYS,
          messages: histRef.current.slice(-16),
        }),
      });

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e?.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      const reply = data?.reply;
      if (!reply) throw new Error("Empty response.");

      histRef.current = [...histRef.current, { role: "assistant", content: reply }];
      setMsgs((p) => [...p, { role: "assistant", text: reply }]);
    } catch (e) {
      const msg = e?.message || "Connection severed.";
      setErrMsg(msg);
      setMsgs((p) => [...p, { role: "assistant", text: `[SYSTEM ERROR]\n\n${msg}` }]);
    }
    setLoading(false);
  }

  const QUICK = ["Analyze my weakest stat", "Give me a training plan", "How do I rank up faster?", "Nutrition tips", "I keep skipping days"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 70px)" }}>
      <div style={{ padding: "14px 16px 10px", flexShrink: 0, borderBottom: "1px solid #0f0f1e" }}>
        <div style={{ fontFamily: "Orbitron", fontSize: 10, letterSpacing: 4, color: "#334155", textAlign: "center", marginBottom: 4 }}>
          ◆ THE SYSTEM ◆
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
          <div style={{ fontSize: 10, color: "#22c55e", fontFamily: "Orbitron", letterSpacing: 2 }}>AI ONLINE</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ marginBottom: 14, display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && (
              <div style={{ fontSize: 9, color: "#7c3aed", letterSpacing: 2, marginBottom: 4, fontFamily: "Orbitron", fontWeight: 700 }}>
                ⬡ THE SYSTEM
              </div>
            )}
            <div style={{
              maxWidth: "90%", padding: "11px 14px", fontSize: 13, lineHeight: 1.7,
              color: "#e2e8f0", whiteSpace: "pre-wrap",
              borderRadius: m.role === "user" ? "13px 13px 3px 13px" : "13px 13px 13px 3px",
              background: m.role === "user" ? "linear-gradient(135deg,#3b1f7a,#1d3a8a)" : "#07071a",
              border: `1px solid ${m.role === "user" ? "#7c3aed44" : "#7c3aed18"}`,
              boxShadow: m.role === "assistant" ? "0 0 12px #7c3aed08" : "none",
            }}>
              {m.text}
            </div>
            {m.role === "user" && (
              <div style={{ fontSize: 9, color: "#334155", marginTop: 3, letterSpacing: 1 }}>
                HUNTER {s.name.toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: "#7c3aed", letterSpacing: 2, marginBottom: 4, fontFamily: "Orbitron", fontWeight: 700 }}>
              ⬡ THE SYSTEM
            </div>
            <div className="blink-cur" style={{
              display: "inline-block", padding: "11px 14px",
              borderRadius: "13px 13px 13px 3px", background: "#07071a",
              border: "1px solid #7c3aed18", fontSize: 13, color: "#7c3aed",
            }}>
              Analyzing Hunter data
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "6px 16px", flexShrink: 0, display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {QUICK.map((q) => (
          <button key={q} onClick={() => setInp(q)} style={{
            whiteSpace: "nowrap", padding: "5px 10px", borderRadius: 6,
            border: "1px solid #7c3aed2a", background: "#07071a",
            color: "#6d28d9", fontSize: 11, fontFamily: "Rajdhani", fontWeight: 600,
            flexShrink: 0, transition: "all 0.2s",
          }}>
            {q}
          </button>
        ))}
      </div>

      <div style={{ padding: "10px 16px 80px", flexShrink: 0, borderTop: "1px solid #1a1a35", background: "#03030a" }}>
        {errMsg && (
          <div style={{
            fontSize: 11, color: "#ef4444", marginBottom: 7, padding: "6px 10px",
            borderRadius: 6, background: "#1a0606", border: "1px solid #ef444422",
          }}>
            ⚠ {errMsg}
          </div>
        )}
        <div style={{ display: "flex", gap: 7 }}>
          <input
            value={inp}
            onChange={(e) => setInp(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask The System…"
            style={{ flex: 1, background: "#07071a", border: "1px solid #7c3aed2a" }}
          />
          <button
            onClick={send}
            disabled={loading || !inp.trim()}
            style={{
              padding: "10px 16px", borderRadius: 8, border: "none", flexShrink: 0,
              background: loading || !inp.trim() ? "#0a0a1a" : "linear-gradient(135deg,#7c3aed,#3b82f6)",
              color: loading || !inp.trim() ? "#1e293b" : "#fff",
              fontFamily: "Orbitron", fontSize: 10, fontWeight: 700, letterSpacing: 1, transition: "all 0.2s",
            }}
          >
            {loading ? <span className="spin-el">◌</span> : "SEND"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════ LEADERBOARD (local-only on Vercel) ═════════════════ */
function LeaderboardPanel({ s }) {
  const { r: myR } = rankInfo(s.totalXP);

  // On Vercel there's no shared storage — show a local-only board
  // with the current user's own data
  const hunters = [{ ...s, hunterId: s.hunterId }].filter(h => h.name !== "Hunter");
  const myPos = 1;
  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div className="fade-up" style={{ padding: "20px 16px 100px" }}>
      <div style={{ fontFamily: "Orbitron", fontSize: 10, letterSpacing: 4, color: "#334155", marginBottom: 4, textAlign: "center" }}>
        ◆ GLOBAL LEADERBOARD ◆
      </div>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#334155", letterSpacing: 1, marginBottom: 8 }}>
          All registered hunters ranked by total XP
        </div>
        <div style={{
          display: "inline-block", padding: "8px 14px", borderRadius: 8,
          background: "#0a0a1e", border: "1px solid #7c3aed22",
          fontSize: 11, color: "#475569", lineHeight: 1.6,
        }}>
          ℹ️ The global leaderboard requires a shared backend.<br />
          <span style={{ color: "#7c3aed", fontWeight: 700 }}>Set up a database</span> (e.g. Supabase) and update<br />
          <code style={{ color: "#38bdf8", fontSize: 10 }}>/api/leaderboard</code> to enable cross-user rankings.
        </div>
      </div>

      {s.name !== "Hunter" && (
        <div style={{
          borderRadius: 14, padding: "13px", marginBottom: 13,
          background: `linear-gradient(135deg,${myR.color}18,#06061a)`,
          border: `1px solid ${myR.color}33`, boxShadow: `0 0 18px ${myR.glow}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 9, color: "#475569", letterSpacing: 2, marginBottom: 3, fontFamily: "Orbitron" }}>YOUR PROFILE</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontFamily: "Orbitron", fontSize: 26, fontWeight: 900, color: myR.color, textShadow: `0 0 14px ${myR.color}` }}>
                  {MEDALS[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: myR.color, fontFamily: "Orbitron", letterSpacing: 1 }}>{myR.label}-RANK</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "Orbitron", fontSize: 15, fontWeight: 700 }}>{s.totalXP.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: "#334155", letterSpacing: 1 }}>TOTAL XP</div>
              {s.streak > 0 && <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 2 }}>🔥 {s.streak}d streak</div>}
            </div>
          </div>
        </div>
      )}

      {s.name === "Hunter" && (
        <div style={{ textAlign: "center", padding: "50px 0", color: "#1e293b" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌑</div>
          <div style={{ fontFamily: "Orbitron", fontSize: 12, letterSpacing: 2 }}>REGISTER YOUR NAME FIRST</div>
        </div>
      )}
    </div>
  );
}

/* ══════ PROGRESS ═══════════════════════════════════════════ */
function ProgressPanel({ s }) {
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const log = s.dailyLog[d] || {};
    const dayIdx = new Date(d + "T12:00:00").getDay();
    const lbl = ["S", "M", "T", "W", "T", "F", "S"][dayIdx];
    last14.push({ date: d, xp: log.xpGained || 0, count: (log.completed || []).length, lbl });
  }
  const maxXP = Math.max(...last14.map((d) => d.xp), 1);
  const { r } = rankInfo(s.totalXP);
  const totalQ = Object.values(s.dailyLog).reduce((a, d) => a + (d.completed || []).length, 0);
  const totalXPall = Object.values(s.dailyLog).reduce((a, d) => a + (d.xpGained || 0), 0);
  const totalStatXP = SK.reduce((a, k) => a + (s.statXP[k] || 0), 1);

  return (
    <div className="fade-up" style={{ padding: "20px 16px 100px" }}>
      <div style={{ fontFamily: "Orbitron", fontSize: 10, letterSpacing: 4, color: "#334155", marginBottom: 16, textAlign: "center" }}>
        ◆ GROWTH ARCHIVE ◆
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "RANK",         v: r.label,                          c: r.color,   icon: "🏅" },
          { label: "DAY STREAK",   v: `${s.streak}d`,                   c: "#fbbf24", icon: "🔥" },
          { label: "BEST STREAK",  v: `${s.longestStreak}d`,            c: "#fb923c", icon: "🏆" },
          { label: "TOTAL XP",     v: totalXPall.toLocaleString(),      c: "#818cf8", icon: "⚡" },
          { label: "TOTAL QUESTS", v: totalQ,                           c: "#38bdf8", icon: "📋" },
          { label: "DAYS ACTIVE",  v: Object.keys(s.dailyLog).length,   c: "#34d399", icon: "📅" },
        ].map((c) => (
          <div key={c.label} style={{ background: "#06061a", borderRadius: 11, padding: "12px", border: `1px solid ${c.c}22` }}>
            <div style={{ fontSize: 17, marginBottom: 4 }}>{c.icon}</div>
            <div style={{ fontFamily: "Orbitron", fontSize: 17, fontWeight: 700, color: c.c }}>{c.v}</div>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: 1.5, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#06061a", borderRadius: 13, padding: "14px", marginBottom: 11, border: "1px solid #1a1a35" }}>
        <div style={{ fontFamily: "Orbitron", fontSize: 9, letterSpacing: 3, color: "#334155", marginBottom: 12 }}>14-DAY XP EARNED</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 68 }}>
          {last14.map((d, i) => {
            const h = d.xp > 0 ? Math.max(8, (d.xp / maxXP) * 68) : 0;
            const isToday = d.date === td();
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{
                  width: "100%", height: h || 3, borderRadius: "3px 3px 0 0",
                  background: h ? "linear-gradient(180deg,#7c3aed,#3b82f6)" : "#1a1a35",
                  boxShadow: h ? "0 0 7px #7c3aed44" : "none",
                  border: isToday ? "1px solid #fbbf24" : "none",
                  transition: "height 0.5s ease",
                }} />
                <div style={{ fontSize: 7, color: isToday ? "#fbbf24" : "#1e293b", fontFamily: "Orbitron" }}>{d.lbl}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: "#06061a", borderRadius: 13, padding: "14px", marginBottom: 11, border: "1px solid #1a1a35" }}>
        <div style={{ fontFamily: "Orbitron", fontSize: 9, letterSpacing: 3, color: "#334155", marginBottom: 12 }}>DAILY QUESTS DONE</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 50 }}>
          {last14.map((d, i) => (
            <div key={i} style={{
              flex: 1,
              height: d.count > 0 ? (Math.min(d.count, 8) / 8) * 50 : 3,
              borderRadius: "3px 3px 0 0",
              background: d.count > 0 ? "linear-gradient(180deg,#22c55e,#16a34a)" : "#1a1a35",
              boxShadow: d.count > 0 ? "0 0 5px #22c55e33" : "none",
              transition: "height 0.5s ease",
            }} />
          ))}
        </div>
      </div>

      <div style={{ background: "#06061a", borderRadius: 13, padding: "14px", border: "1px solid #1a1a35" }}>
        <div style={{ fontFamily: "Orbitron", fontSize: 9, letterSpacing: 3, color: "#334155", marginBottom: 11 }}>STAT DISTRIBUTION</div>
        {SK.map((k) => {
          const xp = s.statXP[k] || 0;
          const pct = Math.round((xp / totalStatXP) * 100);
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 24, textAlign: "center", fontSize: 11 }}>{SC[k].icon}</div>
              <div style={{ width: 26, fontSize: 9, color: SC[k].c, fontWeight: 700, fontFamily: "Orbitron" }}>{k}</div>
              <div style={{ flex: 1, height: 5, background: "#0a0a18", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${SC[k].c}88,${SC[k].c})`, borderRadius: 5, transition: "width 0.5s" }} />
              </div>
              <div style={{ width: 24, fontSize: 9, color: "#475569", textAlign: "right" }}>{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════ ROOT ═══════════════════════════════════════════════ */
export default function App() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState(null);
  const [toastOut, setTO] = useState(false);
  const [setup, setSetup] = useState(false);
  const [nameIn, setNameIn] = useState("");
  const [loaded, setLoaded] = useState(false);
  const tRef = useRef(null);

  useEffect(() => {
    function loadState() {
      try {
        const res = storage.get("hs-v4");
        if (res?.value) {
          let s = JSON.parse(res.value);
          if (!s.hunterId) s = { ...s, hunterId: genId() };
          const today = td();
          const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          if (s.lastDay && s.lastDay !== today && s.lastDay !== yest) {
            const { r } = rankInfo(s.totalXP);
            if ((s.dailyLog[s.lastDay]?.completed || []).length < r.minQ) {
              s = { ...s, totalXP: 0, streak: 0 };
            }
          }
          setState(s);
        } else {
          setState({ ...INIT, hunterId: genId() });
          setSetup(true);
        }
      } catch (err) {
        setState({ ...INIT, hunterId: genId() });
        setSetup(true);
      }
      setLoaded(true);
    }
    loadState();
  }, []);

  useEffect(() => {
    if (!state || !loaded) return;
    storage.set("hs-v4", JSON.stringify(state));
  }, [state, loaded]);

  function showToast(msg, type) {
    const t = type || "xp";
    setTO(false);
    setToast({ msg, t });
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      setTO(true);
      setTimeout(() => setToast(null), 380);
    }, 3500);
  }

  function finishSetup() {
    if (!nameIn.trim()) return;
    setState((p) => ({ ...p, name: nameIn.trim() }));
    setSetup(false);
    showToast(`[SYSTEM] Hunter "${nameIn.trim()}" registered.`, "success");
  }

  const TC = { xp: "#7c3aed", bonus: "#fbbf24", success: "#22c55e", fail: "#ef4444", warn: "#fb923c" };
  const TABS = [
    { id: "home",     icon: "⊕", label: "HOME"    },
    { id: "stats",    icon: "◈", label: "STATS"   },
    { id: "quests",   icon: "◉", label: "QUESTS"  },
    { id: "system",   icon: "◆", label: "SYSTEM"  },
    { id: "board",    icon: "⬡", label: "BOARD"   },
    { id: "progress", icon: "◎", label: "ARCHIVE" },
  ];

  if (!state) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="pulse-anim" style={{ fontFamily: "Orbitron", fontSize: 12, letterSpacing: 4, color: "#7c3aed" }}>
            SYSTEM LOADING…
          </div>
        </div>
      </>
    );
  }

  const { r } = rankInfo(state.totalXP);

  return (
    <>
      <style>{CSS}</style>

      {setup && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.96)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "#07071a", borderRadius: 20, padding: "32px 24px",
            border: "1px solid #7c3aed44", maxWidth: 360, width: "100%",
            boxShadow: "0 0 60px #7c3aed22", textAlign: "center",
          }}>
            <div style={{ fontFamily: "Orbitron", fontSize: 9, letterSpacing: 4, color: "#7c3aed", marginBottom: 10 }}>
              ◆ SYSTEM NOTIFICATION ◆
            </div>
            <div style={{
              fontFamily: "Orbitron", fontSize: 20, fontWeight: 900, marginBottom: 6,
              background: "linear-gradient(135deg,#7c3aed,#3b82f6)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              NEW HUNTER DETECTED
            </div>
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, marginBottom: 22 }}>
              An unregistered individual has triggered the System. Enter your hunter name to begin.
            </div>
            <input
              value={nameIn}
              onChange={(e) => setNameIn(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") finishSetup(); }}
              placeholder="Enter your hunter name…"
              style={{ marginBottom: 13, textAlign: "center", fontSize: 15 }}
              autoFocus
            />
            <button
              onClick={finishSetup}
              style={{
                width: "100%", padding: "13px", borderRadius: 11, border: "none",
                background: "linear-gradient(135deg,#7c3aed,#3b82f6)", color: "#fff",
                fontFamily: "Orbitron", fontSize: 11, fontWeight: 700, letterSpacing: 2,
                boxShadow: "0 0 22px #7c3aed44",
              }}
            >
              ENTER THE SYSTEM
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: "fixed", top: 14, right: 14, zIndex: 8888, maxWidth: 300,
          background: "#07071a", border: `1px solid ${TC[toast.t] || TC.xp}`,
          borderRadius: 11, padding: "11px 14px",
          boxShadow: `0 0 18px ${TC[toast.t] || TC.xp}44`,
          animation: toastOut ? "toastOut 0.38s ease forwards" : "toastIn 0.33s ease",
          fontFamily: "Rajdhani", fontSize: 13, fontWeight: 600,
          color: TC[toast.t] || TC.xp, lineHeight: 1.4,
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 520, margin: "0 auto", minHeight: "100vh" }}>
        {tab === "home"     && <HomePanel      s={state} />}
        {tab === "stats"    && <StatsPanel     s={state} />}
        {tab === "quests"   && <QuestsPanel    s={state} setState={setState} toast={showToast} />}
        {tab === "system"   && <AssistantPanel s={state} />}
        {tab === "board"    && <LeaderboardPanel s={state} />}
        {tab === "progress" && <ProgressPanel  s={state} />}

        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 520, background: "rgba(3,3,10,0.97)",
          borderTop: "1px solid #1a1a35", display: "flex", zIndex: 100,
          backdropFilter: "blur(20px)",
        }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "9px 2px", border: "none", background: "transparent",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                color: active ? r.color : "#334155", transition: "all 0.2s",
                borderTop: active ? `2px solid ${r.color}` : "2px solid transparent",
              }}>
                <span style={{ fontSize: 14, filter: active ? `drop-shadow(0 0 6px ${r.color})` : "none" }}>
                  {t.icon}
                </span>
                <span style={{ fontFamily: "Orbitron", fontSize: 7, letterSpacing: 0.5, fontWeight: 700 }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
