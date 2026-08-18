import type { ManagementSession } from '../../shared/managementAccess'
import managerStyles from '../../styles.css?inline'
import { BrowserManagerBusinessService } from './managerBusinessService'
import { BrowserManagerInsightsService } from './managerInsightsService'
import { BrowserManagerOperationsService } from './managerOperationsService'
import { WeeklySchedulePage } from './WeeklySchedulePage'
import { BrowserWorkforceService } from './workforceService'

const workforceService = new BrowserWorkforceService()
const managerInsightsService = new BrowserManagerInsightsService()
const managerOperationsService = new BrowserManagerOperationsService()
const managerBusinessService = new BrowserManagerBusinessService()

export interface ManagerApplicationProps {
  session: ManagementSession
  onSignOut(): void
}

export default function ManagerApplication({ session, onSignOut }: ManagerApplicationProps) {
  return <><style>{managerStyles}</style><WeeklySchedulePage
    service={workforceService}
    insightsService={managerInsightsService}
    operationsService={managerOperationsService}
    businessService={managerBusinessService}
    session={session}
    onSignOut={onSignOut}
  /></>
}
