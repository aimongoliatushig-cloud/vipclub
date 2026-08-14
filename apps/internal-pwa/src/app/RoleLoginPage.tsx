import { ArrowRight, Building2, Crown, ShieldCheck, UserRoundCog } from 'lucide-react'
import type { ManagementSession } from '../shared/managementAccess'
import { demoCeoSession, demoManagerSession } from '../shared/managementAccess'

export function RoleLoginPage({ onSignIn }: { onSignIn: (session: ManagementSession) => void }) {
  return <main className="role-login">
    <section className="role-login-card" aria-labelledby="role-login-title">
      <header><span className="role-login-brand"><Crown size={24} /></span><div><strong>VIP Club</strong><small>Удирдлагын дотоод систем</small></div></header>
      <div className="role-login-copy"><span className="eyebrow">Үүрэгт суурилсан нэвтрэлт</span><h1 id="role-login-title">Турших ажлын орчноо сонгоно уу</h1><p>Хэрэглэгчийн үүргээс шалтгаалан харагдах салбар, цэс болон шийдвэрийн эрх өөр байна.</p></div>
      <div className="role-choice-grid">
        <button type="button" onClick={() => onSignIn(demoCeoSession)}><span><Crown size={22} /></span><div><strong>Гүйцэтгэх захирал</strong><small>Компанийн бүх салбар, борлуулалт, CRM, ажиллах хүч болон эцсийн шийдвэр.</small><b><ShieldCheck size={14} />4 салбарын хүрээ</b></div><ArrowRight size={19} /></button>
        <button type="button" onClick={() => onSignIn(demoManagerSession)}><span><UserRoundCog size={22} /></span><div><strong>Салбарын менежер</strong><small>Өөрийн салбарын зорилго, баг, хуваарь, ирц, харилцагч болон санал.</small><b><Building2 size={14} />Төв салбарын хүрээ</b></div><ArrowRight size={19} /></button>
      </div>
      <footer><ShieldCheck size={16} /><span>Энэ нь туршилтын нэвтрэлт. Бодит орчинд серверийн сесс болон эрхийн шалгалтыг ашиглана.</span></footer>
    </section>
  </main>
}
