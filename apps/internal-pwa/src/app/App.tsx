import { WeeklySchedulePage } from '../features/workforce/WeeklySchedulePage'
import { BrowserWorkforceService } from '../features/workforce/workforceService'

const workforceService = new BrowserWorkforceService()

export default function App() {
  return <WeeklySchedulePage service={workforceService} />
}
