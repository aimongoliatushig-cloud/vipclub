import { CircleAlert, CircleCheck, CircleDashed, Clock3 } from 'lucide-react'
import type { DataMeta as DataMetaType } from '../../domain/types'
import { dataModeLabel } from '../../utils/format'

export function DataMeta({ meta, detailed = false }: { meta: DataMetaType; detailed?: boolean }) {
  const Icon = !meta.reconciled ? CircleAlert : meta.mode === 'live' ? CircleCheck : meta.mode === 'pending' ? CircleDashed : Clock3
  return (
    <div className="data-meta" data-mode={meta.reconciled ? meta.mode : 'unreconciled'} title={[meta.source, meta.sourceRecord, meta.owner, meta.permission, meta.updatedAt, meta.policyVersion, meta.reconciled ? 'Тулгалт хийгдсэн' : 'Тулгалт дутуу'].filter(Boolean).join(' · ')}>
      <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
      <span>{meta.reconciled ? dataModeLabel[meta.mode] : 'Тулгалт дутуу'}</span>
      {detailed ? <span className="data-meta__detail">· {meta.updatedAt.slice(11, 16)} · {meta.source} · {meta.owner}</span> : null}
    </div>
  )
}
