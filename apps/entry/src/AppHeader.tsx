import {useEffect,useState,type ReactNode} from 'react'
import {Building2,ChevronDown,Download,LogOut,ShieldCheck,User,X} from 'lucide-react'
import type {AppContext} from './api'
import {ThemeToggle} from './ThemeToggle'

const roleLabels:Record<AppContext['mode'],string>={
 guard:'Хамгаалагч',
 manager:'Менежер',
 operation:'Оператор',
 admin:'Админ',
}

export function Brand(){return <div className="brand brand-logo" role="img" aria-label="NOMAD" style={{backgroundImage:`url("${new URL('nomad-logo-transparent.png',document.baseURI)}")`}}/>}

type InstallPromptEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>}
function PwaInstallButton(){
 const [prompt,setPrompt]=useState<InstallPromptEvent|null>(null)
 useEffect(()=>{const handler=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPromptEvent)};window.addEventListener('beforeinstallprompt',handler);return()=>window.removeEventListener('beforeinstallprompt',handler)},[])
 if(!prompt)return null
 const install=async()=>{await prompt.prompt();await prompt.userChoice;setPrompt(null)}
 return <button className="header-action" onClick={install}><Download/> Апп суулгах</button>
}

function HeaderProfile({ctx,onLogout}:{ctx:AppContext;onLogout:()=>void}){
 const [open,setOpen]=useState(false)
 const role=roleLabels[ctx.mode]
 useEffect(()=>{
  if(!open)return
  const close=(event:KeyboardEvent)=>event.key==='Escape'&&setOpen(false)
  window.addEventListener('keydown',close)
  return()=>window.removeEventListener('keydown',close)
 },[open])
 return <div className={`profile-menu ${open?'open':''}`}>
  <button className="profile-trigger" onClick={()=>setOpen(current=>!current)} aria-expanded={open} aria-haspopup="dialog" aria-label={`${role} профайл`}>
   <span className="profile-trigger-icon"><User/></span><span className="profile-trigger-copy"><small>Эрх</small><strong>{role}</strong></span><ChevronDown className="profile-chevron"/>
  </button>
  {open?<><button className="profile-dismiss" onClick={()=>setOpen(false)} aria-label="Профайл хаах"/><section className="profile-card" role="dialog" aria-label="Хэрэглэгчийн профайл">
   <div className="profile-card-head"><div className="profile-avatar"><User/></div><div><small>Нэвтэрсэн хэрэглэгч</small><h2>{ctx.full_name}</h2><span><ShieldCheck/>{role}</span></div><button className="profile-close" onClick={()=>setOpen(false)} aria-label="Профайл хаах"><X/></button></div>
   <div className="profile-details"><div><Building2/><span>Салбар<strong>{ctx.branch}</strong></span></div><div><User/><span>Хэрэглэгч<strong>{ctx.full_name}</strong></span></div></div>
   <div className="profile-theme-setting"><span><strong>Харагдах горим</strong><small>Анхны тохиргоо Light байна</small></span><ThemeToggle/></div>
   <button className="profile-logout" onClick={onLogout}><LogOut/> Системээс гарах</button>
  </section></>:null}
 </div>
}

export function Header({ctx,onLogout,title,actions}:{ctx:AppContext;onLogout:()=>void;title:string;actions?:ReactNode}){
 return <header><Brand/><h1>{title}</h1><div className="header-user">{actions}<PwaInstallButton/><HeaderProfile ctx={ctx} onLogout={onLogout}/></div></header>
}
