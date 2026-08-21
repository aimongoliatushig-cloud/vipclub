import type { EmployeeAttendanceStatus } from '../../api'

export type AttendanceScanAvailability = Readonly<{
  available: boolean
  state: 'available' | 'complete' | 'closed' | 'no-shift' | 'restricted' | 'loading'
  label: string
  detail: string
}>

export function getAttendanceScanAvailability(
  attendance?: EmployeeAttendanceStatus,
  canScan = true,
): AttendanceScanAvailability {
  if (!canScan) {
    return {
      available: false,
      state: 'restricted',
      label: 'QR ашиглах эрхгүй',
      detail: 'Ирцийн мэдээллээ менежерээс шалгуулна уу.',
    }
  }

  if (!attendance) {
    return {
      available: false,
      state: 'loading',
      label: 'Ирцийн төлөв ачаалж байна',
      detail: 'Түр хүлээгээд дахин оролдоно уу.',
    }
  }

  // Staff attendance is arrival-only. Once IN is recorded, this workday is complete.
  if (attendance.attendance_complete || attendance.checked_in) {
    return {
      available: false,
      state: 'complete',
      label: 'Ирсэн цаг бүртгэгдсэн',
      detail: 'Дахин QR уншуулах шаардлагагүй.',
    }
  }

  if (!attendance.shift) {
    return {
      available: false,
      state: 'no-shift',
      label: 'Өнөөдөр ээлжгүй',
      detail: 'Ээлжтэй өдөр QR идэвхжинэ.',
    }
  }

  if (!attendance.open) {
    return {
      available: false,
      state: 'closed',
      label: 'Ирц бүртгэх цаг болоогүй',
      detail: 'Ээлжийн ирц нээгдэх үед QR идэвхжинэ.',
    }
  }

  return {
    available: true,
    state: 'available',
    label: 'QR уншуулах',
    detail: 'Салбарын QR кодыг уншуулна.',
  }
}
