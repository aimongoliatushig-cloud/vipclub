import { Award, BadgeCheck, ChevronRight, CircleAlert, Eye, History, ListChecks, LockKeyhole, Target, TrendingUp, UserRound, Users } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DataMeta } from '../components/ui/DataMeta'
import { OverlayPanel } from '../components/ui/OverlayPanel'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Sparkline } from '../components/ui/Sparkline'
import { StatusMark } from '../components/ui/StatusMark'
import type { EmployeePerformance, ManagerPerformance } from '../domain/types'
import { useApp } from '../state/useApp'
import { formatPercent } from '../utils/format'

function ManagerDetail({ manager, onClose }: { manager: ManagerPerformance; onClose(): void }) {
  const navigate = useNavigate()
  const { branches, tasks } = useApp()
  const branch = branches.find((item) => item.id === manager.branchId)
  const managerTasks = tasks.filter((item) => item.assignee === manager.name || item.branchId === manager.branchId)
  return <OverlayPanel open title={manager.name} description={`${branch?.name} · тайлбарлагдах management view`} onClose={onClose} wide>
    <div className="performance-detail__hero"><div><span>Тайлагналын score</span><strong data-tone={manager.score >= 80 ? 'healthy' : manager.score < 70 ? 'critical' : 'attention'}>{manager.score}</strong><small>Compensation болон disciplinary decision биш</small></div><Sparkline values={manager.trend} tone={manager.score >= 80 ? 'success' : 'danger'} width={280} height={84} /></div>
    <section className="detail-section"><header><h3>KPI source evidence</h3><DataMeta meta={manager.meta} /></header><div className="manager-evidence-grid">{manager.metricEvidence.map((metric) => <article key={metric.id}><header><span>{metric.label}</span><strong>{metric.value}{metric.unit === '%' ? '%' : ''}</strong></header><ProgressBar value={Math.max(0, Math.min(100, metric.value))} tone={metric.value >= 85 ? 'success' : metric.value < 70 ? 'danger' : 'gold'} label={metric.label} /><dl><div><dt>Source</dt><dd>{metric.sourceRecord}</dd></div><div><dt>Updated</dt><dd>{metric.updatedAt}</dd></div></dl><StatusMark tone={metric.policyState === 'approved' ? 'healthy' : 'attention'} label={metric.policyState === 'approved' ? 'Approved metric' : 'Weight pending'} /></article>)}</div></section>
    <section className="detail-section"><header><h3>Task, acknowledgement, exception, history</h3><button className="text-button" type="button" onClick={() => navigate(`/tasks?branch=${manager.branchId}`)}>Task бүгдийг харах <ChevronRight size={16} /></button></header><div className="performance-event-list">{manager.events.map((event) => <article key={event.id}><span data-type={event.type}><History size={15} /></span><div><strong>{event.title}</strong><small>{event.type} · {event.at}</small><p>{event.sourceRecord}</p></div><StatusMark tone={event.status === 'Overdue' || event.status.includes('хүлээгдэж') ? 'critical' : 'neutral'} label={event.status} /></article>)}</div>{managerTasks.length ? <div className="compact-list">{managerTasks.slice(0,3).map((task) => <button key={task.id} type="button" onClick={() => navigate(`/tasks?selected=${task.id}`)}><span><strong>{task.title}</strong><small>{task.status} · {task.dueAt.slice(0,10)}</small></span><ChevronRight size={17} /></button>)}</div> : null}</section>
    <div className="callout callout--warning"><CircleAlert size={18} /><p>GitHub KPI dictionary болон role matrix draft хэвээр. Composite weight, compensation, ranking, сахилгын шийдвэр автоматаар гаргахыг хориглосон; CEO эх record бүрийг тусад нь хянана.</p></div>
  </OverlayPanel>
}

function EmployeeDetail({ employee, onClose }: { employee: EmployeePerformance; onClose(): void }) {
  const { branches } = useApp()
  const branch = branches.find((item) => item.id === employee.branchId)
  return <OverlayPanel open title={employee.displayName} description={`${employee.maskedEmployeeCode} · ${employee.role} · ${branch?.name}`} onClose={onClose} wide>
    <div className="employee-privacy-banner"><LockKeyhole size={21} /><div><strong>Approved aggregate fields only</strong><p>Хувийн утас, хаяг, банк, гэрээ, цалин болон raw attendance event хаалттай. Энэ drill-down хандалт audit-д бүртгэгдсэн.</p></div><StatusMark tone="healthy" label="Sensitive masked" /></div>
    <section className="employee-summary-grid"><article><span>Employment state</span><strong>{employee.employmentState}</strong></article><article><span>Attendance aggregate</span><strong>{employee.attendanceRate}%</strong></article><article><span>Task completion</span><strong>{employee.taskCompletion}%</strong></article><article><span>Acknowledgement</span><strong>{employee.acknowledgementRate}%</strong></article><article><span>Open exception</span><strong data-tone={employee.openExceptions ? 'critical' : 'healthy'}>{employee.openExceptions}</strong></article></section>
    <section className="detail-section"><header><h3>Зөвшөөрсөн field set</h3><DataMeta meta={employee.meta} /></header><div className="approved-field-list">{employee.approvedFields.map((field) => <span key={field}><BadgeCheck size={14} />{field}</span>)}</div></section>
    <section className="detail-section"><header><h3>Performance history</h3><StatusMark tone="neutral" label="No automated decision" /></header><div className="performance-event-list">{employee.history.map((event) => <article key={event.id}><span data-type={event.type}><History size={15} /></span><div><strong>{event.title}</strong><small>{event.type} · {event.at}</small><p>{event.sourceRecord}</p></div><StatusMark tone={event.status === 'Open' ? 'attention' : 'neutral'} label={event.status} /></article>)}</div></section>
    <div className="callout"><Eye size={18} /><p>Access reason: Authorized executive performance review · Audit summary: approved aggregate fields only, sensitive fields masked.</p></div>
  </OverlayPanel>
}

export default function PerformancePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { managers, branches, employees, openEmployee, online } = useApp()
  const employeeView = location.pathname.startsWith('/people/employees')
  const managerId = location.pathname.match(/\/people\/managers\/(.+)$/)?.[1]
  const employeeId = location.pathname.match(/\/people\/employees\/(.+)$/)?.[1]
  const selectedManager = managerId ? managers.find((manager) => manager.id === managerId) : undefined
  const selectedEmployee = employeeId ? employees.find((employee) => employee.id === employeeId) : undefined
  const auditedEmployees = useRef(new Set<string>())
  const approvedMetricLabels = useMemo(() => Array.from(new Set(managers.flatMap((manager) => manager.metricEvidence.map((metric) => metric.label)))), [managers])

  useEffect(() => {
    if (!employeeId || !online || auditedEmployees.current.has(employeeId)) return
    auditedEmployees.current.add(employeeId)
    void openEmployee(employeeId).catch(() => undefined)
  }, [employeeId, online, openEmployee])

  const openManager = (manager: ManagerPerformance) => navigate(`/people/managers/${manager.id}`)
  const openEmployeeDetail = (employee: EmployeePerformance) => navigate(`/people/employees/${employee.id}`)

  return (
    <div className="page performance-page">
      <PageHeader title="Гүйцэтгэл" description="Manager outcome, source KPI, task/acknowledgement history ба зөвшөөрсөн employee aggregate." actions={<button className="button button--primary" type="button" onClick={() => navigate('/tasks?create=1&context=Performance review')}><ListChecks size={17} />Review task үүсгэх</button>} />
      <div className="workspace-tabs performance-tabs" role="tablist" aria-label="Гүйцэтгэлийн workspace"><button type="button" role="tab" aria-selected={!employeeView} onClick={() => navigate('/people/managers')}>Менежерүүд</button><button type="button" role="tab" aria-selected={employeeView} onClick={() => navigate('/people/employees')}>Ажилтны aggregate</button></div>

      {!employeeView ? <>
        <div className="performance-policy-banner"><Target size={20} /><div><strong>Explainable reporting · automated discipline хориглосон</strong><p>{approvedMetricLabels.join(' · ')}. Composite weight ба compensation use configuration pending.</p></div><StatusMark tone="attention" label="Weights pending" /></div>
        <section className="performance-ranking workbench-section"><header className="section-header"><div><h2>Branch Manager performance</h2><p>Outcome бүр source record-той; score нь шийдвэр биш.</p></div><StatusMark tone="neutral" label="Demo data" /></header><div className="manager-table-wrap"><table className="manager-table"><thead><tr><th>Менежер</th><th>Нийт</th><th>Sales target</th><th>Branch Health</th><th>Customer growth</th><th>Staffing readiness</th><th>Task execution</th><th>Action plan</th><th>Тренд</th><th /></tr></thead><tbody>{managers.map((manager) => { const branch = branches.find((item) => item.id === manager.branchId); return <tr key={manager.id}><td><button type="button" className="person-cell" onClick={() => openManager(manager)}><span>{manager.name.slice(0,1)}</span><span><strong>{manager.name}</strong><small>{branch?.name}</small></span></button></td><td><strong className="manager-score" data-tone={manager.score >= 80 ? 'healthy' : manager.score >= 70 ? 'attention' : 'critical'}>{manager.score}</strong></td><td><strong>{manager.salesAttainment}%</strong><ProgressBar value={manager.salesAttainment} tone={manager.salesAttainment >= 85 ? 'success' : 'danger'} label="Sales target" /></td><td>{manager.healthScore}</td><td><strong data-tone={manager.customerGrowth >= 0 ? 'healthy' : 'critical'}>{formatPercent(manager.customerGrowth)}</strong></td><td>{manager.staffingReadiness}%</td><td>{manager.taskExecution}%</td><td>{manager.actionPlanCompletion}%</td><td><Sparkline values={manager.trend} tone={manager.score >= 80 ? 'success' : manager.score < 70 ? 'danger' : 'gold'} width={118} /></td><td><button className="icon-button" type="button" onClick={() => openManager(manager)} aria-label={`${manager.name} дэлгэрэнгүй`}><ChevronRight size={18} /></button></td></tr> })}</tbody></table></div></section>
        <section className="performance-insights"><article className="workbench-section"><header className="section-header"><div><h2>Гол ахиц</h2><p>Repeatable management practice</p></div><TrendingUp size={19} /></header><div className="insight-list"><div><Award size={20} /><span><strong>Empire Lounge · action plan execution</strong><small>94% completion · customer growth +12%</small></span></div><div><Target size={20} /><span><strong>Platinum · sales recovery</strong><small>Expected pace variance 6 пунктээр сайжирсан</small></span></div></div></article><article className="workbench-section"><header className="section-header"><div><h2>Executive exception</h2><p>CEO attention · human review required</p></div><CircleAlert size={19} /></header><div className="insight-list insight-list--danger"><button type="button" onClick={() => managers[0] && openManager(managers[0])}><Users size={20} /><span><strong>Queen Club · workforce handling</strong><small>Source exceptions ба acknowledgement-ийг нээж шалгана</small></span><ChevronRight size={17} /></button><button type="button" onClick={() => navigate('/tasks?branch=gobi&status=overdue')}><ListChecks size={20} /><span><strong>Gobi Lounge · overdue directives</strong><small>CEO task queue-ээс нотолгоо шалгана</small></span><ChevronRight size={17} /></button></div></article></section>
      </> : <>
        <div className="employee-scope-banner"><LockKeyhole size={20} /><div><strong>Employee performance · privacy-minimized</strong><p>Зөвхөн approved aggregate ба masked identifier. Detail open бүр audit-д бүртгэгдэнэ.</p></div><StatusMark tone="healthy" label="CEO scoped" /></div>
        <section className="workbench-section employee-performance-list"><header className="section-header"><div><h2>Ажилтны aggregate view</h2><p>Raw attendance, contact, pay, bank болон contract field байхгүй.</p></div><StatusMark tone="neutral" label={`${employees.length} demo record`} /></header>{employees.length ? <div className="employee-table"><div className="employee-table__head"><span>Ажилтан</span><span>Салбар / role</span><span>Attendance</span><span>Task</span><span>Acknowledgement</span><span>Exception</span><span /></div>{employees.map((employee) => <button key={employee.id} type="button" className="employee-table__row" onClick={() => openEmployeeDetail(employee)} aria-label={`${employee.displayName} performance дэлгэрэнгүй`}><span><i>{employee.displayName.slice(0,1)}</i><span><strong>{employee.displayName}</strong><small>{employee.maskedEmployeeCode}</small></span></span><span><strong>{branches.find((branch) => branch.id === employee.branchId)?.name}</strong><small>{employee.role} · {employee.employmentState}</small></span><span>{employee.attendanceRate}%</span><span>{employee.taskCompletion}%</span><span>{employee.acknowledgementRate}%</span><span><StatusMark tone={employee.openExceptions ? 'attention' : 'healthy'} label={String(employee.openExceptions)} /></span><ChevronRight size={18} /></button>)}</div> : <div className="empty-state"><UserRound size={28} /><strong>Authorized employee record алга</strong><p>Branch/role scope-д тохирох aggregate record байхгүй байна.</p></div>}</section>
      </>}

      {selectedManager ? <ManagerDetail manager={selectedManager} onClose={() => navigate('/people/managers')} /> : null}
      {selectedEmployee ? <EmployeeDetail employee={selectedEmployee} onClose={() => navigate('/people/employees')} /> : null}
    </div>
  )
}
