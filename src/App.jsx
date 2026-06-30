import { useState, useRef, useEffect } from "react"
import { Plus, ChevronDown, ChevronRight, CheckCircle2, Circle, AlertCircle, FlaskConical, Target, Layers, Trash2, Edit3, X, Check, IndentIncrease, IndentDecrease, BookOpen, FileText, MoreHorizontal, HelpCircle, Zap, BarChart2 } from "lucide-react"
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts"

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
  .kb { --bg:#0f1117;--s1:#181c27;--s2:#1f2435;--bd:#2a3045;
    --amber:#f0a500;--green:#4ade80;--red:#f87171;--blue:#60a5fa;
    --t:#e2e8f0;--tm:#64748b;--td:#94a3b8;
    --mono:'IBM Plex Mono',monospace;--sans:'IBM Plex Sans',sans-serif;
    font-family:var(--sans);background:var(--bg);color:var(--t);
    min-height:100vh;line-height:1.6;display:flex;flex-direction:column;
  }
  .kb * { box-sizing:border-box; }
  .kb button { cursor:pointer;font-family:inherit; }
  .kb input,.kb textarea { font-family:inherit; }
  .kb ::-webkit-scrollbar { width:4px; }
  .kb ::-webkit-scrollbar-track { background:transparent; }
  .kb ::-webkit-scrollbar-thumb { background:#2a3045;border-radius:2px; }
  .ie-display { display:flex;align-items:flex-start;gap:4px;font-size:14px;color:#e2e8f0;line-height:1.5;cursor:text; }
  .proc-row:hover .proc-act { opacity:1 !important; }
  .proc-row input:focus { outline:none; }
  .cm-row:hover .cm-act { opacity:1 !important; }
  .picker-item { padding:8px 12px;font-size:12px;color:#64748b;cursor:pointer;border-radius:5px;transition:background .1s,color .1s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .picker-item:hover { background:#1f2435;color:#e2e8f0; }
  .picker-item.selected { color:#f0a500;font-weight:500; }
  .nav-pill { display:flex;align-items:center;gap:5px;background:#181c27;border:1px solid #2a3045;border-radius:7px;padding:4px 10px;cursor:pointer;font-family:monospace;font-size:11px;color:#94a3b8;transition:border-color .15s;min-width:0;max-width:200px; }
  .nav-pill:hover { border-color:#3a4460;color:#e2e8f0; }
  .nav-pill.open { border-color:#f0a500;color:#f0a500; }
  .why-row:hover .why-del { opacity:1 !important; }
  .tab-btn { background:none;border:none;border-radius:5px;padding:4px 11px;font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;white-space:nowrap; }
  .tab-btn.active { background:#1f2435;color:#f0a500; }
  .tab-btn.inactive { color:#64748b; }
`

const uid = () => Math.random().toString(36).slice(2,9)
const now = () => new Date().toISOString()
const fmt = iso => new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
const makeNode = (d=0) => ({id:uid(),text:'',depth:d,type:'step'})

const blankPage = (name='New Problem') => ({
  id:uid(), name, createdAt:now(),
  problem:'', currentMap:[makeNode()], targetMap:[makeNode()],
  obstacles:[], experiments:[], rcaEntries:[], countermeasures:[],
})
const blankNotebook = (name='Notebook') => ({
  id:uid(), name, open:true, pages:[blankPage('Problem 1')],
})
const INIT = { notebooks:[blankNotebook('My Kata Board')], activeNotebook:null, activePage:null }
INIT.activeNotebook = INIT.notebooks[0].id
INIT.activePage = INIT.notebooks[0].pages[0].id

const STATUS = {
  open:    {label:'Open',    color:'#f87171',bg:'rgba(248,113,113,.12)',icon:AlertCircle},
  active:  {label:'Working', color:'#f0a500',bg:'rgba(240,165,0,.12)',  icon:Circle},
  resolved:{label:'Resolved',color:'#4ade80',bg:'rgba(74,222,128,.12)', icon:CheckCircle2},
}
const OUTCOME = {
  learned:  {label:'Learned',    color:'#60a5fa',bg:'rgba(96,165,250,.12)'},
  confirmed:{label:'Confirmed',  color:'#4ade80',bg:'rgba(74,222,128,.12)'},
  failed:   {label:'Invalidated',color:'#f87171',bg:'rgba(248,113,113,.12)'},
}
const NODE_TYPES = {
  step:    {color:'#94a3b8',shape:'▶'},
  decision:{color:'#f0a500',shape:'◆'},
  note:    {color:'#64748b',shape:'○'},
}

// 9 Whys question set from Liberating Structures
const NINE_WHYS = [
  {num:1, q:"Why is this work important to you?"},
  {num:2, q:"Why is it important to the people you serve or work with?"},
  {num:3, q:"Why is it important to your organization?"},
  {num:4, q:"Why does it matter beyond your organization?"},
  {num:5, q:"Why is this the right moment to address it?"},
  {num:6, q:"Why have previous efforts not fully resolved it?"},
  {num:7, q:"Why do you believe a solution is possible?"},
  {num:8, q:"Why are you the right person / team to work on this?"},
  {num:9, q:"Why does this connect to something larger you care about?"},
]

// CM priority zone
const cmZone = (impact, effort) => {
  if (impact >= 5 && effort <= 5) return {label:'Quick Win', color:'#4ade80'}
  if (impact >= 5 && effort > 5)  return {label:'Big Bet',   color:'#f0a500'}
  if (impact < 5  && effort <= 5) return {label:'Fill In',   color:'#60a5fa'}
  return                                  {label:'Hard Sell', color:'#f87171'}
}

// ── InlineEdit ────────────────────────────────────────────────────────────────
function InlineEdit({value,onSave,placeholder,multiline=false,small=false}) {
  const [ed,setEd]=useState(false)
  const [draft,setDraft]=useState(value)
  useEffect(()=>setDraft(value),[value])
  const commit=()=>{onSave(draft);setEd(false)}
  const cancel=()=>{setDraft(value);setEd(false)}
  const fs={flex:1,background:'#1f2435',border:'1px solid #f0a500',borderRadius:6,
    padding:'5px 9px',color:'#e2e8f0',fontSize:small?12:14}
  if(!ed) return(
    <div className="ie-display" onClick={()=>setEd(true)}
      style={{fontSize:small?12:14,color:value?'#e2e8f0':'#64748b',fontStyle:value?'normal':'italic'}}>
      <span style={{whiteSpace:'pre-wrap',flex:1}}>{value||placeholder}</span>
      <Edit3 size={11} style={{opacity:.3,flexShrink:0,marginTop:2}}/>
    </div>
  )
  return(
    <div style={{display:'flex',gap:5,alignItems:'flex-start'}}>
      {multiline
        ?<textarea autoFocus value={draft} onChange={e=>setDraft(e.target.value)}
            onKeyDown={e=>e.key==='Escape'&&cancel()}
            style={{...fs,resize:'vertical',minHeight:56,lineHeight:1.5}}/>
        :<input autoFocus value={draft} onChange={e=>setDraft(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape')cancel()}}
            style={fs}/>}
      <button onClick={commit} style={{background:'#f0a500',border:'none',borderRadius:4,padding:'4px 6px',color:'#000',display:'flex'}}><Check size={13}/></button>
      <button onClick={cancel} style={{background:'#1f2435',border:'1px solid #2a3045',borderRadius:4,padding:'4px 6px',color:'#64748b',display:'flex'}}><X size={13}/></button>
    </div>
  )
}

// ── Process Map ───────────────────────────────────────────────────────────────
function ProcessMap({nodes,onChange}) {
  const refs=useRef({})
  const upd=(id,p)=>onChange(nodes.map(n=>n.id===id?{...n,...p}:n))
  const addAfter=idx=>{const nn=makeNode(nodes[idx]?.depth??0);const nx=[...nodes];nx.splice(idx+1,0,nn);onChange(nx);setTimeout(()=>refs.current[nn.id]?.focus(),30)}
  const del=id=>{const nx=nodes.filter(n=>n.id!==id);onChange(nx.length?nx:[makeNode()])}
  const indent=(id,idx)=>{if(idx===0)return;const m=(nodes[idx-1]?.depth??0)+1;upd(id,{depth:Math.min(nodes[idx].depth+1,m,4)})}
  const outdent=(id,idx)=>{if(nodes[idx].depth===0)return;upd(id,{depth:nodes[idx].depth-1})}
  const cycleType=id=>{const n=nodes.find(n=>n.id===id);const ks=Object.keys(NODE_TYPES);upd(id,{type:ks[(ks.indexOf(n.type)+1)%ks.length]})}
  const onKD=(e,idx,id)=>{
    if(e.key==='Enter'){e.preventDefault();addAfter(idx)}
    if(e.key==='Backspace'&&nodes[idx].text===''&&nodes.length>1){e.preventDefault();const p=nodes[idx-1]?.id;del(id);setTimeout(()=>p&&refs.current[p]?.focus(),30)}
    if(e.key==='Tab'){e.preventDefault();e.shiftKey?outdent(id,idx):indent(id,idx)}
  }
  const ctrs=[]
  const getLabel=(depth,type)=>{if(type==='note')return'—';while(ctrs.length<=depth)ctrs.push(0);ctrs[depth]++;ctrs.length=depth+1;return ctrs.slice(0,depth+1).join('.')}
  ctrs.length=0
  return(
    <div style={{display:'flex',flexDirection:'column',gap:1}}>
      {nodes.map((node,idx)=>{
        const t=NODE_TYPES[node.type]||NODE_TYPES.step
        const pad=node.depth*18
        return(
          <div key={node.id} className="proc-row" style={{display:'flex',alignItems:'center',gap:4,paddingLeft:pad,position:'relative',minHeight:28}}>
            {node.depth>0&&<div style={{position:'absolute',left:pad-9,top:0,bottom:0,width:1,background:'#1f2435'}}/>}
            <button onClick={()=>cycleType(node.id)} title="Cycle type" style={{background:'none',border:'none',padding:0,color:t.color,fontSize:10,flexShrink:0,width:12,lineHeight:1}}>{t.shape}</button>
            <span style={{fontSize:10,fontFamily:'monospace',color:'#2a3045',minWidth:26,flexShrink:0,userSelect:'none'}}>{getLabel(node.depth,node.type)}</span>
            <input ref={el=>refs.current[node.id]=el} value={node.text}
              onChange={e=>upd(node.id,{text:e.target.value})}
              onKeyDown={e=>onKD(e,idx,node.id)}
              placeholder={node.type==='decision'?'Decision point…':node.type==='note'?'Note…':'Process step…'}
              style={{flex:1,background:'transparent',border:'none',borderBottom:'1px solid transparent',
                color:node.type==='note'?'#64748b':'#e2e8f0',fontStyle:node.type==='note'?'italic':'normal',fontSize:13,padding:'2px 0'}}/>
            <div className="proc-act" style={{display:'flex',gap:0,opacity:0,transition:'opacity .12s',flexShrink:0}}>
              <button onClick={()=>indent(node.id,idx)} style={{background:'none',border:'none',color:'#3a4460',padding:'1px 2px',display:'flex'}}><IndentIncrease size={11}/></button>
              <button onClick={()=>outdent(node.id,idx)} style={{background:'none',border:'none',color:'#3a4460',padding:'1px 2px',display:'flex'}}><IndentDecrease size={11}/></button>
              <button onClick={()=>addAfter(idx)} style={{background:'none',border:'none',color:'#3a4460',padding:'1px 2px',display:'flex'}}><Plus size={11}/></button>
              <button onClick={()=>del(node.id)} style={{background:'none',border:'none',color:'#3a4460',padding:'1px 2px',display:'flex'}}><Trash2 size={11}/></button>
            </div>
          </div>
        )
      })}
      <div style={{display:'flex',gap:10,marginTop:6,paddingTop:6,borderTop:'1px solid #1f2435'}}>
        {Object.entries(NODE_TYPES).map(([,t])=>(
          <span key={t.shape} style={{fontSize:10,fontFamily:'monospace',color:'#2a3045',display:'flex',alignItems:'center',gap:3}}>
            <span style={{color:t.color}}>{t.shape}</span>{Object.keys(NODE_TYPES).find(k=>NODE_TYPES[k]===t)||''}
          </span>
        ))}
        <span style={{fontSize:10,fontFamily:'monospace',color:'#1f2435',marginLeft:'auto'}}>Enter=new · Tab=indent</span>
      </div>
    </div>
  )
}

// ── Obstacle Card ─────────────────────────────────────────────────────────────
function ObstacleCard({obstacle,onUpdate,onDelete}) {
  const [exp,setExp]=useState(false)
  const s=STATUS[obstacle.status]
  const Icon=s.icon
  const ss=['open','active','resolved']
  const cycle=()=>onUpdate({...obstacle,status:ss[(ss.indexOf(obstacle.status)+1)%ss.length]})
  return(
    <div style={{background:'#181c27',border:'1px solid #2a3045',borderLeft:`3px solid ${s.color}`,borderRadius:8,overflow:'hidden'}}>
      <div style={{padding:'11px 13px',display:'flex',gap:9,alignItems:'flex-start'}}>
        <button onClick={cycle} title="Cycle status" style={{background:'none',border:'none',padding:0,marginTop:2,flexShrink:0}}><Icon size={15} color={s.color}/></button>
        <div style={{flex:1,minWidth:0}}>
          <InlineEdit value={obstacle.text} onSave={text=>onUpdate({...obstacle,text})} placeholder="Describe the obstacle…"/>
          <div style={{display:'flex',gap:7,marginTop:5,alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontSize:11,fontFamily:'monospace',background:s.bg,color:s.color,borderRadius:4,padding:'1px 6px'}}>{s.label}</span>
            <span style={{fontSize:11,color:'#64748b',fontFamily:'monospace'}}>{fmt(obstacle.createdAt)}</span>
            {obstacle.measure&&<span style={{fontSize:11,color:'#60a5fa',fontFamily:'monospace'}}>📏 {obstacle.measure.length>44?obstacle.measure.slice(0,44)+'…':obstacle.measure}</span>}
          </div>
        </div>
        <div style={{display:'flex',gap:2,flexShrink:0}}>
          <button onClick={()=>setExp(v=>!v)} style={{background:'none',border:'none',color:'#2a3045',padding:2,display:'flex'}}>{exp?<ChevronDown size={13}/>:<ChevronRight size={13}/>}</button>
          <button onClick={onDelete} style={{background:'none',border:'none',color:'#64748b',padding:2,opacity:.4,display:'flex'}}><Trash2 size={12}/></button>
        </div>
      </div>
      {exp&&(
        <div style={{borderTop:'1px solid #1f2435',padding:'11px 13px',background:'#0f1117'}}>
          <div style={{fontSize:11,fontFamily:'monospace',color:'#60a5fa',marginBottom:7,letterSpacing:'.05em'}}>📏 HOW WILL YOU MEASURE THIS?</div>
          <InlineEdit value={obstacle.measure||''} onSave={measure=>onUpdate({...obstacle,measure})}
            placeholder="What metric or evidence shows this is resolved? e.g. 'Cycle time under 3 days'" multiline/>
        </div>
      )}
    </div>
  )
}

// ── Experiment Card ───────────────────────────────────────────────────────────
function ExperimentCard({exp,onDelete}) {
  const [open,setOpen]=useState(false)
  const o=OUTCOME[exp.outcome]
  return(
    <div style={{background:'#181c27',border:'1px solid #2a3045',borderRadius:8,overflow:'hidden'}}>
      <div onClick={()=>setOpen(v=>!v)} style={{padding:'11px 13px',display:'flex',gap:9,alignItems:'center',cursor:'pointer'}}>
        <FlaskConical size={13} color="#f0a500" style={{flexShrink:0}}/>
        <span style={{flex:1,fontSize:13,lineHeight:1.4}}>{exp.hypothesis||<em style={{color:'#64748b'}}>No hypothesis</em>}</span>
        <span style={{fontSize:11,fontFamily:'monospace',background:o.bg,color:o.color,borderRadius:4,padding:'1px 6px',flexShrink:0}}>{o.label}</span>
        {open?<ChevronDown size={13} color="#64748b"/>:<ChevronRight size={13} color="#64748b"/>}
      </div>
      {open&&(
        <div style={{borderTop:'1px solid #2a3045',padding:'11px 13px',display:'flex',flexDirection:'column',gap:9,background:'#0f1117'}}>
          {exp.action&&<div><div style={{fontSize:10,fontFamily:'monospace',color:'#64748b',marginBottom:3,letterSpacing:'.06em'}}>ACTION</div><div style={{fontSize:13,color:'#94a3b8',whiteSpace:'pre-wrap'}}>{exp.action}</div></div>}
          {exp.result&&<div><div style={{fontSize:10,fontFamily:'monospace',color:'#64748b',marginBottom:3,letterSpacing:'.06em'}}>RESULT</div><div style={{fontSize:13,color:'#94a3b8',whiteSpace:'pre-wrap'}}>{exp.result}</div></div>}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:11,fontFamily:'monospace',color:'#64748b'}}>{fmt(exp.createdAt)}</span>
            <button onClick={onDelete} style={{background:'none',border:'none',color:'#64748b',fontSize:12,display:'flex',alignItems:'center',gap:3,opacity:.6,cursor:'pointer'}}><Trash2 size={11}/>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Progress Ring ─────────────────────────────────────────────────────────────
function ProgressRing({resolved,total}) {
  const pct=total===0?0:resolved/total, r=20, circ=2*Math.PI*r
  return(
    <div style={{position:'relative',width:46,height:46,flexShrink:0}}>
      <svg width="46" height="46" style={{transform:'rotate(-90deg)'}}>
        <circle cx="23" cy="23" r={r} fill="none" stroke="#2a3045" strokeWidth="2.5"/>
        <circle cx="23" cy="23" r={r} fill="none" stroke="#f0a500" strokeWidth="2.5"
          strokeDasharray={`${circ*pct} ${circ}`} strokeLinecap="round" style={{transition:'stroke-dasharray .4s ease'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <span style={{fontSize:10,fontWeight:600,fontFamily:'monospace',color:'#f0a500'}}>{Math.round(pct*100)}%</span>
      </div>
    </div>
  )
}

// ── Score Slider ──────────────────────────────────────────────────────────────
function ScoreSlider({label,value,onChange,color='#f0a500'}) {
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:11,fontFamily:'monospace',color:'#64748b',letterSpacing:'.05em'}}>{label}</span>
        <span style={{fontSize:12,fontFamily:'monospace',color,fontWeight:600}}>{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={e=>onChange(Number(e.target.value))}
        style={{width:'100%',accentColor:color,cursor:'pointer'}}/>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:2}}>
        <span style={{fontSize:9,fontFamily:'monospace',color:'#2a3045'}}>Low (1)</span>
        <span style={{fontSize:9,fontFamily:'monospace',color:'#2a3045'}}>High (10)</span>
      </div>
    </div>
  )
}

// ── RCA Tab ───────────────────────────────────────────────────────────────────
function RCATab({entries, onUpdate}) {
  // entries: [{id, whyNum, answer, createdAt}]
  const [adding, setAdding] = useState(null) // whyNum being added
  const [draft, setDraft] = useState('')

  const saveEntry = (whyNum) => {
    if (!draft.trim()) { setAdding(null); return }
    const newEntry = { id:uid(), whyNum, answer:draft.trim(), createdAt:now() }
    onUpdate([...entries, newEntry])
    setDraft('')
    setAdding(null)
  }

  const deleteEntry = (id) => onUpdate(entries.filter(e=>e.id!==id))

  return(
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:14,fontWeight:600,color:'#e2e8f0',margin:0}}>Root Cause Analysis</h2>
        <p style={{fontSize:12,color:'#64748b',marginTop:3}}>
          9 Whys from Liberating Structures — each question deepens your understanding of purpose and root cause.
        </p>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {NINE_WHYS.map(({num, q})=>{
          const these = entries.filter(e=>e.whyNum===num)
          const isAdding = adding===num
          return(
            <div key={num} style={{background:'#181c27',border:'1px solid #2a3045',borderRadius:10,overflow:'hidden'}}>
              {/* Question header */}
              <div style={{padding:'12px 16px',display:'flex',gap:10,alignItems:'flex-start',borderLeft:`3px solid ${num<=3?'#f0a500':num<=6?'#60a5fa':'#4ade80'}`}}>
                <span style={{fontSize:12,fontWeight:700,fontFamily:'monospace',color:'#2a3045',flexShrink:0,marginTop:1}}>W{num}</span>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,color:'#94a3b8',margin:0,lineHeight:1.5}}>{q}</p>
                  {/* Logged answers */}
                  {these.length>0&&(
                    <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:6}}>
                      {these.map(e=>(
                        <div key={e.id} className="why-row" style={{display:'flex',gap:8,alignItems:'flex-start',background:'#0f1117',borderRadius:6,padding:'8px 10px'}}>
                          <p style={{flex:1,fontSize:13,color:'#e2e8f0',margin:0,whiteSpace:'pre-wrap'}}>{e.answer}</p>
                          <button className="why-del" onClick={()=>deleteEntry(e.id)}
                            style={{background:'none',border:'none',color:'#64748b',padding:0,display:'flex',opacity:0,transition:'opacity .12s',flexShrink:0}}>
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Add answer inline */}
                  {isAdding?(
                    <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:6}}>
                      <textarea autoFocus value={draft} onChange={e=>setDraft(e.target.value)}
                        onKeyDown={e=>{if(e.key==='Escape'){setAdding(null);setDraft('')}}}
                        placeholder="Write your answer…"
                        style={{width:'100%',background:'#1f2435',border:'1px solid #f0a500',borderRadius:6,padding:'7px 10px',color:'#e2e8f0',fontSize:13,resize:'vertical',lineHeight:1.5,minHeight:72}}
                        rows={3}/>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>saveEntry(num)}
                          style={{background:'#f0a500',border:'none',borderRadius:5,padding:'5px 12px',color:'#000',fontSize:12,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                          <Check size={12}/>Save
                        </button>
                        <button onClick={()=>{setAdding(null);setDraft('')}}
                          style={{background:'transparent',border:'1px solid #2a3045',borderRadius:5,padding:'5px 10px',color:'#64748b',fontSize:12,cursor:'pointer'}}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ):(
                    <button onClick={()=>{setAdding(num);setDraft('')}}
                      style={{marginTop:8,background:'none',border:'1px dashed #2a3045',borderRadius:5,padding:'4px 10px',color:'#64748b',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontFamily:'inherit'}}>
                      <Plus size={11}/>{these.length>0?'Add another answer':'Answer this why'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Countermeasures Tab ───────────────────────────────────────────────────────
function CountermeasuresTab({countermeasures, onUpdate}) {
  const [view, setView] = useState('list') // 'list' | 'chart'
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({title:'',description:'',impact:5,effort:5})
  const setF=(k,v)=>setForm(f=>({...f,[k]:v}))

  const addCm = () => {
    if (!form.title.trim()) return
    onUpdate([...countermeasures, {id:uid(), ...form, createdAt:now()}])
    setForm({title:'',description:'',impact:5,effort:5})
    setModal(false)
  }
  const delCm = id => onUpdate(countermeasures.filter(c=>c.id!==id))
  const updCm = cm => onUpdate(countermeasures.map(c=>c.id===cm.id?cm:c))

  // Tooltip for scatter chart
  const CustomTooltip = ({active, payload}) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    const z = cmZone(d.impact, d.effort)
    return(
      <div style={{background:'#1f2435',border:'1px solid #2a3045',borderRadius:8,padding:'10px 13px',maxWidth:220}}>
        <p style={{fontSize:13,fontWeight:600,color:'#e2e8f0',margin:'0 0 4px'}}>{d.title}</p>
        <p style={{fontSize:11,fontFamily:'monospace',margin:'0 0 6px',color:z.color}}>{z.label}</p>
        <p style={{fontSize:11,color:'#64748b',margin:0}}>Impact: <span style={{color:'#4ade80'}}>{d.impact}</span> · Effort: <span style={{color:'#f87171'}}>{d.effort}</span></p>
      </div>
    )
  }

  const chartData = countermeasures.map(c=>({...c, x:c.effort, y:c.impact}))

  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
        <div>
          <h2 style={{fontSize:14,fontWeight:600,color:'#e2e8f0',margin:0}}>Countermeasures</h2>
          <p style={{fontSize:12,color:'#64748b',marginTop:3}}>Score each by impact and effort to prioritize.</p>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <div style={{display:'flex',background:'#1f2435',borderRadius:6,padding:2,gap:1}}>
            <button onClick={()=>setView('list')} className={`tab-btn ${view==='list'?'active':'inactive'}`}>List</button>
            <button onClick={()=>setView('chart')} className={`tab-btn ${view==='chart'?'active':'inactive'}`}><BarChart2 size={11} style={{display:'inline',marginRight:3}}/>Matrix</button>
          </div>
          <button onClick={()=>setModal(true)}
            style={{background:'#f0a500',border:'none',borderRadius:5,padding:'5px 10px',color:'#000',fontSize:11,fontWeight:500,display:'flex',alignItems:'center',gap:3,cursor:'pointer'}}>
            <Plus size={12}/>Add
          </button>
        </div>
      </div>

      {/* Zone legend */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {[
          {label:'Quick Win', color:'#4ade80', desc:'High impact, low effort'},
          {label:'Big Bet',   color:'#f0a500', desc:'High impact, high effort'},
          {label:'Fill In',   color:'#60a5fa', desc:'Low impact, low effort'},
          {label:'Hard Sell', color:'#f87171', desc:'Low impact, high effort'},
        ].map(z=>(
          <div key={z.label} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontFamily:'monospace'}}>
            <div style={{width:8,height:8,borderRadius:2,background:z.color,flexShrink:0}}/>
            <span style={{color:z.color}}>{z.label}</span>
            <span style={{color:'#2a3045'}}>— {z.desc}</span>
          </div>
        ))}
      </div>

      {/* Chart view */}
      {view==='chart'&&(
        <div style={{background:'#181c27',border:'1px solid #2a3045',borderRadius:10,padding:'16px 8px 8px',marginBottom:16}}>
          <div style={{fontSize:10,fontFamily:'monospace',color:'#64748b',textAlign:'center',marginBottom:8,letterSpacing:'.06em'}}>
            IMPACT vs EFFORT MATRIX
          </div>
          {countermeasures.length===0
            ?<div style={{textAlign:'center',padding:'40px 0',color:'#64748b',fontSize:12,fontStyle:'italic'}}>Add countermeasures to see them plotted.</div>
            :<ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{top:10,right:20,bottom:20,left:10}}>
                <CartesianGrid stroke="#1f2435" strokeDasharray="3 3"/>
                <XAxis type="number" dataKey="x" domain={[0,11]} label={{value:'Effort →',position:'insideBottom',offset:-5,fill:'#64748b',fontSize:11}} tick={{fill:'#2a3045',fontSize:10}} tickLine={false}/>
                <YAxis type="number" dataKey="y" domain={[0,11]} label={{value:'Impact →',angle:-90,position:'insideLeft',fill:'#64748b',fontSize:11}} tick={{fill:'#2a3045',fontSize:10}} tickLine={false}/>
                <ReferenceLine x={5.5} stroke="#2a3045" strokeDasharray="4 4"/>
                <ReferenceLine y={5.5} stroke="#2a3045" strokeDasharray="4 4"/>
                <Tooltip content={<CustomTooltip/>}/>
                <Scatter data={chartData}>
                  {chartData.map((entry)=>{
                    const z=cmZone(entry.impact,entry.effort)
                    return <Cell key={entry.id} fill={z.color} fillOpacity={0.85}/>
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          }
          {/* Quadrant labels */}
          {countermeasures.length>0&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginTop:4,padding:'0 8px'}}>
              {[
                {label:'QUICK WINS',color:'#4ade80',sub:'Low effort · High impact'},
                {label:'BIG BETS',  color:'#f0a500',sub:'High effort · High impact'},
                {label:'FILL INS',  color:'#60a5fa',sub:'Low effort · Low impact'},
                {label:'HARD SELLS',color:'#f87171',sub:'High effort · Low impact'},
              ].map(q=>(
                <div key={q.label} style={{fontSize:9,fontFamily:'monospace',color:q.color,opacity:.5,textAlign:'center'}}>
                  {q.label} <span style={{color:'#2a3045'}}>— {q.sub}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List view */}
      {view==='list'&&(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {countermeasures.length===0&&(
            <div style={{textAlign:'center',padding:'40px 0',color:'#64748b',fontSize:12,fontStyle:'italic'}}>No countermeasures yet. Add one to start prioritizing.</div>
          )}
          {countermeasures.map(cm=>{
            const z=cmZone(cm.impact,cm.effort)
            return(
              <div key={cm.id} className="cm-row" style={{background:'#181c27',border:'1px solid #2a3045',borderLeft:`3px solid ${z.color}`,borderRadius:8,padding:'12px 14px'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <InlineEdit value={cm.title} onSave={title=>updCm({...cm,title})} placeholder="Countermeasure title…"/>
                    {cm.description&&<p style={{fontSize:12,color:'#64748b',margin:'4px 0 0',lineHeight:1.4}}>{cm.description}</p>}
                  </div>
                  <button onClick={()=>delCm(cm.id)} className="cm-act" style={{background:'none',border:'none',color:'#64748b',padding:2,opacity:0,display:'flex',transition:'opacity .12s',flexShrink:0}}><Trash2 size={13}/></button>
                </div>
                {/* Score bars */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <span style={{fontSize:10,fontFamily:'monospace',color:'#64748b',letterSpacing:'.05em'}}>IMPACT</span>
                      <span style={{fontSize:11,fontFamily:'monospace',color:'#4ade80',fontWeight:600}}>{cm.impact}</span>
                    </div>
                    <div style={{height:4,background:'#1f2435',borderRadius:2,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${cm.impact*10}%`,background:'#4ade80',borderRadius:2,transition:'width .3s'}}/>
                    </div>
                    <input type="range" min={1} max={10} value={cm.impact} onChange={e=>updCm({...cm,impact:Number(e.target.value)})}
                      style={{width:'100%',accentColor:'#4ade80',cursor:'pointer',marginTop:4}}/>
                  </div>
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <span style={{fontSize:10,fontFamily:'monospace',color:'#64748b',letterSpacing:'.05em'}}>EFFORT</span>
                      <span style={{fontSize:11,fontFamily:'monospace',color:'#f87171',fontWeight:600}}>{cm.effort}</span>
                    </div>
                    <div style={{height:4,background:'#1f2435',borderRadius:2,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${cm.effort*10}%`,background:'#f87171',borderRadius:2,transition:'width .3s'}}/>
                    </div>
                    <input type="range" min={1} max={10} value={cm.effort} onChange={e=>updCm({...cm,effort:Number(e.target.value)})}
                      style={{width:'100%',accentColor:'#f87171',cursor:'pointer',marginTop:4}}/>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                  <span style={{fontSize:11,fontFamily:'monospace',background:`${z.color}20`,color:z.color,borderRadius:4,padding:'2px 8px'}}>{z.label}</span>
                  <span style={{fontSize:10,fontFamily:'monospace',color:'#2a3045'}}>{fmt(cm.createdAt)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add modal */}
      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:16}}>
          <div style={{background:'#181c27',border:'1px solid #2a3045',borderRadius:12,padding:22,width:'100%',maxWidth:460}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <h2 style={{fontSize:15,fontWeight:600,color:'#f0a500',margin:0}}>Add Countermeasure</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'#64748b',display:'flex',cursor:'pointer'}}><X size={17}/></button>
            </div>
            <label style={{fontSize:11,fontFamily:'monospace',color:'#64748b',display:'block',marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase'}}>Title</label>
            <input autoFocus value={form.title} onChange={e=>setF('title',e.target.value)}
              placeholder="What's the countermeasure?"
              style={{width:'100%',background:'#1f2435',border:'1px solid #2a3045',borderRadius:6,padding:'7px 11px',color:'#e2e8f0',fontSize:13,marginBottom:12}}/>
            <label style={{fontSize:11,fontFamily:'monospace',color:'#64748b',display:'block',marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase'}}>Description (optional)</label>
            <textarea value={form.description} onChange={e=>setF('description',e.target.value)}
              placeholder="Brief description or rationale…"
              style={{width:'100%',background:'#1f2435',border:'1px solid #2a3045',borderRadius:6,padding:'7px 11px',color:'#e2e8f0',fontSize:13,resize:'vertical',lineHeight:1.5,marginBottom:16}}
              rows={2}/>
            <ScoreSlider label="IMPACT" value={form.impact} onChange={v=>setF('impact',v)} color="#4ade80"/>
            <div style={{marginTop:14}}/>
            <ScoreSlider label="EFFORT" value={form.effort} onChange={v=>setF('effort',v)} color="#f87171"/>
            <div style={{marginTop:8,padding:'8px 12px',background:'#0f1117',borderRadius:6,display:'flex',alignItems:'center',gap:8}}>
              {(()=>{const z=cmZone(form.impact,form.effort);return<><div style={{width:8,height:8,borderRadius:2,background:z.color}}/><span style={{fontSize:11,fontFamily:'monospace',color:z.color}}>{z.label}</span><span style={{fontSize:11,color:'#64748b',marginLeft:4}}>Impact {form.impact} · Effort {form.effort}</span></>})()}
            </div>
            <div style={{display:'flex',gap:7,justifyContent:'flex-end',marginTop:16}}>
              <button onClick={()=>setModal(false)} style={{background:'transparent',border:'1px solid #2a3045',borderRadius:6,padding:'6px 14px',color:'#64748b',fontSize:12,cursor:'pointer'}}>Cancel</button>
              <button onClick={addCm} style={{background:'#f0a500',border:'none',borderRadius:6,padding:'6px 16px',color:'#000',fontSize:12,fontWeight:500,cursor:'pointer'}}>Add Countermeasure</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modals ────────────────────────────────────────────────────────────────────
function Modal({title,children,onClose}) {
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:16}}>
      <div style={{background:'#181c27',border:'1px solid #2a3045',borderRadius:12,padding:22,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h2 style={{fontSize:15,fontWeight:600,color:'#f0a500',margin:0}}>{title}</h2>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#64748b',display:'flex',cursor:'pointer'}}><X size={17}/></button>
        </div>
        {children}
      </div>
    </div>
  )
}
const LS={fontSize:11,fontFamily:'monospace',color:'#64748b',display:'block',marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase'}
const FS={width:'100%',background:'#1f2435',border:'1px solid #2a3045',borderRadius:6,padding:'7px 11px',color:'#e2e8f0',fontSize:13}
const TA={...FS,resize:'vertical',lineHeight:1.5}
const Btn=({onClick,children,ghost=false})=>(
  <button onClick={onClick} style={{background:ghost?'transparent':'#f0a500',border:ghost?'1px solid #2a3045':'none',borderRadius:6,padding:'6px 14px',color:ghost?'#64748b':'#000',fontSize:12,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>{children}</button>
)
function ObstacleModal({onAdd,onClose}) {
  const [text,setText]=useState('')
  const [measure,setMeasure]=useState('')
  const submit=()=>{if(!text.trim())return;onAdd({id:uid(),text:text.trim(),measure:measure.trim(),status:'open',createdAt:now()});onClose()}
  return(
    <Modal title="Add Obstacle" onClose={onClose}>
      <label style={LS}>What's blocking you?</label>
      <textarea autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="Describe the obstacle…" style={TA} rows={3}/>
      <label style={{...LS,marginTop:14,color:'#60a5fa'}}>📏 How will you measure it?</label>
      <textarea value={measure} onChange={e=>setMeasure(e.target.value)} placeholder="Metric or evidence that shows this is resolved…" style={{...TA,borderColor:'#1e3a5f'}} rows={2}/>
      <div style={{display:'flex',gap:7,justifyContent:'flex-end',marginTop:14}}>
        <Btn ghost onClick={onClose}>Cancel</Btn>
        <Btn onClick={submit}>Add Obstacle</Btn>
      </div>
    </Modal>
  )
}
function ExperimentModal({onAdd,onClose}) {
  const [form,setForm]=useState({hypothesis:'',action:'',result:'',outcome:'learned'})
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  const submit=()=>{if(!form.hypothesis.trim())return;onAdd({id:uid(),...form,createdAt:now()});onClose()}
  return(
    <Modal title="Log Experiment" onClose={onClose}>
      <label style={LS}>Hypothesis</label>
      <input autoFocus value={form.hypothesis} onChange={e=>set('hypothesis',e.target.value)} placeholder="If I do X, I expect Y…" style={FS}/>
      <label style={{...LS,marginTop:11}}>Action Taken</label>
      <textarea value={form.action} onChange={e=>set('action',e.target.value)} placeholder="What did you do?" style={TA} rows={2}/>
      <label style={{...LS,marginTop:11}}>Result / Observed</label>
      <textarea value={form.result} onChange={e=>set('result',e.target.value)} placeholder="What happened?" style={TA} rows={2}/>
      <label style={{...LS,marginTop:11}}>Outcome</label>
      <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:3}}>
        {Object.entries(OUTCOME).map(([key,o])=>(
          <button key={key} onClick={()=>set('outcome',key)}
            style={{fontSize:11,fontFamily:'monospace',padding:'4px 11px',borderRadius:20,
              border:`1px solid ${form.outcome===key?o.color:'#2a3045'}`,
              background:form.outcome===key?o.bg:'transparent',
              color:form.outcome===key?o.color:'#64748b',cursor:'pointer'}}>{o.label}</button>
        ))}
      </div>
      <div style={{display:'flex',gap:7,justifyContent:'flex-end',marginTop:14}}>
        <Btn ghost onClick={onClose}>Cancel</Btn>
        <Btn onClick={submit}>Log Experiment</Btn>
      </div>
    </Modal>
  )
}

// ── Page Board ────────────────────────────────────────────────────────────────
function PageBoard({page,onUpdate}) {
  const [modal,setModal]=useState(null)
  const [tab,setTab]=useState('board')

  const upd=patch=>onUpdate({...page,...patch})
  const addObs=o=>upd({obstacles:[...page.obstacles,o]})
  const updObs=o=>upd({obstacles:page.obstacles.map(x=>x.id===o.id?o:x)})
  const delObs=id=>upd({obstacles:page.obstacles.filter(x=>x.id!==id)})
  const addExp=e=>upd({experiments:[e,...page.experiments]})
  const delExp=id=>upd({experiments:page.experiments.filter(x=>x.id!==id)})

  const resolved=page.obstacles.filter(o=>o.status==='resolved').length
  const total=page.obstacles.length
  const expCount=(page.experiments||[]).length
  const rcaCount=(page.rcaEntries||[]).length
  const cmCount=(page.countermeasures||[]).length

  const TABS = [
    {id:'board', label:'Board'},
    {id:'rca',   label:`RCA (${rcaCount})`},
    {id:'cm',    label:`Cm (${cmCount})`},
    {id:'ex',    label:`Ex (${expCount})`},
  ]

  return(
    <div style={{flex:1,overflowY:'auto'}}>
      {/* Tab bar */}
      <div style={{borderBottom:'1px solid #2a3045',padding:'0 28px',background:'#0f1117',position:'sticky',top:0,zIndex:5}}>
        <div style={{display:'flex',gap:1,height:44,alignItems:'center'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} className={`tab-btn ${tab===t.id?'active':'inactive'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'22px 28px 80px',maxWidth:700}}>

        {/* ── BOARD TAB ── */}
        {tab==='board'&&(
          <>
            <section style={{background:'#181c27',border:'1px solid #2a3045',borderRadius:10,padding:'16px 18px',marginBottom:16}}>
              <div style={{fontSize:10,fontFamily:'monospace',color:'#64748b',marginBottom:7,letterSpacing:'.08em'}}>PROBLEM STATEMENT</div>
              <InlineEdit value={page.problem} onSave={problem=>upd({problem})} placeholder="What problem are you working on? Click to define it." multiline/>
            </section>
            <section style={{background:'#181c27',border:'1px solid #2a3045',borderRadius:10,padding:'16px 18px',marginBottom:16}}>
              <div style={{fontSize:10,fontFamily:'monospace',color:'#64748b',marginBottom:10,letterSpacing:'.08em',display:'flex',alignItems:'center',gap:5}}>
                <Layers size={10}/> CURRENT CONDITION — PROCESS MAP
              </div>
              <ProcessMap nodes={page.currentMap} onChange={currentMap=>upd({currentMap})}/>
            </section>
            <section style={{background:'#181c27',border:'1px solid #2a3045',borderLeft:'3px solid #f0a500',borderRadius:10,padding:'16px 18px',marginBottom:16}}>
              <div style={{fontSize:10,fontFamily:'monospace',color:'#f0a500',marginBottom:10,letterSpacing:'.08em',display:'flex',alignItems:'center',gap:5}}>
                <Target size={10}/> TARGET CONDITION — PROCESS MAP
              </div>
              <ProcessMap nodes={page.targetMap} onChange={targetMap=>upd({targetMap})}/>
            </section>
            <section>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontSize:11,fontFamily:'monospace',color:'#64748b',letterSpacing:'.08em'}}>OBSTACLES</span>
                  <ProgressRing resolved={resolved} total={total}/>
                  <div>
                    <div style={{fontSize:11,color:'#94a3b8'}}>{resolved}/{total} resolved</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{page.obstacles.filter(o=>o.status==='active').length} in progress</div>
                  </div>
                </div>
                <button onClick={()=>setModal('obstacle')}
                  style={{background:'#f0a500',border:'none',borderRadius:5,padding:'5px 10px',color:'#000',fontSize:11,fontWeight:500,display:'flex',alignItems:'center',gap:3,cursor:'pointer'}}>
                  <Plus size={12}/>Add
                </button>
              </div>
              {total===0&&<div style={{textAlign:'center',padding:'30px 0',color:'#64748b',fontSize:12,fontStyle:'italic'}}>No obstacles logged yet.</div>}
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                {page.obstacles.filter(o=>o.status!=='resolved').map(o=>(
                  <ObstacleCard key={o.id} obstacle={o} onUpdate={updObs} onDelete={()=>delObs(o.id)}/>
                ))}
                {page.obstacles.filter(o=>o.status==='resolved').length>0&&(
                  <>
                    <div style={{fontSize:10,fontFamily:'monospace',color:'#2a3045',margin:'6px 0 3px'}}>─── RESOLVED ───</div>
                    {page.obstacles.filter(o=>o.status==='resolved').map(o=>(
                      <ObstacleCard key={o.id} obstacle={o} onUpdate={updObs} onDelete={()=>delObs(o.id)}/>
                    ))}
                  </>
                )}
              </div>
            </section>
          </>
        )}

        {/* ── RCA TAB ── */}
        {tab==='rca'&&(
          <RCATab entries={page.rcaEntries||[]} onUpdate={rcaEntries=>upd({rcaEntries})}/>
        )}

        {/* ── COUNTERMEASURES TAB ── */}
        {tab==='cm'&&(
          <CountermeasuresTab countermeasures={page.countermeasures||[]} onUpdate={countermeasures=>upd({countermeasures})}/>
        )}

        {/* ── EXPERIMENT RECORD TAB ── */}
        {tab==='ex'&&(
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <div>
                <h2 style={{fontSize:14,fontWeight:600,color:'#e2e8f0',margin:0}}>Experimenting Record</h2>
                <p style={{fontSize:12,color:'#64748b',marginTop:3}}>Your PDCA history — every test and what you learned.</p>
              </div>
              <Btn onClick={()=>setModal('experiment')}><Plus size={12}/>Log Experiment</Btn>
            </div>
            {expCount>0&&(
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
                {Object.entries(OUTCOME).map(([key,o])=>(
                  <div key={key} style={{background:'#181c27',border:'1px solid #2a3045',borderRadius:7,padding:'10px 12px',textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:700,fontFamily:'monospace',color:o.color}}>{page.experiments.filter(e=>e.outcome===key).length}</div>
                    <div style={{fontSize:10,fontFamily:'monospace',color:'#64748b',marginTop:1}}>{o.label}</div>
                  </div>
                ))}
              </div>
            )}
            {expCount===0&&<div style={{textAlign:'center',padding:'50px 0',color:'#64748b',fontSize:12,fontStyle:'italic'}}>No experiments yet.</div>}
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {(page.experiments||[]).map(e=><ExperimentCard key={e.id} exp={e} onDelete={()=>delExp(e.id)}/>)}
            </div>
          </>
        )}
      </div>

      {/* FAB — context-aware */}
      {(tab==='board'||tab==='ex')&&(
        <div style={{position:'fixed',bottom:22,right:22}}>
          <button onClick={()=>setModal(tab==='board'?'obstacle':'experiment')}
            style={{background:'#f0a500',border:'none',borderRadius:'50%',width:46,height:46,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 18px rgba(240,165,0,.35)',cursor:'pointer'}}>
            <Plus size={20} color="#000"/>
          </button>
        </div>
      )}

      {modal==='obstacle'&&<ObstacleModal onAdd={addObs} onClose={()=>setModal(null)}/>}
      {modal==='experiment'&&<ExperimentModal onAdd={addExp} onClose={()=>setModal(null)}/>}
    </div>
  )
}


// ── Scroll-wheel Picker Dropdown ─────────────────────────────────────────────
function ScrollPicker({label, icon, items, selectedId, onSelect, onAdd, addLabel, onRename, onDelete}) {
  const [open, setOpen] = useState(false)
  const [renamingId, setRenamingId] = useState(null)
  const [renameDraft, setRenameDraft] = useState('')
  const ref = useRef(null)
  const selected = items.find(i=>i.id===selectedId)

  // Close on outside click
  useEffect(()=>{
    if(!open) return
    const h = e => { if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return ()=>document.removeEventListener('mousedown', h)
  },[open])

  const startRename = (item, e) => {
    e.stopPropagation()
    setRenamingId(item.id)
    setRenameDraft(item.name)
  }
  const commitRename = (id) => {
    if(renameDraft.trim()) onRename(id, renameDraft.trim())
    setRenamingId(null)
  }

  return(
    <div ref={ref} style={{position:'relative'}}>
      <button className={`nav-pill${open?' open':''}`} onClick={()=>setOpen(v=>!v)}>
        <span style={{fontSize:9,color:'inherit',letterSpacing:'.06em',textTransform:'uppercase',flexShrink:0}}>{label}</span>
        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,textAlign:'left',color: open?'#f0a500':'#e2e8f0',fontSize:12}}>
          {selected?.name || '—'}
        </span>
        <ChevronDown size={10} style={{flexShrink:0,transform:open?'rotate(180deg)':'none',transition:'transform .15s'}}/>
      </button>

      {open&&(
        <div style={{
          position:'absolute',top:'calc(100% + 6px)',left:0,
          background:'#181c27',border:'1px solid #2a3045',borderRadius:10,
          zIndex:300,minWidth:200,maxWidth:260,
          boxShadow:'0 8px 32px rgba(0,0,0,.5)',
          padding:4,
        }}>
          {/* Scrollable item list */}
          <div style={{maxHeight:220,overflowY:'auto',padding:'2px 0'}}>
            {items.map(item=>(
              <div key={item.id}
                className={`picker-item${item.id===selectedId?' selected':''}`}
                style={{display:'flex',alignItems:'center',gap:6}}
                onClick={()=>{ onSelect(item.id); setOpen(false) }}>
                {renamingId===item.id
                  ?(
                    <input autoFocus value={renameDraft}
                      onChange={e=>setRenameDraft(e.target.value)}
                      onBlur={()=>commitRename(item.id)}
                      onKeyDown={e=>{if(e.key==='Enter')commitRename(item.id);if(e.key==='Escape')setRenamingId(null)}}
                      onClick={e=>e.stopPropagation()}
                      style={{flex:1,background:'#1f2435',border:'1px solid #f0a500',borderRadius:4,padding:'2px 6px',color:'#e2e8f0',fontSize:12}}/>
                  ):(
                    <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis'}}>{item.name}</span>
                  )
                }
                {item.id===selectedId&&(
                  <div style={{display:'flex',gap:2,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                    <button onClick={e=>startRename(item,e)}
                      style={{background:'none',border:'none',color:'#2a3045',padding:'1px 3px',display:'flex',cursor:'pointer',borderRadius:3}}>
                      <Edit3 size={10}/>
                    </button>
                    {items.length>1&&onDelete&&(
                      <button onClick={e=>{e.stopPropagation();onDelete(item.id)}}
                        style={{background:'none',border:'none',color:'#2a3045',padding:'1px 3px',display:'flex',cursor:'pointer',borderRadius:3}}>
                        <Trash2 size={10}/>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Add new */}
          {onAdd&&(
            <div style={{borderTop:'1px solid #1f2435',marginTop:2,paddingTop:2}}>
              <button onClick={()=>{onAdd();setOpen(false)}}
                style={{display:'flex',alignItems:'center',gap:6,width:'100%',background:'none',border:'none',padding:'8px 12px',color:'#64748b',fontSize:12,cursor:'pointer',borderRadius:5,fontFamily:'inherit'}}>
                <Plus size={11}/>{addLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Top Ribbon ────────────────────────────────────────────────────────────────
function TopRibbon({notebooks,activeNb,activePg,onSelectNotebook,onSelectPage,onAddNotebook,onAddPage,onRenameNotebook,onRenamePage,onDeleteNotebook,onDeletePage}) {
  const activeNotebook = notebooks.find(n=>n.id===activeNb)
  const pages = activeNotebook?.pages || []

  const handleSelectNotebook = (nbId) => {
    onSelectNotebook(nbId)
    // auto-select first page of new notebook
    const nb = notebooks.find(n=>n.id===nbId)
    if(nb?.pages?.[0]) onSelectPage(nb.pages[0].id)
  }

  return(
    <div style={{
      height:52,flexShrink:0,
      background:'#0d1018',borderBottom:'1px solid #1f2435',
      display:'flex',alignItems:'center',
      padding:'0 20px',gap:12,
    }}>
      {/* Brand */}
      <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0,marginRight:4}}>
        <span style={{fontFamily:'monospace',color:'#f0a500',fontWeight:700,fontSize:15,letterSpacing:'.06em'}}>KATA</span>
        <span style={{fontFamily:'monospace',color:'#2a3045',fontSize:10}}>boards</span>
      </div>

      {/* Divider */}
      <div style={{width:1,height:22,background:'#1f2435',flexShrink:0}}/>

      {/* Notebook picker */}
      <ScrollPicker
        label="NB"
        items={notebooks}
        selectedId={activeNb}
        onSelect={handleSelectNotebook}
        onAdd={onAddNotebook}
        addLabel="New notebook"
        onRename={onRenameNotebook}
        onDelete={onDeleteNotebook}
      />

      {/* Arrow separator */}
      <ChevronRight size={12} color="#2a3045" style={{flexShrink:0}}/>

      {/* Page picker */}
      <ScrollPicker
        label="PG"
        items={pages}
        selectedId={activePg}
        onSelect={onSelectPage}
        onAdd={()=>onAddPage(activeNb)}
        addLabel="New page"
        onRename={(pgId,name)=>onRenamePage(activeNb,pgId,name)}
        onDelete={(pgId)=>onDeletePage(activeNb,pgId)}
      />

      {/* Spacer */}
      <div style={{flex:1}}/>
    </div>
  )
}

function MenuBtn({onClick,children,danger=false}) {
  return(
    <button onClick={onClick} style={{display:'block',width:'100%',textAlign:'left',background:'none',border:'none',padding:'5px 10px',color:danger?'#f87171':'#94a3b8',fontSize:12,cursor:'pointer',borderRadius:4,fontFamily:'inherit'}}>
      {children}
    </button>
  )
}

// ── Persistence ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'kata-board-data-v1'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.notebooks?.length) return null
    return parsed
  } catch { return null }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }
  catch (e) { console.error('Failed to save kata board state:', e) }
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const saved = loadState()
  const [notebooks,setNbs]=useState(saved?.notebooks || INIT.notebooks)
  const [activeNb,setActiveNb]=useState(saved?.activeNotebook || INIT.activeNotebook)
  const [activePg,setActivePg]=useState(saved?.activePage || INIT.activePage)

  // Persist on every change
  useEffect(() => {
    saveState({ notebooks, activeNotebook: activeNb, activePage: activePg })
  }, [notebooks, activeNb, activePg])

  const updNbs=fn=>setNbs(fn)
  const getActivePage=()=>{const nb=notebooks.find(n=>n.id===activeNb);return nb?.pages.find(p=>p.id===activePg)||null}
  const updatePage=(nbId,pgId,patch)=>updNbs(nbs=>nbs.map(nb=>nb.id!==nbId?nb:{...nb,pages:nb.pages.map(pg=>pg.id!==pgId?pg:{...pg,...patch})}))

  const selectNotebook = (nbId) => setActiveNb(nbId)
  const selectPage = (pgId) => setActivePg(pgId)

  const addPage=nbId=>{
    const pg=blankPage('New Problem')
    updNbs(nbs=>nbs.map(nb=>nb.id!==nbId?nb:{...nb,pages:[...nb.pages,pg]}))
    setActivePg(pg.id)
  }
  const addNotebook=()=>{
    const nb=blankNotebook('New Notebook')
    updNbs(nbs=>[...nbs,nb])
    setActiveNb(nb.id)
    setActivePg(nb.pages[0].id)
  }
  const renameNotebook=(nbId,name)=>updNbs(nbs=>nbs.map(nb=>nb.id!==nbId?nb:{...nb,name}))
  const renamePage=(nbId,pgId,name)=>updatePage(nbId,pgId,{name})

  const deleteNotebook=nbId=>{
    const r=notebooks.filter(n=>n.id!==nbId)
    const safe=r.length?r:[blankNotebook('My Kata Board')]
    updNbs(()=>safe)
    if(activeNb===nbId){setActiveNb(safe[0].id);setActivePg(safe[0].pages[0].id)}
  }
  const deletePage=(nbId,pgId)=>{
    updNbs(nbs=>nbs.map(nb=>{
      if(nb.id!==nbId)return nb
      const pages=nb.pages.filter(p=>p.id!==pgId)
      const safe=pages.length?pages:[blankPage('Problem 1')]
      return{...nb,pages:safe}
    }))
    if(activePg===pgId){
      const nb=notebooks.find(n=>n.id===nbId)
      const pg=nb?.pages.find(p=>p.id!==pgId)
      if(pg)setActivePg(pg.id)
    }
  }

  const page=getActivePage()

  return(
    <div className="kb" style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <style>{CSS}</style>

      <TopRibbon
        notebooks={notebooks}
        activeNb={activeNb}
        activePg={activePg}
        onSelectNotebook={selectNotebook}
        onSelectPage={selectPage}
        onAddNotebook={addNotebook}
        onAddPage={addPage}
        onRenameNotebook={renameNotebook}
        onRenamePage={renamePage}
        onDeleteNotebook={deleteNotebook}
        onDeletePage={deletePage}
      />

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {page
          ?<PageBoard key={page.id} page={page} onUpdate={p=>updatePage(activeNb,activePg,p)}/>
          :<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b',fontSize:13}}>Select or create a page</div>
        }
      </div>
    </div>
  )
}
