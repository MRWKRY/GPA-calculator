import { useState, useMemo } from "react";

const GRADE_POINTS = {
  "A+": 4.3, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0,
  "D": 1.0, "D-":0.7,"F": 0.0,
};
const GRADES = Object.keys(GRADE_POINTS);
const LANG_SUBTYPES = ["外国語科目", "英語技能別演習", "外国語演習"];

const INFO_COURSES = [
  { id: "info1", name: "情報１", credits: 2 },
  { id: "info2", name: "情報２", credits: 2 },
  { id: "taikyu_a", name: "体育A", credits: 1 },
  { id: "taikyu_b", name: "体育B", credits: 2 },
  { id: "stats", name: "統計", credits: 2 },
];

const FOUNDATION_COURSES = [
  { id: "bm_la1", name: "基礎m[線形代数１]", credits: 2, subtype: "基礎m" },
  { id: "bm_la2", name: "基礎m[線形代数２]", credits: 2, subtype: "基礎m" },
  { id: "bm_ca1", name: "基礎m[微分積分１]", credits: 2, subtype: "基礎m" },
  { id: "bm_ca2", name: "基礎m[微分積分２]", credits: 2, subtype: "基礎m" },
  { id: "bs_p1", name: "基礎s[物理１]", credits: 2, subtype: "物理" },
  { id: "bs_p2", name: "基礎s[物理２]", credits: 2, subtype: "物理" },
  { id: "bs_c1", name: "基礎s[化学１]", credits: 2, subtype: "化学" },
  { id: "bs_c2", name: "基礎s[化学２]", credits: 2, subtype: "化学" },
  { id: "bs_b1", name: "基礎s[生物１]", credits: 2, subtype: "生物" },
  { id: "bs_b2", name: "基礎s[生物２]", credits: 2, subtype: "生物" },
  { id: "bs_e1", name: "基礎s[地球惑星１]", credits: 2, subtype: "地球惑星" },
  { id: "bs_e2", name: "基礎s[地球惑星２]", credits: 2, subtype: "地球惑星" },
  { id: "bi_nat", name: "基礎実[自然科学実験]", credits: 2, subtype: "基礎実" },
  { id: "bi_psy", name: "基礎実[心理学実験]", credits: 2, subtype: "基礎実" },
];

let uid = 1;
const genId = () => `c${uid++}`;

function selectTop(courses, maxCredits) {
  const sorted = [...courses]
    .filter(c => c.grade && GRADE_POINTS[c.grade] !== undefined)
    .sort((a, b) => GRADE_POINTS[b.grade] - GRADE_POINTS[a.grade]);
  const result = [];
  let total = 0;
  for (const c of sorted) {
    if (total + c.credits <= maxCredits) { result.push(c); total += c.credits; }
  }
  return result;
}

function computeIkouten(state) {
  const all = [];

  // 総合・FRS: 上位2単位
  all.push(...selectTop(state.general, 2));

  // 主題別: 上位4単位
  all.push(...selectTop(state.thematic, 4));

  // 外国語: 必修6単位含む上位8単位
  const lang = state.language.filter(c => c.grade && GRADE_POINTS[c.grade] !== undefined);
  const mandSel = selectTop(lang.filter(c => ["外国語科目", "英語技能別演習"].includes(c.subtype)), 6);
  const mandIds = new Set(mandSel.map(c => c.id));
  const mandCr = mandSel.reduce((s, c) => s + c.credits, 0);
  all.push(...mandSel);
  all.push(...selectTop(lang.filter(c => !mandIds.has(c.id)), 8 - mandCr));

  // 情報: 情報１必須 + 上位4単位
  const infoGraded = INFO_COURSES.filter(c => state.info[c.id]).map(c => ({ ...c, grade: state.info[c.id] }));
  const info1 = infoGraded.find(c => c.id === "info1");
  if (info1) {
    all.push(info1);
    all.push(...selectTop(infoGraded.filter(c => c.id !== "info1"), 4 - info1.credits));
  }

  // 基礎科目: 20単位（ア〜オ）
  const found = FOUNDATION_COURSES.filter(c => state.foundation[c.id]).map(c => ({ ...c, grade: state.foundation[c.id] }));
  const usedIds = new Set();
  const foundSel = [];
  const addF = (cs) => cs.forEach(c => { if (!usedIds.has(c.id)) { foundSel.push(c); usedIds.add(c.id); } });

  addF(selectTop(found.filter(c => c.subtype === "基礎m"), 6));                    // ア
  addF(selectTop(found.filter(c => c.subtype === "物理"), 2));                      // イ
  addF(found.filter(c => c.subtype === "化学"));                                    // ウ
  addF(selectTop(found.filter(c => c.subtype === "生物"), 2));                      // エ
  addF(found.filter(c => c.id === "bi_nat"));                                       // オ
  const usedCr = foundSel.reduce((s, c) => s + c.credits, 0);
  addF(selectTop(found.filter(c => !usedIds.has(c.id)), 20 - usedCr));             // 残り

  all.push(...foundSel);

  const totalCr = all.reduce((s, c) => s + c.credits, 0);
  if (totalCr === 0) return null;
  return (all.reduce((s, c) => s + GRADE_POINTS[c.grade] * c.credits, 0) / totalCr).toFixed(2);
}

const inp = { padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 };
const sel = { ...inp, background: "#fff" };
const btn = { padding: "6px 14px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 };
const del = { padding: "4px 10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 };

function FreeSection({ courses, form, onForm, onAdd, onRemove, onGrade, maxCr, showSubtype }) {
  const used = courses.reduce((s, c) => s + c.credits, 0);
  return (
    <div>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
        上位 <b>{maxCr}</b> 単位を算入 — 現在 {used} 単位入力中
      </p>
      {courses.map(c => (
        <div key={c.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ flex: 1, fontSize: 14, minWidth: 80 }}>{c.name}</span>
          {showSubtype && <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>{c.subtype}</span>}
          <span style={{ fontSize: 13, color: "#9ca3af" }}>{c.credits}単位</span>
          <select value={c.grade} onChange={e => onGrade(c.id, e.target.value)} style={sel}>
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
          <button onClick={() => onRemove(c.id)} style={del}>削除</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <input placeholder="科目名" value={form.name}
          onChange={e => onForm("name", e.target.value)}
          onKeyDown={e => e.key === "Enter" && onAdd()}
          style={{ ...inp, flex: 2, minWidth: 120 }} />
        {showSubtype && (
          <select value={form.subtype} onChange={e => onForm("subtype", e.target.value)} style={sel}>
            {LANG_SUBTYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        )}
        <input type="number" min={1} max={8} value={form.credits}
          onChange={e => onForm("credits", e.target.value)} style={{ ...inp, width: 52 }} />
        <select value={form.grade} onChange={e => onForm("grade", e.target.value)} style={sel}>
          {GRADES.map(g => <option key={g}>{g}</option>)}
        </select>
        <button onClick={onAdd} style={btn}>＋ 追加</button>
      </div>
    </div>
  );
}

function PredefSection({ courses, grades, onSet, note }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>{note}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
        {courses.map(c => {
          const grade = grades[c.id] || "";
          return (
            <div key={c.id} style={{ background: grade ? "#f0f0ff" : "#fff", border: `1px solid ${grade ? "#a5b4fc" : "#e5e7eb"}`, borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{c.credits}単位</span>
              </div>
              <select value={grade} onChange={e => onSet(c.id, e.target.value)} style={{ ...sel, width: "100%" }}>
                <option value="">未履修</option>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("general");
  const [state, setState] = useState({ general: [], thematic: [], language: [], info: {}, foundation: {} });
  const [form, setForm] = useState({ name: "", credits: 2, grade: "A", subtype: "外国語科目" });

  const ikouten = useMemo(() => computeIkouten(state), [state]);
  const onForm = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const changeTab = (t) => { setTab(t); onForm("name", ""); };

  const addCourse = (cat) => {
    if (!form.name.trim()) return;
    setState(s => ({
      ...s,
      [cat]: [...s[cat], { id: genId(), name: form.name.trim(), credits: Number(form.credits), grade: form.grade, ...(cat === "language" ? { subtype: form.subtype } : {}) }],
    }));
    onForm("name", "");
  };

  const removeCourse = (cat, id) => setState(s => ({ ...s, [cat]: s[cat].filter(c => c.id !== id) }));
  const updateGrade = (cat, id, grade) => setState(s => ({ ...s, [cat]: s[cat].map(c => c.id === id ? { ...c, grade } : c) }));
  const setPredefined = (cat, id, grade) => setState(s => {
    const next = { ...s[cat] };
    if (grade) next[id] = grade; else delete next[id];
    return { ...s, [cat]: next };
  });

  const TABS = [
    { id: "general", label: "総合・FRS" },
    { id: "thematic", label: "主題別" },
    { id: "language", label: "外国語" },
    { id: "info", label: "情報・体育" },
    { id: "foundation", label: "基礎科目" },
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui, sans-serif", boxSizing: "border-box", width: "100%"  }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>北大移行点計算マシン</h1>
      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>成績を入力するとゴリラが移行点をリアルタイムで珠をはじいて計算します</p>

      <div style={{ textAlign: "center", padding: "24px", background: ikouten ? "#eef2ff" : "#f9fafb", border: `1px solid ${ikouten ? "#c7d2fe" : "#e5e7eb"}`, borderRadius: 14, marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#6b7280", letterSpacing: "0.08em" }}>移行点</div>
        <div style={{fontSize: 80, fontWeight: 700, lineHeight: 1.1,color: !ikouten ? "#d1d5db"
            : ikouten >= 4.0 ? "#dc2626"
            : ikouten >= 3.7 ? "#9333ea"
            : "#4f46e5",
          fontFamily: ikouten >= 4.3 ? "serif" : "system-ui, sans-serif",
          transition: "color 0.3s, font-family 0.3s",
        }}>
          {ikouten ?? "—"}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>/ 4.30 満点</div>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: 20, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => changeTab(t.id)} style={{ padding: "8px 14px", border: "none", background: "transparent", cursor: "pointer", borderBottom: `2px solid ${tab === t.id ? "#4f46e5" : "transparent"}`, color: tab === t.id ? "#4f46e5" : "#6b7280", fontWeight: tab === t.id ? 600 : 400, fontSize: 13, whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" && <FreeSection courses={state.general} form={form} onForm={onForm} onAdd={() => addCourse("general")} onRemove={id => removeCourse("general", id)} onGrade={(id, g) => updateGrade("general", id, g)} maxCr={2} showSubtype={false} />}
      {tab === "thematic" && <FreeSection courses={state.thematic} form={form} onForm={onForm} onAdd={() => addCourse("thematic")} onRemove={id => removeCourse("thematic", id)} onGrade={(id, g) => updateGrade("thematic", id, g)} maxCr={4} showSubtype={false} />}
      {tab === "language" && <FreeSection courses={state.language} form={form} onForm={onForm} onAdd={() => addCourse("language")} onRemove={id => removeCourse("language", id)} onGrade={(id, g) => updateGrade("language", id, g)} maxCr={8} showSubtype={true} />}
      {tab === "info" && <PredefSection courses={INFO_COURSES} grades={state.info} onSet={(id, g) => setPredefined("info", id, g)} note="情報１を必ず含む上位４単位を算入（体育は1単位）" />}
      {tab === "foundation" && <PredefSection courses={FOUNDATION_COURSES} grades={state.foundation} onSet={(id, g) => setPredefined("foundation", id, g)} note="ア(基礎m 6単位)・イ(物理 2単位)・ウ(化学１＋２)・エ(生物 2単位)・オ(自然科学実験) ＋ 残り ＝ 20単位" />}
    </div>
  );
}