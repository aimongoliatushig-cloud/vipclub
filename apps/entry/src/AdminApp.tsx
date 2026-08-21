import {useCallback,useEffect,useMemo,useState} from 'react'
import {CalendarClock,Check,ChevronLeft,ChevronRight,DoorOpen,QrCode,RefreshCw,Search,ShieldCheck,SlidersHorizontal,Star,UserRoundX,Users} from 'lucide-react'
import {api,type AppContext,type BranchCustomers,type CustomerRankRule,type RankSettings} from './api'
import {Header} from './AppHeader'
import {AdminAttendanceQR} from './AdminAttendanceQR'

const rankNames=['Bronze','Silver','Gold','Diamond','Black Diamond'] as const
const rankClass=(value:string)=>`rank-${value.toLowerCase().replace(/\s+/g,'-')}`
const numberFormat=new Intl.NumberFormat('mn-MN',{maximumFractionDigits:0})
const moneyFormat=new Intl.NumberFormat('mn-MN',{style:'currency',currency:'MNT',maximumFractionDigits:0})
const dateTime=(value:string|null)=>value?new Intl.DateTimeFormat('mn-MN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'Хараахан шинэчлээгүй'
const dateOnly=(value:string|null)=>value?new Intl.DateTimeFormat('mn-MN',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)):'—'

function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string|number}){
 return <div className="admin-metric">{icon}<span>{label}<strong>{value}</strong></span></div>
}

export default function AdminApp({ctx,onLogout}:{ctx:AppContext;onLogout:()=>void}){
 const [settings,setSettings]=useState<RankSettings|null>(null)
 const [draft,setDraft]=useState<CustomerRankRule[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [customers,setCustomers]=useState<BranchCustomers|null>(null)
 const [customerLoading,setCustomerLoading]=useState(false)
 const [customerError,setCustomerError]=useState('')
 const [customerSearch,setCustomerSearch]=useState('')
 const [rankFilter,setRankFilter]=useState('All')
 const [customerStart,setCustomerStart]=useState(0)

 const load=useCallback(async(branch?:string)=>{
  setLoading(true);setError('')
  try{const result=await api.rankSettings(branch);setSettings(result);setDraft(result.rules)}
  catch(err){setError(err instanceof Error?err.message:'Гишүүнчлэлийн бодлогыг ачаалж чадсангүй')}
  finally{setLoading(false)}
 },[])
 useEffect(()=>{load()},[load])
 useEffect(()=>{
  if(!settings?.branch)return
  const timer=window.setTimeout(async()=>{setCustomerLoading(true);setCustomerError('');try{setCustomers(await api.branchCustomers(settings.branch,rankFilter,customerSearch,customerStart))}catch(err){setCustomerError(err instanceof Error?err.message:'Хэрэглэгчдийн мэдээлэл авах боломжгүй байна')}finally{setCustomerLoading(false)}},customerSearch?300:0)
  return()=>window.clearTimeout(timer)
 },[settings?.branch,rankFilter,customerSearch,customerStart])

 const selectBranch=(branch:string)=>{
  if(branch===settings?.branch)return
  setCustomerSearch('');setRankFilter('All');setCustomerStart(0);load(branch)
 }
 const ordered=useMemo(()=>rankNames.map(rank=>draft.find(row=>row.membership_rank===rank)).filter(Boolean) as CustomerRankRule[],[draft])
 const stats=settings?.stats

 return <div className="admin-shell"><Header ctx={ctx} onLogout={onLogout} title="Системийн админ"/><main className="admin-main">
  <nav className="branch-tabs" aria-label="Салбар сонгох">{(settings?.branches||['Nomad','Neva','Sapphire','Monarch']).map(branch=><button key={branch} className={settings?.branch===branch?'active':''} onClick={()=>selectBranch(branch)} disabled={loading}>{branch}</button>)}</nav>
  <section className="admin-page-intro">
   <div><h1>{settings?.branch||'Салбар'} салбарын тохиргоо</h1><p>Тохируулах ажлаа сонгоод тухайн хэсэгт шууд очно.</p></div>
   <nav className="admin-task-nav" aria-label="Админ ажлын хэсгүүд">
    <a href="#rank-settings"><SlidersHorizontal/><span><strong>Зэрэглэл</strong><small>Дүрэм ба шинэчлэлт</small></span></a>
    <a href="#attendance-qr"><QrCode/><span><strong>Ажилтны ирц</strong><small>Ирцийн QR хэвлэх</small></span></a>
    <a href="#entry-qr"><DoorOpen/><span><strong>VIP Entry</strong><small>Үүдний эрхийн QR</small></span></a>
    <a href="#branch-customers"><Users/><span><strong>Харилцагчид</strong><small>Зэрэглэл ба хайлт</small></span></a>
   </nav>
  </section>
  {error&&<div className="error-box wide">{error}</div>}
  <section className="admin-summary">
   <Metric icon={<Users/>} label="Нийт хэрэглэгч" value={numberFormat.format(stats?.total_customers||0)}/>
   <Metric icon={<Star/>} label="Зэрэглэлтэй" value={numberFormat.format(stats?.ranked_customers||0)}/>
   <Metric icon={<UserRoundX/>} label="Зэрэглэлгүй" value={numberFormat.format(stats?.unranked_customers||0)}/>
   <Metric icon={<CalendarClock/>} label="Сүүлд шинэчилсэн" value={dateTime(stats?.last_applied_at||null)}/>
  </section>
  <section className="rank-settings-panel" id="rank-settings">
   <div className="rank-settings-title"><div><h2>Салбарын гишүүнчлэлийн бодлого</h2><p>{settings?.branch||'—'} салбар · Шалгаж баталсан бодлогын хувилбарыг энд харуулна</p></div><ShieldCheck/></div>
   {settings?.policy?<div className="membership-policy-status active"><Check/><span><strong>Идэвхтэй бодлого · {settings.policy.version}</strong><small>Сүүлийн {settings.policy.lookback_visit_count} шаардлага хангасан ирэлтийн дунджаар тооцно · Шийдвэрлэх эрх: {settings.policy.decision_role}</small></span></div>:!loading?<div className="membership-policy-status required"><ShieldCheck/><span><strong>Идэвхтэй бодлого хараахан батлагдаагүй</strong><small>Доорх босго нь өмнөх тохиргооны лавлагаа. Одоогийн хэрэглэгчийн зэрэглэлд шууд өөрчлөлт хийхгүй.</small></span></div>:null}
   <div className="rank-settings-table">
    <div className="rank-settings-head"><span>VIP зэрэг</span><span>Дундаж чекийн доод босго</span><span>Төлөв</span></div>
    {loading?<div className="admin-loading"><RefreshCw className="spin"/>Тохиргоо ачаалж байна…</div>:ordered.map(row=><div className="rank-settings-row" key={row.membership_rank}>
     <div className={`rank-name ${rankClass(row.membership_rank)}`}><i/><strong>{row.membership_rank}</strong></div>
     <label className="threshold-input"><input aria-label={`${row.membership_rank} дундаж чекийн доод босго`} type="number" value={row.minimum_average_bill} readOnly/><span>MNT</span></label>
     <span className={`policy-rule-state ${settings?.rules_are_reference_only?'reference':row.active?'active':''}`}>{settings?.rules_are_reference_only?'Лавлагаа':row.active?'Хүчинтэй':'Идэвхгүй'}</span>
    </div>)}
   </div>
   <div className="rank-policy-note"><ShieldCheck/><p>Гишүүнчлэлийн зэрэглэлийг систем санал болгож, эрх бүхий ажилтан шалгаж шийдвэрлэнэ. Энэ дэлгэцээс хэрэглэгчдийн зэрэглэлийг бөөнөөр шууд өөрчлөхгүй.</p></div>
  </section>
  {settings?.branch?<AdminAttendanceQR branch={settings.branch}/>:null}
  <section className="admin-customer-panel" id="branch-customers">
   <div className="customer-panel-heading"><div><h2>Салбарын хэрэглэгчид</h2><p>{settings?.branch||'—'} салбарын нийт {numberFormat.format(customers?.total||0)} хэрэглэгч</p></div><div className="customer-filters"><label className="customer-search"><Search/><input aria-label="Хэрэглэгч хайх" placeholder="Нэр эсвэл утсаар хайх" value={customerSearch} onChange={event=>{setCustomerSearch(event.target.value);setCustomerStart(0)}}/></label><label className="rank-filter"><span>VIP зэрэг</span><select aria-label="VIP зэрэглэлээр шүүх" value={rankFilter} onChange={event=>{setRankFilter(event.target.value);setCustomerStart(0)}}><option value="All">Бүх зэрэглэл</option><option value="Unassigned">Зэрэглэлгүй</option>{rankNames.map(rank=><option key={rank} value={rank}>{rank}</option>)}</select></label></div></div>
   <div className="customer-rank-summary">{['All','Unassigned',...rankNames].map(rank=><button key={rank} className={rankFilter===rank?'active':''} onClick={()=>{setRankFilter(rank);setCustomerStart(0)}}>{rank==='All'?'Бүгд':rank==='Unassigned'?'Зэрэглэлгүй':rank}<strong>{rank==='All'?settings?.stats.total_customers||0:customers?.rank_counts?.[rank]||0}</strong></button>)}</div>
   {customerError&&<div className="error-box customer-list-error">{customerError}</div>}
   <div className="admin-customer-table-wrap"><div className="admin-customer-table"><div className="customer-table-head"><span>Хэрэглэгч</span><span>VIP зэрэг</span><span>Тооцоолол</span><span>Дундаж чек</span><span>Ирэлт</span><span>Сүүлд ирсэн</span></div>{customerLoading&&!customers?<div className="customer-list-loading"><RefreshCw className="spin"/>Хэрэглэгчдийн мэдээллийг ачаалж байна…</div>:customers?.customers.length?customers.customers.map(row=><div className="customer-table-row" key={row.name}><span className="customer-identity" data-label="Хэрэглэгч"><strong>{row.customer_name||row.customer}</strong><small>{row.phone||'Утасгүй'}</small></span><span className={`customer-rank ${rankClass(row.membership_rank)}`} data-label="VIP зэрэг">{row.membership_rank==='Unassigned'?'Зэрэглэлгүй':row.membership_rank}</span><span className={`rank-mode ${row.manual_rank?'manual':''}`} data-label="Тооцоолол">{row.manual_rank?'Менежер тохируулсан':'Автомат'}</span><strong data-label="Дундаж чек">{moneyFormat.format(row.average_bill||0)}</strong><span data-label="Ирэлт">{numberFormat.format(row.visit_count||0)} удаа</span><span data-label="Сүүлд ирсэн">{dateOnly(row.last_visit)}</span></div>):<div className="customer-list-empty">{customerLoading?'Хайж байна…':'Илэрц олдсонгүй'}</div>}</div></div>
   <div className="customer-pagination"><span>{customers?.total?`${numberFormat.format(customerStart+1)}–${numberFormat.format(Math.min(customerStart+50,customers.total))} / ${numberFormat.format(customers.total)}`:'0 хэрэглэгч'}</span><div><button aria-label="Өмнөх хуудас" onClick={()=>setCustomerStart(Math.max(0,customerStart-50))} disabled={customerStart===0||customerLoading}><ChevronLeft/></button><button aria-label="Дараагийн хуудас" onClick={()=>setCustomerStart(customerStart+50)} disabled={!customers||customerStart+50>=customers.total||customerLoading}><ChevronRight/></button></div></div>
  </section>
 </main></div>
}
