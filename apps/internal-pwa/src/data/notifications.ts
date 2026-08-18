import type { AppSnapshot, ExecutiveNotification } from '../domain/types'

const deliveredAt = '2026-08-12T08:20:00+08:00'

const localizeNotificationText = (value: string) => value
  .replace('High-value харилцагчийн outreach төлөвлөгөө', 'Өндөр үнэ цэнтэй харилцагчтай холбоо тогтоох төлөвлөгөө')
  .replace('High-value харилцагчийн эргэн ирэлт буурсан', 'Өндөр үнэ цэнтэй харилцагчийн эргэн ирэлт буурсан')

export function createExecutiveNotifications(snapshot: AppSnapshot): ExecutiveNotification[] {
  const membership = snapshot.approvals.find((item) => item.id === 'apr-membership')
  const plan = snapshot.approvals.find((item) => item.id === 'apr-plan')
  const settlement = snapshot.approvals.find((item) => item.id === 'apr-settlement')
  const currentSettlement = snapshot.settlements[0]
  const overdueTask = snapshot.tasks.find((item) => item.status === 'overdue')
  const sensitiveThread = snapshot.threads.find((item) => item.kind === 'sensitive')
  const hermes = snapshot.recommendations.find((item) => item.id === 'hermes-1')

  const candidates: Array<ExecutiveNotification | null> = [
    membership ? {
      id: `notification-${membership.id}`,
      kind: 'approval',
      title: membership.title,
      description: `${membership.subject} · ${membership.ageMinutes} минут хүлээгдэж байна`,
      target: `/approvals?selected=${membership.id}`,
      deliveredAt,
      urgency: membership.urgency,
      branchId: membership.branchId,
    } : null,
    plan ? {
      id: `notification-${plan.id}`,
      kind: 'goal-plan',
      title: 'Менежерийн төлөвлөгөө хяналт хүлээж байна',
      description: `${plan.subject} · CEO зорилттой тулгана`,
      target: `/sales/action-plans?branch=${plan.branchId}`,
      deliveredAt: '2026-08-12T08:15:00+08:00',
      urgency: plan.urgency,
      branchId: plan.branchId,
    } : null,
    settlement ? {
      id: `notification-${settlement.id}`,
      kind: 'settlement',
      title: 'Тооцооны багц эцсийн шийдвэр хүлээж байна',
      description: `${settlement.subject} · Нягтлан хянасан`,
      target: currentSettlement ? `/finance/${currentSettlement.id}` : '/finance',
      deliveredAt: '2026-08-12T08:10:00+08:00',
      urgency: settlement.urgency,
      branchId: settlement.branchId,
    } : null,
    overdueTask ? {
      id: `notification-${overdueTask.id}`,
      kind: 'task',
      title: 'Даалгаврын хугацаа хэтэрсэн',
      description: `${localizeNotificationText(overdueTask.title)} · ${overdueTask.assignee}`,
      target: `/tasks?selected=${overdueTask.id}`,
      deliveredAt: '2026-08-12T07:55:00+08:00',
      urgency: 'critical',
      branchId: overdueTask.branchId,
    } : null,
    sensitiveThread ? {
      id: `notification-${sensitiveThread.id}`,
      kind: 'message',
      title: 'Нууцлалтай эскалаци',
      description: 'Агуулгыг зөвхөн эрхтэй мессежийн төвд нээнэ.',
      target: `/messages?thread=${sensitiveThread.id}`,
      deliveredAt: '2026-08-12T07:42:00+08:00',
      urgency: 'attention',
      branchId: sensitiveThread.branchId,
      sensitive: true,
    } : null,
    {
      id: 'notification-branch-queen-workforce-gap',
      kind: 'escalation',
      title: 'Queen Club · ажиллах хүч дутуу',
      description: 'Branch Health дохионы нотолгоо ба авах арга хэмжээг шалгана.',
      target: '/branches/queen?exception=workforce-gap',
      deliveredAt: '2026-08-12T07:35:00+08:00',
      urgency: 'critical',
      branchId: 'queen',
    },
    hermes ? {
      id: `notification-${hermes.id}`,
      kind: 'hermes',
      title: 'Hermes шинэ зөвлөмж гаргалаа',
      description: `${localizeNotificationText(hermes.title)} · Итгэлцэл ${hermes.confidence}%`,
      target: `/hermes?selected=${hermes.id}`,
      deliveredAt: '2026-08-12T07:30:00+08:00',
      urgency: 'attention',
      branchId: hermes.branchId,
      readAt: '2026-08-12T08:05:00+08:00',
    } : null,
    {
      id: 'notification-withdrawn-membership',
      kind: 'approval',
      title: 'Гишүүнчлэлийн хүсэлт буцаан татагдсан',
      description: 'Зорилтот хүсэлт хүчингүй болсон тул дэлгэрэнгүй нээгдэхгүй.',
      target: '/approvals?selected=apr-withdrawn',
      deliveredAt: '2026-08-12T07:20:00+08:00',
      urgency: 'attention',
      branchId: 'queen',
      targetState: 'withdrawn',
      readAt: '2026-08-12T07:25:00+08:00',
    },
  ]

  return [...new Map(
    candidates.filter((item): item is ExecutiveNotification => item !== null).map((item) => [item.id, item]),
  ).values()]
}
