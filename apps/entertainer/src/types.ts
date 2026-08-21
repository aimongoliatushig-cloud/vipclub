export type Screen =
  | 'dashboard'
  | 'schedule'
  | 'income'
  | 'ranking'
  | 'more'
  | 'attendance'
  | 'reservations'
  | 'loan'
  | 'leave'
  | 'profile'

export type ShiftState = 'not-started' | 'working' | 'completed'

export interface NavItem {
  id: Screen
  label: string
}

