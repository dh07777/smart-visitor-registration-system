import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react'
import { HashRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'

const KEY = 'visitorpass_v1', Ctx = createContext(), useC = () => useContext(Ctx)
const D = 864e5, now = () => new Date().toISOString(), fmt = t => t ? new Date(t).toLocaleString() : '-'
const uid = () => 'VP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase()
const DEPTS = ['Engineering', 'HR', 'Finance', 'Sales', 'Operations']
const seed = () => {
  const emps = [['Anita Rao', 'Engineering'], ['Rahul Mehta', 'HR'], ['Sara Khan', 'Finance'], ['John Park', 'Sales'], ['Priya Nair', 'Operations']].map((e, i) => ({ id: 'E' + (i + 1), name: e[0], dept: e[1], email: e[0].split(' ')[0].toLowerCase() + '@corp.com', phone: '98765000' + i + i }))
  const st = ['out', 'out', 'approved', 'pending', 'inside', 'rejected'], names = ['Alex Moore', 'Bina Shah', 'Carlos Diaz', 'Dina Lee', 'Evan Roy', 'Fatima Ali', 'Gita Rao', 'Hugo Chen']
  const vis = Array.from({ length: 44 }, (_, i) => {
    const e = emps[i % 5], a = Date.now() - (i * 4.3) * D + 36e5 * (i % 6), s = i < 2 ? 'inside' : i < 4 ? 'pending' : i < 6 ? 'approved' : st[i % 2]
    return { id: 'VP-SEED' + (100 + i), name: names[i % 8] + (i > 7 ? ' ' + i : ''), email: `guest${i}@mail.com`, phone: '9000000' + String(100 + i), company: ['Acme', 'Globex', 'Initech', 'Umbrella'][i % 4], purpose: ['Meeting', 'Interview', 'Delivery', 'Audit'][i % 4], host: e.name, dept: e.dept, arrive: new Date(a).toISOString(), depart: new Date(a + (i < 2 ? -36e5 : 72e5)).toISOString(), status: s, comment: '', photo: '', idDoc: '', room: '', recurring: 'none', template: 't1', inAt: s === 'inside' || s === 'out' ? new Date(a).toISOString() : '', outAt: s === 'out' ? new Date(a + 54e5).toISOString() : '', safe: false }
  })
  return {
    emps, vis, black: [{ id: 'B1', name: 'Mark Spoof', email: 'spoof@bad.com', phone: '9999999999', reason: 'Fraudulent entry' }], restricted: [{ id: 'R1', area: 'Server Room', rule: 'Employees with escort only' }],
    rooms: [{ id: 'M1', name: 'Boardroom A', cap: 12 }, { id: 'M2', name: 'Huddle 2', cap: 4 }, { id: 'M3', name: 'Interview Room', cap: 3 }], appts: [], logs: [], notes: [],
    users: { admin: { name: 'Admin User', role: 'admin', email: 'admin@corp.com', pass: 'admin123' }, reception: { name: 'Riya Desk', role: 'receptionist', email: 'reception@corp.com', pass: 'desk123' }, employee: { name: 'Anita Rao', role: 'employee', email: 'anita@corp.com', pass: 'emp123' } }
  }
}
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed() } catch { return seed() } }

function Provider({ children }) {
  const [db, setDb] = useState(load), [user, setUser] = useState(() => JSON.parse(localStorage.getItem(KEY + 'u') || 'null')), [dark, setDark] = useState(localStorage.getItem(KEY + 'd') === '1')
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(db)), [db])
  useEffect(() => { localStorage.setItem(KEY + 'u', JSON.stringify(user)); }, [user])
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : ''; localStorage.setItem(KEY + 'd', dark ? '1' : '0') }, [dark])
  const log = (a, s = db) => ({ ...s, logs: [{ t: now(), by: user?.name || 'Visitor', a }, ...s.logs].slice(0, 300) })
  const act = (fn, msg, notice) => setDb(s => { let n = fn(s); n = log(msg, n); if (notice) n = { ...n, notes: [{ t: now(), m: notice, read: false }, ...n.notes].slice(0, 100) }; return n })
  const resetDemo = () => { localStorage.removeItem(KEY); setDb(seed()) }
  return <Ctx.Provider value={{ db, setDb, act, user, setUser, dark, setDark, resetDemo }}>{children}</Ctx.Provider>
}

function useCount(n) { const [v, setV] = useState(0); useEffect(() => { let f, s = performance.now(); const t = p => { const k = Math.min((p - s) / 800, 1); setV(Math.round(n * k)); if (k < 1) f = requestAnimationFrame(t) }; f = requestAnimationFrame(t); return () => cancelAnimationFrame(f) }, [n]); return v }
const Stat = ({ l, n }) => <div className="card stat"><b>{useCount(n)}</b><span>{l}</span></div>
const Tag = ({ s }) => <span className={'tag ' + s}>{s}</span>

function Table({ rows, cols, size = 8, filters = [], actions }) {
  const [q, setQ] = useState(''), [p, setP] = useState(0), [f, setF] = useState({}), [sort, setSort] = useState(null)
  let r = rows.filter(x => JSON.stringify(x).toLowerCase().includes(q.toLowerCase()) && filters.every(k => !f[k] || x[k] === f[k]))
  if (sort) r = [...r].sort((a, b) => String(a[sort.k]).localeCompare(String(b[sort.k])) * sort.d)
  const pages = Math.max(1, Math.ceil(r.length / size)), pg = Math.min(p, pages - 1)
  return <div><div className="row noprint"><input placeholder="Filter…" value={q} onChange={e => { setQ(e.target.value); setP(0) }} />
    {filters.map(k => <select key={k} value={f[k] || ''} onChange={e => { setF({ ...f, [k]: e.target.value }); setP(0) }}><option value="">All {k}</option>{[...new Set(rows.map(x => x[k]))].map(v => <option key={v}>{v}</option>)}</select>)}</div>
    <div className="tw"><table><thead><tr>{cols.map(c => <th key={c.k} onClick={() => setSort({ k: c.k, d: sort?.k === c.k ? -sort.d : 1 })}>{c.h}{sort?.k === c.k ? (sort.d > 0 ? ' ▲' : ' ▼') : ''}</th>)}{actions && <th />}</tr></thead>
      <tbody>{r.slice(pg * size, pg * size + size).map((x, i) => <tr key={x.id || i}>{cols.map(c => <td key={c.k}>{c.r ? c.r(x) : x[c.k]}</td>)}{actions && <td>{actions(x)}</td>}</tr>)}
        {!r.length && <tr><td colSpan={9}>No records match these filters.</td></tr>}</tbody></table></div>
    <div className="row noprint" style={{ marginTop: 10 }}><button className="g" disabled={pg < 1} onClick={() => setP(pg - 1)}>Prev</button><span>Page {pg + 1} / {pages} ({r.length})</span><button className="g" disabled={pg >= pages - 1} onClick={() => setP(pg + 1)}>Next</button></div></div>
}
const vcols = [{ k: 'id', h: 'ID' }, { k: 'name', h: 'Name' }, { k: 'company', h: 'Company' }, { k: 'host', h: 'Host' }, { k: 'dept', h: 'Department' }, { k: 'arrive', h: 'Arrival', r: v => fmt(v.arrive) }, { k: 'status', h: 'Status', r: v => v.status === 'inside' && new Date(v.depart) < new Date() ? <><Tag s="inside" /> <span className="err">overdue</span></> : <Tag s={v.status} /> }]
const csv = (rows, name) => { const k = Object.keys(rows[0] || {}).filter(x => x !== 'photo' && x !== 'idDoc'), t = [k.join(','), ...rows.map(r => k.map(x => `"${String(r[x] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv' })); a.download = name + '.csv'; a.click() }
const dur = (a, b) => { const m = Math.round((new Date(b || Date.now()) - new Date(a)) / 6e4); return `${Math.floor(m / 60)}h ${m % 60}m` }

/* ---------- Auth ---------- */
function Login() {
  const { db, setUser } = useC(), nav = useNavigate(), [u, setU] = useState('admin'), [p, setP] = useState('admin123'), [e, setE] = useState('')
  const go = () => { const a = db.users[u]; if (a && a.pass === p) { setUser({ key: u, ...a }); nav('/') } else setE('Invalid username or password.') }
  return <div className="login"><div className="card"><div className="logo" style={{ color: 'var(--navy)' }}>Visitor<b>Pass</b></div><p style={{ color: 'var(--mut)' }}>Smart Visitor Registration System</p>
    <div className="row">{['admin', 'reception', 'employee'].map(k => <button key={k} className="g" onClick={() => { setU(k); setP(db.users[k].pass) }}>{k}</button>)}</div>
    <div className="form" style={{ gridTemplateColumns: '1fr' }}><label>Username<select value={u} onChange={e => setU(e.target.value)}>{Object.keys(db.users).map(k => <option key={k}>{k}</option>)}</select></label>
      <label>Password<input type="password" value={p} onChange={e => setP(e.target.value)} /></label>{e && <div className="err">{e}</div>}
      <button onClick={go}>Sign in</button><button className="s" onClick={() => nav('/self')}>I am a visitor – register</button></div>
    <p style={{ fontSize: 12, color: 'var(--mut)' }}>Demo: admin/admin123 · reception/desk123 · employee/emp123</p></div></div>
}

/* ---------- Registration ---------- */
const blank = { name: '', email: '', phone: '', company: '', purpose: 'Meeting', host: '', dept: '', arrive: '', depart: '', room: '', recurring: 'none', template: 't1', area: 'General', photo: '', idDoc: '' }
function Register({ pub }) {
  const { db, act } = useC(), [f, setF] = useState(blank), [er, setEr] = useState({}), [done, setDone] = useState(null), [warn, setWarn] = useState('')
  const set = (k, v) => setF(x => ({ ...x, [k]: v })), file = (k, e) => { const r = new FileReader(); r.onload = () => set(k, r.result); e.target.files[0] && r.readAsDataURL(e.target.files[0]) }
  const submit = () => {
    const x = {}; if (f.name.trim().length < 3) x.name = 'Enter full name (min 3 chars)'; if (!/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'Enter a valid email'; if (!/^\d{10}$/.test(f.phone)) x.phone = 'Mobile must be 10 digits'
      ;['company', 'host', 'arrive', 'depart'].forEach(k => !f[k] && (x[k] = 'Required')); if (f.arrive && f.depart && f.depart <= f.arrive) x.depart = 'Departure must be after arrival'; if (!f.photo) x.photo = 'Upload a photo'; if (!f.idDoc) x.idDoc = 'Upload an ID document'; setEr(x); if (Object.keys(x).length) return
    const bl = db.black.find(b => b.email === f.email || b.phone === f.phone || b.name.toLowerCase() === f.name.toLowerCase()); if (bl) return setEr({ name: 'Registration blocked: matches blacklist' })
    const dup = db.vis.find(v => v.email === f.email || v.phone === f.phone); if (dup && !warn) return setWarn(`Possible duplicate of ${dup.id} (${dup.name}). Press Register again to confirm.`)
    const emp = db.emps.find(e => e.name === f.host), v = { ...f, dept: emp?.dept || f.dept, id: uid(), status: 'pending', comment: '', inAt: '', outAt: '', safe: false }
    const cnt = { daily: 4, weekly: 3, monthly: 2 }[f.recurring] || 0, step = { daily: D, weekly: 7 * D, monthly: 30 * D }[f.recurring]
    const extra = Array.from({ length: cnt }, (_, i) => ({ ...v, id: uid() + (i + 1), parentId: v.id, arrive: new Date(+new Date(f.arrive) + (i + 1) * step).toISOString(), depart: new Date(+new Date(f.depart) + (i + 1) * step).toISOString() }))
    act(s => ({ ...s, vis: [v, ...extra, ...s.vis] }), `Registered visitor ${v.name} (${v.id})${cnt ? ` with ${cnt} recurring visits` : ''}`, `Email/SMS to ${f.host}: ${f.name} awaits your approval`); setDone({ ...v, extra: cnt })
  }
  const L = (k, l, t = 'text', o) => <label>{l}{o ? <select value={f[k]} onChange={e => set(k, e.target.value)}><option value="">Select…</option>{o.map(v => <option key={v}>{v}</option>)}</select> : <input type={t} value={f[k]} onChange={e => set(k, e.target.value)} />}{er[k] && <span className="err">{er[k]}</span>}</label>
  if (done) return <div className={pub ? 'login' : ''}><div className="card" style={{ margin: 'auto', maxWidth: 480 }}><h3>Registration submitted</h3><p>Your Visitor ID: <b>{done.id}</b>. Status: <Tag s="pending" />.{done.extra > 0 && ` ${done.extra} recurring visits (${done.recurring}) were also scheduled.`} {done.host} has been notified by simulated email and SMS.</p><button onClick={() => { setDone(null); setF(blank); setWarn('') }}>Register another</button></div></div>
  const body = <div className="card"><h1>{pub ? 'Visitor self-registration' : 'Register visitor'}</h1><div className="form">
    {L('name', 'Full name')}{L('email', 'Email', 'email')}{L('phone', 'Mobile number', 'tel')}{L('company', 'Company name')}{L('purpose', 'Visitor purpose', undefined, ['Meeting', 'Interview', 'Delivery', 'Audit', 'Maintenance'])}
    {L('host', 'Person to visit', undefined, db.emps.map(e => e.name))}{L('dept', 'Department', undefined, DEPTS)}{L('arrive', 'Expected arrival', 'datetime-local')}{L('depart', 'Expected departure', 'datetime-local')}
    {L('room', 'Meeting room', undefined, db.rooms.map(r => r.name))}{L('recurring', 'Recurring visit', undefined, ['none', 'daily', 'weekly', 'monthly'])}{L('template', 'Badge template', undefined, ['t1', 't2', 't3'])}{L('area', 'Access area', undefined, ['General', ...db.restricted.map(r => r.area)])}
    <label>Photo{<input type="file" accept="image/*" onChange={e => file('photo', e)} />}{f.photo && <img className="prev" src={f.photo} />}{er.photo && <span className="err">{er.photo}</span>}</label>
    <label>ID document<input type="file" accept="image/*" onChange={e => file('idDoc', e)} />{f.idDoc && <img className="prev" src={f.idDoc} />}{er.idDoc && <span className="err">{er.idDoc}</span>}</label></div>
    {warn && <p className="alert" style={{ marginTop: 12 }}>{warn}</p>}<p><button onClick={submit}>Register visitor</button></p></div>
  return pub ? <div className="login" style={{ padding: 20 }}>{body}</div> : body
}

/* ---------- Dashboard ---------- */
function Dashboard() {
  const { db } = useC(), [m, setM] = useState('daily'), v = db.vis, c = s => v.filter(x => x.status === s).length
  const data = useMemo(() => {
    if (m === 'monthly') return Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return { l: d.toLocaleDateString(undefined, { month: 'short' }), n: v.filter(x => { const a = new Date(x.arrive); return a.getMonth() === d.getMonth() && a.getFullYear() === d.getFullYear() }).length } })
    const n = m === 'daily' ? 7 : 8, sz = m === 'daily' ? D : 7 * D; return Array.from({ length: n }, (_, i) => { const e = Date.now() - i * sz, s = e - sz; return { l: m === 'daily' ? new Date(e).toLocaleDateString(undefined, { weekday: 'short' }) : 'W-' + i, n: v.filter(x => { const t = +new Date(x.arrive); return t > s && t <= e }).length } }).reverse()
  }, [m, v]), mx = Math.max(1, ...data.map(d => d.n))
  const overdue = v.filter(x => x.status === 'inside' && new Date(x.depart) < new Date())
  return <div><h1>Dashboard</h1>{overdue.length > 0 && <div className="alert">{overdue.length} visitor(s) are overdue for checkout: {overdue.map(o => o.name).join(', ')}</div>}
    <div className="grid"><Stat l="Total visitors" n={v.length} /><Stat l="Currently inside" n={c('inside')} /><Stat l="Expected visitors" n={c('approved')} /><Stat l="Checked out" n={c('out')} /><Stat l="Pending approvals" n={c('pending')} /></div>
    <div className="card"><div className="row"><h3 style={{ margin: 0 }}>Visitor statistics</h3>{['daily', 'weekly', 'monthly'].map(k => <button key={k} className={m === k ? '' : 'g'} onClick={() => setM(k)}>{k}</button>)}</div>
      <div className="bars">{data.map((d, i) => <div key={i}>{d.n}<i style={{ height: d.n / mx * 130 + 4 }} />{d.l}</div>)}</div></div>
    <div className="card"><h3>Recent visitors</h3><Table rows={v} cols={vcols} size={5} filters={['status']} /></div></div>
}

/* ---------- Approvals ---------- */
function Approvals() {
  const { db, act, user } = useC(), [c, setC] = useState({}), list = db.vis.filter(v => user.role !== 'employee' || v.host === user.name)
  const dec = (v, s) => act(x => ({ ...x, vis: x.vis.map(y => y.id === v.id ? { ...y, status: s, comment: c[v.id] || '' } : y) }), `${s} ${v.name}`, `Email/SMS to ${v.name}: your visit was ${s}. ${c[v.id] || ''}`)
  return <div><h1>Visitor approvals</h1><div className="card"><h3>Pending</h3><Table rows={list.filter(v => v.status === 'pending')} cols={vcols.slice(0, 6)} actions={v => <div className="row"><input placeholder="Comment" onChange={e => setC({ ...c, [v.id]: e.target.value })} /><button className="ok" onClick={() => dec(v, 'approved')}>Approve</button><button className="d" onClick={() => dec(v, 'rejected')}>Reject</button></div>} /></div>
    <div className="card"><h3>Approval status tracking</h3><Table rows={list.filter(v => v.status !== 'pending')} cols={[...vcols, { k: 'comment', h: 'Comment' }]} filters={['status']} /></div></div>
}

/* ---------- Check-in ---------- */
function Badge({ v }) {
  const [q, setQ] = useState(''); useEffect(() => { QRCode.toDataURL(v.id, { width: 140 }).then(setQ) }, [v.id]); const t = v.template || 't1'
  return <div className={'badge ' + t}>{v.photo ? <img className="ph" src={v.photo} /> : <div style={{ fontSize: 40 }}>👤</div>}<h3>{v.name}</h3><div>{v.company}</div><div>Host: {v.host} · {v.dept}</div><div>{v.room && 'Room: ' + v.room}</div><img src={q} width="120" /><div><b>{v.id}</b></div><small>{fmt(v.arrive)}</small></div>
}
function CheckIn() {
  const { db, act } = useC(), [sel, setSel] = useState(null), [cam, setCam] = useState(false), vref = useRef(), [code, setCode] = useState(''), [msg, setMsg] = useState(''), [badge, setBadge] = useState(null), [qr, setQr] = useState('')
  const exp = db.vis.filter(v => v.status === 'approved'); useEffect(() => { sel && QRCode.toDataURL(sel.id, { width: 160 }).then(setQr) }, [sel])
  const checkin = v => {
    if (db.black.some(b => b.email === v.email)) return setMsg('Blocked: blacklisted visitor'); const rs = db.restricted.find(r => r.area === v.area); let esc = ''; if (rs) { esc = prompt(`${rs.area} is restricted: ${rs.rule}\nEnter escort employee name to continue:`) || ''; if (!db.emps.some(e => e.name.toLowerCase() === esc.trim().toLowerCase())) return setMsg(`Check-in denied: ${rs.area} requires a valid employee escort.`) }
    const t = now(); act(s => ({ ...s, vis: s.vis.map(y => y.id === v.id ? { ...y, status: 'inside', inAt: t, escort: esc } : y) }), `Checked in ${v.name}${esc ? ' (escort ' + esc + ')' : ''}`, `${v.host}: ${v.name} has arrived`); setBadge({ ...v, inAt: t }); setMsg(`Checked in ${v.name} at ${fmt(t)}`)
  }
  const scan = id => { const v = exp.find(x => x.id === id.trim()); v ? checkin(v) : setMsg('No approved visitor matches this code.') }
  useEffect(() => {
    if (!cam) return; let st, t
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices) { setMsg('Camera QR scanning is not supported in this browser. Use Simulate scan or type the ID.'); setCam(false); return }
    const det = new window.BarcodeDetector({ formats: ['qr_code'] })
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(m => { st = m; vref.current.srcObject = m; vref.current.play(); t = setInterval(async () => { try { const r = await det.detect(vref.current); if (r[0]) { setCam(false); scan(r[0].rawValue) } } catch { } }, 500) }).catch(() => { setMsg('Camera access unavailable. Use Simulate scan or type the ID.'); setCam(false) })
    return () => { clearInterval(t); st && st.getTracks().forEach(x => x.stop()) }
  }, [cam])
  return <div><h1>Check-in</h1>{msg && <div className="alert" style={{ background: '#dcfce7', color: 'var(--ok)' }}>{msg}</div>}
    <div className="g2"><div className="card"><h3>Search expected visitors</h3><Table rows={exp} cols={vcols.slice(0, 4)} size={5} actions={v => <button className="s" onClick={() => setSel(v)}>Select</button>} /></div>
      <div className="card"><h3>QR scan</h3><p style={{ color: 'var(--mut)' }}>No camera needed: enter a visitor ID or simulate a scan.</p><div className="row"><input placeholder="Scan / type Visitor ID" value={code} onChange={e => setCode(e.target.value)} /><button onClick={() => scan(code)}>Scan</button><button className="s" onClick={() => setCam(!cam)}>{cam ? 'Stop camera' : 'Use camera'}</button><button className="g" onClick={() => exp.length && scan(exp[Math.floor(Math.random() * exp.length)].id)}>Simulate scan</button></div>
        {cam && <video ref={vref} muted playsInline style={{ width: '100%', borderRadius: 8 }} />}{sel && <div style={{ textAlign: 'center' }}><h3>{sel.name}</h3><img src={qr} /><div>{sel.id}</div><button className="ok" onClick={() => checkin(sel)}>Confirm check-in</button></div>}</div></div>
    {badge && <div className="modal"><div className="card"><select className="noprint" value={badge.template || 't1'} onChange={e => setBadge({ ...badge, template: e.target.value })}><option value="t1">Classic navy</option><option value="t2">Violet</option><option value="t3">Dark</option></select><Badge v={badge} /><div className="row noprint" style={{ justifyContent: 'center', marginTop: 12 }}><button onClick={() => window.print()}>Print pass</button><button className="g" onClick={() => setBadge(null)}>Close</button></div></div></div>}</div>
}

/* ---------- Check-out ---------- */
function CheckOut() {
  const { db, act } = useC(), inside = db.vis.filter(v => v.status === 'inside'), out = db.vis.filter(v => v.status === 'out').map(v => ({ ...v, duration: dur(v.inAt, v.outAt) }))
  const co = v => act(s => ({ ...s, vis: s.vis.map(y => y.id === v.id ? { ...y, status: 'out', outAt: now() } : y) }), `Checked out ${v.name}`)
  return <div><h1>Check-out</h1><div className="card"><h3>Currently inside</h3><Table rows={inside} cols={[...vcols.slice(0, 4), { k: 'inAt', h: 'In', r: v => fmt(v.inAt) }, { k: 'd', h: 'Duration', r: v => dur(v.inAt) }, { k: 'depart', h: 'Due', r: v => fmt(v.depart) }, vcols[6]]} actions={v => <button onClick={() => co(v)}>Check out</button>} /></div>
    <div className="card"><h3>Checkout history</h3><Table rows={out} cols={[...vcols.slice(0, 4), { k: 'outAt', h: 'Out', r: v => fmt(v.outAt) }, { k: 'duration', h: 'Duration' }]} /></div></div>
}

/* ---------- Employees ---------- */
function Employees() {
  const { db, act } = useC(), [f, setF] = useState(null), [nd, setNd] = useState(''), [er, setEr] = useState('')
  const save = () => { if (f.name.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(f.email) || !f.dept) return setEr('Name, valid email and department are required'); act(s => ({ ...s, emps: f.id ? s.emps.map(e => e.id === f.id ? f : e) : [...s.emps, { ...f, id: 'E' + Date.now() }] }), `${f.id ? 'Updated' : 'Added'} employee ${f.name}`); setF(null); setEr('') }
  const depts = [...new Set([...DEPTS, ...db.emps.map(e => e.dept)])]
  return <div><h1>Employees</h1><div className="row"><button onClick={() => setF({ name: '', email: '', phone: '', dept: '' })}>Add employee</button><input placeholder="New department" value={nd} onChange={e => setNd(e.target.value)} /><button className="s" onClick={() => { nd && DEPTS.push(nd); setNd('') }}>Add department</button></div>
    {f && <div className="card"><div className="form">{['name', 'email', 'phone'].map(k => <label key={k}>{k}<input value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>)}<label>dept<select value={f.dept} onChange={e => setF({ ...f, dept: e.target.value })}><option value="">Select</option>{depts.map(d => <option key={d}>{d}</option>)}</select></label></div>{er && <p className="err">{er}</p>}<p><button onClick={save}>Save employee</button> <button className="g" onClick={() => setF(null)}>Cancel</button></p></div>}
    <div className="card"><h3>Directory</h3><Table rows={db.emps.map(e => ({ ...e, hosting: db.vis.filter(v => v.host === e.name && ['approved', 'pending', 'inside'].includes(v.status)).length }))} cols={[{ k: 'name', h: 'Name' }, { k: 'dept', h: 'Department' }, { k: 'email', h: 'Email' }, { k: 'phone', h: 'Phone' }, { k: 'hosting', h: 'Hosting visitors' }]} filters={['dept']} actions={e => <div className="row"><button className="s" onClick={() => setF(e)}>Edit</button><button className="d" onClick={() => confirm('Delete employee?') && act(s => ({ ...s, emps: s.emps.filter(x => x.id !== e.id) }), `Deleted employee ${e.name}`)}>Delete</button></div>} /></div></div>
}

/* ---------- Security ---------- */
function Security() {
  const { db, act } = useC(), [b, setB] = useState({ name: '', email: '', phone: '', reason: '' }), [r, setR] = useState({ area: '', rule: '' })
  const dups = Object.values(db.vis.reduce((m, v) => { (m[v.phone] = m[v.phone] || []).push(v); return m }, {})).filter(a => a.length > 1).flat()
  return <div><h1>Security</h1><div className="g2"><div className="card"><h3>Blacklist</h3><div className="form">{Object.keys(b).map(k => <input key={k} placeholder={k} value={b[k]} onChange={e => setB({ ...b, [k]: e.target.value })} />)}</div><p><button className="d" onClick={() => { if (!b.name || !b.reason) return; act(s => ({ ...s, black: [...s.black, { ...b, id: 'B' + Date.now() }] }), `Blacklisted ${b.name}`); setB({ name: '', email: '', phone: '', reason: '' }) }}>Add to blacklist</button></p>
    <Table rows={db.black} cols={[{ k: 'name', h: 'Name' }, { k: 'email', h: 'Email' }, { k: 'reason', h: 'Reason' }]} actions={x => <button className="g" onClick={() => act(s => ({ ...s, black: s.black.filter(y => y.id !== x.id) }), `Removed ${x.name} from blacklist`)}>Remove</button>} /></div>
    <div className="card"><h3>Restricted access</h3><div className="row"><input placeholder="Area" value={r.area} onChange={e => setR({ ...r, area: e.target.value })} /><input placeholder="Rule" value={r.rule} onChange={e => setR({ ...r, rule: e.target.value })} /><button onClick={() => { r.area && act(s => ({ ...s, restricted: [...s.restricted, { ...r, id: 'R' + Date.now() }] }), `Restricted ${r.area}`); setR({ area: '', rule: '' }) }}>Add</button></div>
      <Table rows={db.restricted} cols={[{ k: 'area', h: 'Area' }, { k: 'rule', h: 'Rule' }]} actions={x => <button className="g" onClick={() => act(s => ({ ...s, restricted: s.restricted.filter(y => y.id !== x.id) }), `Removed restriction ${x.area}`)}>Delete</button>} /></div></div>
    <div className="card"><h3>Duplicate visitor detection (same mobile number)</h3><Table rows={dups} cols={vcols.slice(0, 4)} size={5} /></div>
    <div className="card"><h3>Visitor activity tracking</h3><Table rows={db.vis.filter(v => v.inAt)} cols={[{ k: 'id', h: 'ID' }, { k: 'name', h: 'Name' }, { k: 'inAt', h: 'In', r: v => fmt(v.inAt) }, { k: 'outAt', h: 'Out', r: v => fmt(v.outAt) }]} size={5} /></div></div>
}

/* ---------- Reports ---------- */
function Reports() {
  const { db } = useC(), [p, setP] = useState('all'), days = { daily: 1, monthly: 30, all: 1e5 }[p], rows = db.vis.filter(v => Date.now() - new Date(v.arrive) < days * D && new Date(v.arrive) < Date.now() + D)
  const byD = DEPTS.map(d => ({ id: d, dept: d, count: rows.filter(v => v.dept === d).length }))
  return <div><h1>Reports</h1><div className="row noprint">{['daily', 'monthly', 'all'].map(k => <button key={k} className={p === k ? '' : 'g'} onClick={() => setP(k)}>{k === 'all' ? 'Visitor history' : k + ' report'}</button>)}<button className="s" onClick={() => csv(rows, 'visitors_' + p)}>Export CSV</button><button onClick={() => window.print()}>Print report</button></div>
    <div className="card"><h3>Department-wise</h3><Table rows={byD} cols={[{ k: 'dept', h: 'Department' }, { k: 'count', h: 'Visitors' }]} /></div><div className="card"><h3>Visitors ({rows.length})</h3><Table rows={rows} cols={vcols} filters={['status', 'dept']} /></div></div>
}

/* ---------- Advanced ---------- */
function Advanced() {
  const { db, act, setDb } = useC(), [a, setA] = useState({ title: '', visitor: '', room: '', start: '' }), inside = db.vis.filter(v => v.status === 'inside'), [evac, setEvac] = useState(false)
  const busy = db.appts.some(x => x.room === a.room && x.start === a.start)
  return <div><h1>Advanced</h1><div className="g2"><div className="card"><h3>Appointment scheduling & room assignment</h3><div className="form" style={{ gridTemplateColumns: '1fr' }}><input placeholder="Title" value={a.title} onChange={e => setA({ ...a, title: e.target.value })} />
    <select value={a.visitor} onChange={e => setA({ ...a, visitor: e.target.value })}><option value="">Visitor…</option>{db.vis.filter(v => v.status !== 'rejected').slice(0, 30).map(v => <option key={v.id}>{v.name}</option>)}</select>
    <select value={a.room} onChange={e => setA({ ...a, room: e.target.value })}><option value="">Room…</option>{db.rooms.map(r => <option key={r.id}>{r.name}</option>)}</select><input type="datetime-local" value={a.start} onChange={e => setA({ ...a, start: e.target.value })} /></div>
    {busy && <p className="err">Room already booked at that time.</p>}<p><button disabled={busy || !a.title || !a.visitor || !a.room || !a.start} onClick={() => { act(s => ({ ...s, appts: [{ ...a, id: 'A' + Date.now() }, ...s.appts] }), `Scheduled ${a.title}`, `SMS: appointment "${a.title}" booked in ${a.room}`); setA({ title: '', visitor: '', room: '', start: '' }) }}>Schedule</button></p>
    <Table rows={db.appts} cols={[{ k: 'title', h: 'Title' }, { k: 'visitor', h: 'Visitor' }, { k: 'room', h: 'Room' }, { k: 'start', h: 'Start' }]} size={4} actions={x => <button className="g" onClick={() => act(s => ({ ...s, appts: s.appts.filter(y => y.id !== x.id) }), 'Cancelled appointment')}>Cancel</button>} /></div>
    <div className="card"><h3>Badge templates</h3>{db.vis[0] && ['t1', 't2', 't3'].map(t => <div key={t} style={{ marginBottom: 10 }}><Badge v={{ ...db.vis[0], template: t }} /></div>)}</div></div>
    <div className="card"><div className="row"><h3 style={{ margin: 0 }}>Emergency evacuation dashboard</h3><button className="d" onClick={() => setEvac(!evac)}>{evac ? 'End drill' : 'Start evacuation'}</button><button className="g" onClick={() => window.print()}>Print list</button></div>
      {evac && <div className="alert" style={{ marginTop: 10 }}>EVACUATION ACTIVE – {inside.filter(v => !v.safe).length} of {inside.length} still unaccounted for.</div>}
      <Table rows={inside} cols={[...vcols.slice(0, 4), { k: 'safe', h: 'Safe', r: v => v.safe ? '✔ Safe' : 'Unaccounted' }]} actions={v => <button className="ok" onClick={() => setDb(s => ({ ...s, vis: s.vis.map(y => y.id === v.id ? { ...y, safe: !y.safe } : y) }))}>Mark safe</button>} /></div></div>
}
const Logs = () => { const { db } = useC(); return <div><h1>Activity logs</h1><div className="card"><Table rows={db.logs.map((l, i) => ({ ...l, id: i, when: fmt(l.t) }))} cols={[{ k: 'when', h: 'Time' }, { k: 'by', h: 'User' }, { k: 'a', h: 'Action' }]} /></div></div> }
function Notes() { const { db, setDb } = useC(); return <div><h1>Notification center</h1><button className="g" onClick={() => setDb(s => ({ ...s, notes: s.notes.map(n => ({ ...n, read: true })) }))}>Mark all read</button><div className="card">{db.notes.length ? db.notes.map((n, i) => <p key={i} style={{ fontWeight: n.read ? 400 : 700 }}>✉ {n.m}<br /><small style={{ color: 'var(--mut)' }}>{fmt(n.t)}</small></p>) : 'No notifications yet. Register or approve a visitor to see simulated email and SMS messages.'}</div></div> }
function Profile() {
  const { db, user, setUser, setDb, act } = useC(), [f, setF] = useState({ name: user.name, email: user.email, pass: user.pass }), [m, setM] = useState('')
  return <div><h1>Profile</h1><div className="card form">{['name', 'email', 'pass'].map(k => <label key={k}>{k}<input type={k === 'pass' ? 'password' : 'text'} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>)}<div><button onClick={() => { if (f.name.length < 3 || f.pass.length < 6) return setM('Name min 3 and password min 6 chars'); setDb(s => ({ ...s, users: { ...s.users, [user.key]: { ...s.users[user.key], ...f } } })); setUser({ ...user, ...f }); setM('Profile saved'); }}>Save profile</button> <span>{m}</span></div></div></div>
}
function Search() {
  const { db } = useC(), nav = useNavigate(), [q, setQ] = useState(''), r = q.length > 1 ? [...db.vis.filter(v => (v.name + v.id + v.company).toLowerCase().includes(q.toLowerCase())).slice(0, 5).map(v => ({ k: v.id, t: `${v.name} – ${v.status}`, to: '/reports' })), ...db.emps.filter(e => e.name.toLowerCase().includes(q.toLowerCase())).slice(0, 3).map(e => ({ k: e.id, t: `${e.name} (employee)`, to: '/employees' }))] : []
  return <div style={{ position: 'relative', flex: 1 }}><input style={{ width: '100%' }} placeholder="Global search: visitors, IDs, employees…" value={q} onChange={e => setQ(e.target.value)} />{r.length > 0 && <div className="card" style={{ position: 'absolute', top: 42, width: '100%', margin: 0 }}>{r.map(x => <div key={x.k} style={{ padding: 6, cursor: 'pointer' }} onClick={() => { nav(x.to); setQ('') }}>{x.t}</div>)}</div>}</div>
}

const NAV = [['/', 'Dashboard'], ['/register', 'Register visitor'], ['/approvals', 'Approvals'], ['/checkin', 'Check-in'], ['/checkout', 'Check-out'], ['/employees', 'Employees'], ['/security', 'Security'], ['/reports', 'Reports'], ['/advanced', 'Advanced & evacuation'], ['/logs', 'Activity logs'], ['/notes', 'Notifications'], ['/profile', 'Profile']]
const ROLE = { admin: NAV.map(n => n[0]), receptionist: ['/', '/register', '/approvals', '/checkin', '/checkout', '/reports', '/advanced', '/notes', '/profile'], employee: ['/', '/approvals', '/reports', '/notes', '/profile'] }
function Shell() {
  const { user, setUser, dark, setDark, db, resetDemo } = useC(), nav = useNavigate()
  if (!user) return <Navigate to="/login" />
  const ok = ROLE[user.role], G = (p, C) => ok.includes(p) ? <C /> : <Navigate to="/" />
  return <div className="app"><aside className="side"><div className="logo">Visitor<b>Pass</b></div>{NAV.filter(n => ok.includes(n[0])).map(n => <NavLink key={n[0]} to={n[0]} end>{n[1]}{n[0] === '/notes' && db.notes.some(x => !x.read) ? ' ●' : ''}</NavLink>)}</aside>
    <div className="main"><div className="top noprint"><Search /><button className="g" onClick={() => setDark(!dark)}>{dark ? 'Light' : 'Dark'} mode</button><button className="g" onClick={() => confirm('Reset all demo data?') && resetDemo()}>Reset demo</button><span>{user.name} ({user.role})</span><button className="s" onClick={() => { setUser(null); nav('/login') }}>Sign out</button></div>
      <div className="pg"><Routes><Route path="/" element={<Dashboard />} /><Route path="/register" element={G('/register', Register)} /><Route path="/approvals" element={G('/approvals', Approvals)} /><Route path="/checkin" element={G('/checkin', CheckIn)} /><Route path="/checkout" element={G('/checkout', CheckOut)} /><Route path="/employees" element={G('/employees', Employees)} /><Route path="/security" element={G('/security', Security)} /><Route path="/reports" element={G('/reports', Reports)} /><Route path="/advanced" element={G('/advanced', Advanced)} /><Route path="/logs" element={G('/logs', Logs)} /><Route path="/notes" element={<Notes />} /><Route path="/profile" element={<Profile />} /></Routes></div></div></div>
}
export default function App() { return <Provider><HashRouter><Routes><Route path="/login" element={<Login />} /><Route path="/self" element={<Register pub />} /><Route path="/*" element={<Shell />} /></Routes></HashRouter></Provider> }
