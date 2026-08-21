import {useEffect,useState} from 'react'
import {CheckCircle2,Crosshair,MapPin,Printer,QrCode,RefreshCw,ShieldAlert} from 'lucide-react'
import {QRCodeSVG} from 'qrcode.react'
import {api,type BranchAttendanceQR} from './api'

type PositionEvidence={latitude:number;longitude:number}

function currentPosition():Promise<PositionEvidence>{
 return new Promise((resolve,reject)=>{
  if(!navigator.geolocation){reject(new Error('Энэ төхөөрөмж байршил тодорхойлох боломжгүй байна.'));return}
  navigator.geolocation.getCurrentPosition(
   ({coords})=>resolve({latitude:coords.latitude,longitude:coords.longitude}),
   error=>reject(new Error(error.code===1?'Байршлын зөвшөөрөл хэрэгтэй. Хөтчийн тохиргооноос байршлын эрхийг зөвшөөрнө үү.':'Байршил тогтоож чадсангүй. GPS-ээ асаагаад дахин оролдоно уу.')),
   {enableHighAccuracy:true,timeout:15000,maximumAge:0},
  )
 })
}

export function AdminAttendanceQR({branch}:{branch:string}){
 const [data,setData]=useState<BranchAttendanceQR|null>(null)
 const [radius,setRadius]=useState(100)
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 const [success,setSuccess]=useState('')
 const [printMode,setPrintMode]=useState<'attendance'|'entry'>('attendance')
 const entryQrAvailable=Boolean(data?.entry_qr_payload&&data.entry_qr_payload!=='undefined')

 useEffect(()=>{
  let active=true
  setLoading(true);setError('');setSuccess('');setData(null)
  api.branchAttendanceQR(branch).then(result=>{if(active){setData(result);setRadius(result.radius_meters||100)}})
   .catch(err=>{if(active)setError(err instanceof Error?err.message:'QR тохиргоо ачаалж чадсангүй')})
   .finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[branch])

 const configure=async()=>{
  setSaving(true);setError('');setSuccess('')
  try{
   const position=await currentPosition()
   const result=await api.configureBranchLocation(branch,position.latitude,position.longitude,radius)
   setData(result);setSuccess(`${branch} салбарын зөвшөөрөгдсөн байршил хадгалагдлаа`)
  }catch(err){setError(err instanceof Error?err.message:'Байршил хадгалах боломжгүй байна')}
  finally{setSaving(false)}
 }

 const printPoster=(mode:'attendance'|'entry')=>{
  setPrintMode(mode)
  window.setTimeout(()=>window.print(),0)
 }

 return <section className="admin-attendance-panel">
  <div className="attendance-admin-title"><div><h2>Салбарын QR ба байршил</h2><p>{branch} салбар · Нэг байршил, хоёр тусдаа зориулалтын QR</p></div><QrCode/></div>
  {error&&<div className="error-box attendance-admin-message"><ShieldAlert/>{error}</div>}
  {success&&<div className="success-box attendance-admin-message"><CheckCircle2/>{success}</div>}
  {loading?<div className="admin-loading attendance-admin-loading"><RefreshCw className="spin"/>QR тохиргоо ачаалж байна…</div>:<div className="attendance-admin-body">
   <div className="attendance-admin-controls">
    <div className="attendance-control-heading"><span>1</span><div><strong>Зөвшөөрөгдсөн байршил</strong><p>Хоёр QR зөвхөн энэ байршлын радиус дотор ажиллана.</p></div></div>
    <div className={`attendance-location-status ${data?.configured?'ready':''}`}><MapPin/><span><small>Зөвшөөрөгдсөн байршил</small><strong>{data?.configured?'Тохируулсан':'Тохируулаагүй'}</strong>{data?.configured?<em>{data.latitude?.toFixed(5)}, {data.longitude?.toFixed(5)}</em>:null}</span></div>
    <label>Зөвшөөрөх радиус<select value={radius} onChange={event=>setRadius(Number(event.target.value))}><option value={50}>50 метр</option><option value={100}>100 метр</option><option value={150}>150 метр</option><option value={200}>200 метр</option></select></label>
    <button className="admin-location-save" onClick={configure} disabled={saving}>{saving?<RefreshCw className="spin"/>:<Crosshair/>}{saving?'Байршил авч байна…':data?.configured?'Энэ байршлаар шинэчлэх':'Энэ байршлыг зөвшөөрөх'}</button>
    <p><ShieldAlert/>Системийн админ тухайн салбар дээр очоод нэг удаа тохируулна. Менежер өөрчлөх эрхгүй.</p>
   </div>
   <div className="attendance-admin-qr-grid">
    <div className={`attendance-admin-qr ${data?.configured?'ready':''}`} id="attendance-qr">
     <header className="attendance-qr-purpose"><span>2</span><div><strong>Ажилтны ирц</strong><small>Бүх ажилтан ирэхдээ цаг бүртгүүлнэ</small></div></header>
     {data?<QRCodeSVG value={data.qr_payload} size={210} level="H" includeMargin bgColor="#ffffff" fgColor="#050505"/>:<RefreshCw className="spin"/>}
     <div><strong>{branch} салбар</strong><p>Ажилтан өөрийн апп-аас QR-ийг уншуулж ирцээ бүртгэнэ.</p></div>
     <button onClick={()=>printPoster('attendance')} disabled={!data?.configured}><Printer/>Ирцийн QR хэвлэх</button>
     {!data?.configured?<span className="attendance-qr-lock"><MapPin/>Эхлээд байршлыг тохируулна уу</span>:null}
    </div>
    <div className={`attendance-admin-qr entry-access-admin-qr ${data?.configured?'ready':''}`} id="entry-qr">
     <header className="attendance-qr-purpose"><span>3</span><div><strong>VIP Entry нэвтрэх эрх</strong><small>Хамгаалагч, оператор, менежерт зориулсан</small></div></header>
     {entryQrAvailable?<QRCodeSVG value={data!.entry_qr_payload} size={210} level="H" includeMargin bgColor="#ffffff" fgColor="#050505"/>:<div className="attendance-qr-unavailable"><ShieldAlert/><strong>VIP Entry QR үүсээгүй байна</strong><span>Дахин ачаалаад шалгана уу.</span></div>}
     <div><strong>{branch} салбар</strong><p>Үүдний ажилтан энэ QR-ээр тухайн салбарт ажиллах эрхээ батална.</p></div>
     <button onClick={()=>printPoster('entry')} disabled={!data?.configured||!entryQrAvailable}><Printer/>VIP Entry QR хэвлэх</button>
     {!data?.configured?<span className="attendance-qr-lock"><MapPin/>Эхлээд байршлыг тохируулна уу</span>:null}
    </div>
   </div>
   {data?.configured?<article className={`attendance-print-sheet ${printMode==='attendance'?'print-active':''}`} aria-hidden="true">
    <img src="/vip-entry/nomad-logo-transparent.png" alt=""/>
    <p className="print-eyebrow">АЖИЛТНЫ ИРЦ БҮРТГЭЛ</p>
    <h1>{branch}</h1>
    <QRCodeSVG value={data.qr_payload} size={420} level="H" includeMargin bgColor="#ffffff" fgColor="#111111"/>
    <h2>QR кодоо уншуулна уу</h2>
    <ol><li>Ажилтны апп руу нэвтэрнэ</li><li>“Ирц бүртгэх” дээр дарна</li><li>QR уншуулаад байршлаа баталгаажуулна</li></ol>
    <footer><strong>Тогтмол QR</strong><span>Өдөр бүр солих эсвэл дахин хэвлэх шаардлагагүй</span></footer>
   </article>:null}
   {data?.configured&&entryQrAvailable?<article className={`attendance-print-sheet entry-access-print-sheet ${printMode==='entry'?'print-active':''}`} aria-hidden="true">
    <img src="/vip-entry/nomad-logo-transparent.png" alt=""/>
    <p className="print-eyebrow">VIP ENTRY · САЛБАРЫН НЭВТРЭЛТ</p>
    <h1>{branch}</h1>
    <QRCodeSVG value={data.entry_qr_payload} size={420} level="H" includeMargin bgColor="#ffffff" fgColor="#111111"/>
    <h2>Салбарын эрхээ батална уу</h2>
    <ol><li>VIP Entry-д өөрийн эрхээр нэвтэрнэ</li><li>Энэ QR кодыг утасны камераар уншуулна</li><li>Байршлаа зөвшөөрч салбарын дэлгэцээ нээнэ</li></ol>
    <footer><strong>Зөвхөн {branch}</strong><span>Өөр салбар болон салбараас гадуур ажиллахгүй</span></footer>
   </article>:null}
  </div>}
 </section>
}
