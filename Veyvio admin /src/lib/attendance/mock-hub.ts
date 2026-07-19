import { computeAttendanceScore } from './score'
import type {
  AttendanceBoardRow,
  AttendanceHubData,
  AttendancePersonProfile,
  AttendanceTrends,
  CoverCandidate,
  LeaveRequestRecord,
  ManagerClassification,
  AbsenceReasonCode,
  CalendarDayMark,
} from './types'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function isoToday(hours: number, minutes: number) {
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

const jamesScore = computeAttendanceScore({
  shiftsScheduled: 60,
  shiftsAttended: 59,
  shiftsOnTime: 56,
  unauthorisedAbsences: 0,
  missedClockIns: 1,
  earlyDepartures: 0,
  evidenceCompliancePercent: 100,
})

const sarahScore = computeAttendanceScore({
  shiftsScheduled: 58,
  shiftsAttended: 56,
  shiftsOnTime: 50,
  unauthorisedAbsences: 0,
  missedClockIns: 2,
  earlyDepartures: 1,
  evidenceCompliancePercent: 90,
})

const davidScore = computeAttendanceScore({
  shiftsScheduled: 55,
  shiftsAttended: 52,
  shiftsOnTime: 48,
  unauthorisedAbsences: 1,
  missedClockIns: 3,
  earlyDepartures: 0,
  evidenceCompliancePercent: 70,
})

const michaelScore = computeAttendanceScore({
  shiftsScheduled: 50,
  shiftsAttended: 50,
  shiftsOnTime: 49,
  unauthorisedAbsences: 0,
  missedClockIns: 0,
  earlyDepartures: 0,
  evidenceCompliancePercent: 100,
})

let leaveSeq = 2

const leaveSeed: LeaveRequestRecord[] = [
  {
    id: 'leave-1',
    reference: 'LR-00021',
    personId: 'drv-james',
    personName: 'James Smith',
    personNumber: 'D-1024',
    role: 'driver',
    depotName: 'Streatham',
    leaveType: 'annual_leave',
    status: 'pending',
    startDate: '2026-08-22',
    endDate: '2026-08-29',
    startTime: null,
    endTime: null,
    partialDay: false,
    reason: 'Family holiday booked — notice given in line with policy',
    attachmentLabel: null,
    submittedAt: isoToday(9, 12),
    decidedAt: null,
    decidedBy: null,
    impact: {
      tripsAffected: 6,
      schoolRoutesAffected: 2,
      passengersAffected: 38,
      replacementRequired: true,
      readinessPercent: 72,
      readinessBand: 'medium',
      readinessSummary: 'One specialist SEND route needs reassignment before approval is safe.',
    },
    audit: [
      {
        id: 'la-1',
        at: isoToday(9, 12),
        actorName: 'James Smith',
        action: 'Submitted',
        detail: 'Annual leave 22 Aug – 29 Aug',
      },
    ],
    previousWindow: null,
  },
  {
    id: 'leave-2',
    reference: 'LR-00018',
    personId: 'drv-michael',
    personName: 'Michael Green',
    personNumber: 'D-1088',
    role: 'driver',
    depotName: 'Streatham',
    leaveType: 'annual_leave',
    status: 'approved',
    startDate: todayIso(),
    endDate: todayIso(),
    startTime: '08:00',
    endTime: '17:00',
    partialDay: false,
    reason: 'Approved annual leave',
    attachmentLabel: null,
    submittedAt: '2026-07-01T10:00:00.000Z',
    decidedAt: '2026-07-02T11:30:00.000Z',
    decidedBy: 'Larone Laing',
    impact: {
      tripsAffected: 2,
      schoolRoutesAffected: 0,
      passengersAffected: 6,
      replacementRequired: true,
      readinessPercent: 96,
      readinessBand: 'low',
      readinessSummary: 'Cover already available at Streatham — low operational impact.',
    },
    audit: [
      {
        id: 'la-2a',
        at: '2026-07-01T10:00:00.000Z',
        actorName: 'Michael Green',
        action: 'Submitted',
        detail: 'Annual leave for operational date',
      },
      {
        id: 'la-2b',
        at: '2026-07-02T11:30:00.000Z',
        actorName: 'Larone Laing',
        action: 'Approved',
        detail: 'Cover confirmed — Dial-a-Ride reassigned',
      },
    ],
    previousWindow: null,
  },
]

let leaveStore = [...leaveSeed]

let boardStore: AttendanceBoardRow[] = []

function buildBoard(): AttendanceBoardRow[] {
  if (boardStore.length) return boardStore.map((r) => ({ ...r }))
  boardStore = [
    {
      id: 'att-james',
      personId: 'drv-james',
      personName: 'James Smith',
      role: 'driver',
      roleLabel: 'Driver',
      depotName: 'Streatham',
      scheduledStart: '06:30',
      clockedInAt: isoToday(6, 24),
      status: 'on_time',
      differenceLabel: '6 min early',
      currentDutyLabel: 'School Run 104',
      dutyId: 'duty-104',
      vehicleRegistration: 'BV19 ABC',
      passengersAtRisk: 0,
      schoolRoute: true,
      attendanceScore: jamesScore.score,
      scoreBand: jamesScore.band,
      reportedReason: null,
      managerClassification: null,
    },
    {
      id: 'att-sarah',
      personId: 'drv-sarah',
      personName: 'Sarah Jones',
      role: 'driver',
      roleLabel: 'Driver',
      depotName: 'Croydon',
      scheduledStart: '07:00',
      clockedInAt: isoToday(7, 11),
      status: 'late',
      differenceLabel: '11 min late',
      currentDutyLabel: 'SEND Route 22',
      dutyId: 'duty-22',
      vehicleRegistration: 'KT21 XYZ',
      passengersAtRisk: 8,
      schoolRoute: true,
      attendanceScore: sarahScore.score,
      scoreBand: sarahScore.band,
      reportedReason: 'traffic',
      managerClassification: 'under_review',
    },
    {
      id: 'att-david',
      personId: 'stf-david',
      personName: 'David Brown',
      role: 'yard_manager',
      roleLabel: 'Yard Manager',
      depotName: 'Brent',
      scheduledStart: '06:00',
      clockedInAt: null,
      status: 'not_arrived',
      differenceLabel: 'Not arrived',
      currentDutyLabel: 'Yard opening',
      dutyId: null,
      vehicleRegistration: null,
      passengersAtRisk: 0,
      schoolRoute: false,
      attendanceScore: davidScore.score,
      scoreBand: davidScore.band,
      reportedReason: null,
      managerClassification: null,
    },
    {
      id: 'att-michael',
      personId: 'drv-michael',
      personName: 'Michael Green',
      role: 'driver',
      roleLabel: 'Driver',
      depotName: 'Streatham',
      scheduledStart: '08:00',
      clockedInAt: null,
      status: 'approved_leave',
      differenceLabel: null,
      currentDutyLabel: null,
      dutyId: null,
      vehicleRegistration: null,
      passengersAtRisk: 0,
      schoolRoute: false,
      attendanceScore: michaelScore.score,
      scoreBand: michaelScore.band,
      reportedReason: null,
      managerClassification: 'authorised',
    },
    {
      id: 'att-karen',
      personId: 'drv-karen',
      personName: 'Karen Lewis',
      role: 'driver',
      roleLabel: 'Driver',
      depotName: 'Streatham',
      scheduledStart: null,
      clockedInAt: null,
      status: 'sick',
      differenceLabel: null,
      currentDutyLabel: null,
      dutyId: null,
      vehicleRegistration: null,
      passengersAtRisk: 0,
      schoolRoute: false,
      attendanceScore: 84,
      scoreBand: 'needs_attention',
      reportedReason: 'illness',
      managerClassification: 'authorised',
    },
  ]
  return boardStore.map((r) => ({ ...r }))
}

function buildCalendar(pattern: CalendarDayMark[]): AttendancePersonProfile['calendarMonth'] {
  const year = 2026
  const month = 7
  const days: AttendancePersonProfile['calendarMonth']['days'] = []
  for (let d = 1; d <= 31; d += 1) {
    const date = `2026-07-${String(d).padStart(2, '0')}`
    const dow = new Date(date + 'T12:00:00').getDay()
    if (dow === 0 || dow === 6) {
      days.push({ date, mark: 'rest' })
    } else {
      days.push({ date, mark: pattern[(d - 1) % pattern.length] ?? 'on_time' })
    }
  }
  return { year, month, days }
}

const trends: AttendanceTrends = {
  punctualityByDepot: [
    { depot: 'Streatham', percent: 94 },
    { depot: 'Croydon', percent: 88 },
    { depot: 'Brent', percent: 81 },
  ],
  minutesLostToLateness: 142,
  unauthorisedAbsences: 3,
  sicknessFrequency: 7,
  returnToWorkOutstanding: 2,
  operationalDelaysFromAttendance: 4,
  standbyOvertimeCostEstimate: '£480 (est.)',
  strongestTeam: 'Streatham school contracts',
  mondayFridayPatternNote:
    'Two drivers show repeated Friday late arrivals in the last 90 days — for manager review, not automatic misconduct.',
  scoreChangesNote: 'Three scores moved into Needs attention this period; none below 50.',
}

function profileFor(
  personId: string,
  personName: string,
  extras: Partial<AttendancePersonProfile> & {
    score: ReturnType<typeof computeAttendanceScore>
    pattern: CalendarDayMark[]
  },
): AttendancePersonProfile {
  const board = buildBoard()
  const live = board.find((b) => b.personId === personId) ?? null
  return {
    personId,
    personName,
    personNumber: extras.personNumber ?? '—',
    roleLabel: extras.roleLabel ?? 'Driver',
    depotName: extras.depotName ?? '—',
    score: extras.score,
    onTimeShiftsPercent: extras.onTimeShiftsPercent ?? Math.round(extras.score.punctualityRate),
    attendanceRatePercent: extras.attendanceRatePercent ?? Math.round(extras.score.attendanceRate),
    lateArrivals: extras.lateArrivals ?? 0,
    unauthorisedAbsences: extras.unauthorisedAbsences ?? extras.score.unauthorisedAbsences,
    approvedSickness: extras.approvedSickness ?? 0,
    earlyDepartures: extras.earlyDepartures ?? extras.score.earlyDepartures,
    averageLatenessMinutes: extras.averageLatenessMinutes ?? 0,
    totalMinutesLate: extras.totalMinutesLate ?? 0,
    currentAbsence: extras.currentAbsence ?? null,
    upcomingLeave: leaveStore.filter(
      (r) =>
        r.personId === personId &&
        (r.status === 'pending' || r.status === 'approved' || r.status === 'moved') &&
        r.endDate >= todayIso(),
    ),
    calendarMonth: buildCalendar(extras.pattern),
    recentEvents: extras.recentEvents ?? [],
    returnToWork: extras.returnToWork ?? [],
    managerNotes: extras.managerNotes ?? [],
    adjustments: extras.adjustments ?? [],
    scoreContributors: extras.scoreContributors ?? [],
    liveStatus: live?.status ?? null,
  }
}

const profiles: Record<string, AttendancePersonProfile> = {
  'drv-james': profileFor('drv-james', 'James Smith', {
    score: jamesScore,
    personNumber: 'D-1024',
    depotName: 'Streatham',
    lateArrivals: 2,
    approvedSickness: 1,
    averageLatenessMinutes: 4,
    totalMinutesLate: 28,
    pattern: ['on_time', 'on_time', 'late', 'on_time', 'on_time'],
    recentEvents: [
      { id: 'e1', at: isoToday(6, 30), label: 'Shift scheduled', kind: 'schedule' },
      { id: 'e2', at: isoToday(6, 24), label: 'Driver clocked in', kind: 'clock' },
      { id: 'e3', at: isoToday(6, 28), label: 'Vehicle check started', kind: 'vehicle' },
      { id: 'e4', at: isoToday(6, 40), label: 'Trip departed — School Run 104', kind: 'trip' },
    ],
    scoreContributors: [
      {
        id: 'sc1',
        date: '2026-07-08',
        label: 'Late arrival (6 min) — traffic',
        impact: -2,
        category: 'Punctuality',
      },
      {
        id: 'sc2',
        date: '2026-06-12',
        label: 'Missed clock-in — later corrected',
        impact: -1,
        category: 'Missed clock-ins',
      },
      {
        id: 'sc3',
        date: '2026-05-20',
        label: 'Approved sickness — excluded from score',
        impact: 0,
        category: 'Sickness (display only)',
      },
    ],
    managerNotes: [
      {
        id: 'n1',
        at: '2026-06-12T14:00:00.000Z',
        author: 'Larone Laing',
        note: 'Clock-in miss was a phone battery issue — recording error, not lateness.',
      },
    ],
    adjustments: [
      {
        id: 'adj1',
        at: '2026-06-12T14:05:00.000Z',
        actor: 'Larone Laing',
        original: 'Unauthorised absence',
        corrected: 'On time (recording error)',
        reason: 'Phone failure — geofence and vehicle check confirmed presence',
      },
    ],
    returnToWork: [],
  }),
  'drv-sarah': profileFor('drv-sarah', 'Sarah Jones', {
    score: sarahScore,
    personNumber: 'D-1055',
    depotName: 'Croydon',
    lateArrivals: 6,
    approvedSickness: 0,
    earlyDepartures: 1,
    averageLatenessMinutes: 9,
    totalMinutesLate: 86,
    pattern: ['on_time', 'late', 'on_time', 'late', 'on_time'],
    recentEvents: [
      { id: 's1', at: isoToday(7, 0), label: 'Shift due to begin', kind: 'schedule' },
      { id: 's2', at: isoToday(7, 6), label: 'Marked late (grace ended)', kind: 'status' },
      { id: 's3', at: isoToday(7, 10), label: 'Driver reminder sent', kind: 'system' },
      {
        id: 's4',
        at: isoToday(7, 11),
        label: 'Driver reported traffic disruption',
        kind: 'report',
      },
      { id: 's5', at: isoToday(7, 11), label: 'Driver clocked in', kind: 'clock' },
      { id: 's6', at: isoToday(7, 13), label: 'Vehicle check started', kind: 'vehicle' },
    ],
    scoreContributors: [
      {
        id: 'ss1',
        date: todayIso(),
        label: 'Late 11 min — traffic (under review)',
        impact: -3,
        category: 'Punctuality',
      },
      {
        id: 'ss2',
        date: '2026-07-11',
        label: 'Late 14 min — Monday pattern',
        impact: -3,
        category: 'Punctuality',
      },
      {
        id: 'ss3',
        date: '2026-06-28',
        label: 'Early departure 12 min',
        impact: -2,
        category: 'Early departure',
      },
    ],
    managerNotes: [],
    adjustments: [],
    returnToWork: [],
  }),
  'stf-david': profileFor('stf-david', 'David Brown', {
    score: davidScore,
    personNumber: 'S-2201',
    roleLabel: 'Yard Manager',
    depotName: 'Brent',
    lateArrivals: 4,
    unauthorisedAbsences: 1,
    approvedSickness: 2,
    averageLatenessMinutes: 12,
    totalMinutesLate: 64,
    currentAbsence: 'Not arrived for yard opening',
    pattern: ['on_time', 'on_time', 'sick', 'sick', 'on_time'],
    recentEvents: [
      { id: 'd1', at: isoToday(6, 0), label: 'Shift scheduled — yard opening', kind: 'schedule' },
      { id: 'd2', at: isoToday(6, 6), label: 'Marked late', kind: 'status' },
      { id: 'd3', at: isoToday(6, 15), label: 'Dispatcher warning — not arrived', kind: 'system' },
    ],
    scoreContributors: [
      {
        id: 'ds1',
        date: '2026-07-02',
        label: 'Unauthorised absence',
        impact: -8,
        category: 'Unauthorised absence',
      },
    ],
    returnToWork: [
      {
        id: 'rtw1',
        date: '2026-07-10',
        summary: 'Return-to-work after 2 sick days — interview outstanding',
        completed: false,
      },
    ],
    managerNotes: [],
    adjustments: [],
  }),
  'drv-michael': profileFor('drv-michael', 'Michael Green', {
    score: michaelScore,
    personNumber: 'D-1088',
    depotName: 'Streatham',
    lateArrivals: 1,
    currentAbsence: 'Approved annual leave today',
    pattern: ['on_time', 'on_time', 'on_time', 'approved_leave', 'on_time'],
    recentEvents: [
      {
        id: 'm1',
        at: isoToday(8, 0),
        label: 'Approved annual leave — not available for assignment',
        kind: 'manager',
      },
    ],
    scoreContributors: [
      {
        id: 'ms1',
        date: todayIso(),
        label: 'Approved annual leave — excluded from score',
        impact: 0,
        category: 'Authorised leave',
      },
    ],
    managerNotes: [],
    adjustments: [],
    returnToWork: [],
  }),
  'drv-karen': profileFor('drv-karen', 'Karen Lewis', {
    score: computeAttendanceScore({
      shiftsScheduled: 52,
      shiftsAttended: 49,
      shiftsOnTime: 46,
      unauthorisedAbsences: 0,
      missedClockIns: 1,
      earlyDepartures: 0,
      evidenceCompliancePercent: 95,
    }),
    personNumber: 'D-1099',
    depotName: 'Streatham',
    lateArrivals: 3,
    approvedSickness: 3,
    currentAbsence: 'Certified sickness',
    pattern: ['on_time', 'sick', 'sick', 'on_time', 'on_time'],
    recentEvents: [
      {
        id: 'k1',
        at: isoToday(8, 0),
        label: 'Sick leave recorded — authorised',
        kind: 'manager',
      },
    ],
    scoreContributors: [
      {
        id: 'ks1',
        date: todayIso(),
        label: 'Approved sickness — displayed separately, not scored as lateness',
        impact: 0,
        category: 'Sickness (display only)',
      },
    ],
    returnToWork: [
      {
        id: 'rtw-k',
        date: todayIso(),
        summary: 'RTW interview due on return',
        completed: false,
      },
    ],
    managerNotes: [],
    adjustments: [],
  }),
}

/** Name aliases so live driver/staff profiles can resolve mock attendance. */
const nameAliases: Record<string, string> = {
  'james smith': 'drv-james',
  'sarah jones': 'drv-sarah',
  'david brown': 'stf-david',
  'michael green': 'drv-michael',
  'karen lewis': 'drv-karen',
}

export const mockAttendanceApi = {
  getHub(): AttendanceHubData {
    const board = buildBoard()
    const scheduled = board.filter((b) => b.status !== 'not_scheduled').length
    const onTime = board.filter((b) => b.status === 'on_time').length
    const late = board.filter((b) => b.status === 'late').length
    const notArrived = board.filter((b) => b.status === 'not_arrived').length
    const approvedLeave = board.filter((b) => b.status === 'approved_leave').length
    const sick = board.filter((b) => b.status === 'sick').length
    const present = onTime + late
    const expected = scheduled - approvedLeave - sick

    return {
      summary: {
        operationalDate: todayIso(),
        scheduled,
        onTime,
        late,
        notArrived,
        approvedLeave,
        sick,
        attendanceRatePercent:
          expected > 0 ? Math.round((present / expected) * 1000) / 10 : 100,
        uncoveredDuties: notArrived + (approvedLeave > 0 ? 1 : 0),
      },
      board,
      leaveRequests: leaveStore.map((r) => ({ ...r, audit: [...r.audit] })),
      trends: { ...trends, punctualityByDepot: [...trends.punctualityByDepot] },
      graceMinutes: 5,
      lateMarkMinutes: 6,
      driverReminderMinutes: 10,
      dispatcherWarningMinutes: 15,
      operationsEscalationMinutes: 20,
    }
  },

  listLeave() {
    return leaveStore.map((r) => ({ ...r, audit: [...r.audit] }))
  },

  updateLeave(next: LeaveRequestRecord) {
    const idx = leaveStore.findIndex((r) => r.id === next.id)
    if (idx < 0) {
      leaveStore = [...leaveStore, next]
    } else {
      leaveStore = leaveStore.map((r) => (r.id === next.id ? next : r))
    }
    return next
  },

  getPersonProfile(input: {
    personId?: string | null
    personName?: string | null
  }): AttendancePersonProfile | null {
    const byId = input.personId ? profiles[input.personId] : null
    if (byId) {
      return {
        ...byId,
        upcomingLeave: leaveStore.filter(
          (r) =>
            r.personId === byId.personId &&
            (r.status === 'pending' || r.status === 'approved' || r.status === 'moved') &&
            r.endDate >= todayIso(),
        ),
        liveStatus: buildBoard().find((b) => b.personId === byId.personId)?.status ?? null,
      }
    }
    const nameKey = (input.personName ?? '').trim().toLowerCase()
    const aliasId = nameAliases[nameKey]
    if (aliasId && profiles[aliasId]) {
      return mockAttendanceApi.getPersonProfile({ personId: aliasId })
    }
    // Fallback demo profile for any live driver/staff name
    if (nameKey) {
      const score = computeAttendanceScore({
        shiftsScheduled: 40,
        shiftsAttended: 38,
        shiftsOnTime: 35,
        unauthorisedAbsences: 0,
        missedClockIns: 1,
        earlyDepartures: 0,
        evidenceCompliancePercent: 95,
      })
      return profileFor(`name:${nameKey}`, input.personName!.trim(), {
        score,
        personNumber: '—',
        depotName: '—',
        lateArrivals: 3,
        approvedSickness: 0,
        averageLatenessMinutes: 6,
        totalMinutesLate: 40,
        pattern: ['on_time', 'on_time', 'late', 'on_time', 'on_time'],
        recentEvents: [
          {
            id: 'gen1',
            at: isoToday(7, 0),
            label: 'Demo attendance profile — linked by name until live API is available',
            kind: 'system',
          },
        ],
        scoreContributors: [
          {
            id: 'gsc1',
            date: '2026-07-10',
            label: 'Late arrival (8 min)',
            impact: -2,
            category: 'Punctuality',
          },
        ],
        managerNotes: [],
        adjustments: [],
        returnToWork: [],
      })
    }
    return null
  },

  classifyBoardRow(input: {
    rowId: string
    classification: ManagerClassification
    reason?: AbsenceReasonCode | null
    note?: string
    actorName: string
  }) {
    buildBoard()
    boardStore = boardStore.map((r) =>
      r.id === input.rowId
        ? {
            ...r,
            managerClassification: input.classification,
            reportedReason: input.reason ?? r.reportedReason,
          }
        : r,
    )
    const row = boardStore.find((r) => r.id === input.rowId)
    if (row && profiles[row.personId]) {
      const p = profiles[row.personId]!
      p.recentEvents = [
        {
          id: `cls-${Date.now()}`,
          at: new Date().toISOString(),
          label: `Manager classified as ${input.classification.replace(/_/g, ' ')}${input.note ? ` — ${input.note}` : ''}`,
          kind: 'manager',
        },
        ...p.recentEvents,
      ]
    }
    return row ?? null
  },

  listCoverCandidates(_dutyLabel?: string | null): CoverCandidate[] {
    return [
      {
        personId: 'drv-andre',
        personName: 'Andre Thomas',
        availabilityLabel: 'Available in 12 minutes',
        statusLabel: 'Available soon',
        requirementsMet: true,
        routeFamiliarity: 'medium',
        training: ['MIDAS', 'Enhanced DBS', 'Wheelchair'],
        selectable: true,
      },
      {
        personId: 'drv-standby',
        personName: 'Priya Shah',
        availabilityLabel: 'Available now · On site',
        statusLabel: 'Available',
        requirementsMet: true,
        routeFamiliarity: 'high',
        training: ['MIDAS', 'Enhanced DBS', 'Wheelchair', 'SEND'],
        selectable: true,
      },
      {
        personId: 'drv-karen',
        personName: 'Karen Lewis',
        availabilityLabel: 'On certified sickness',
        statusLabel: 'Sick',
        requirementsMet: true,
        routeFamiliarity: 'high',
        training: ['MIDAS', 'SEND'],
        selectable: false,
        blockReason: 'Unavailable — approved sickness',
      },
      {
        personId: 'drv-michael',
        personName: 'Michael Green',
        availabilityLabel: 'Approved annual leave',
        statusLabel: 'Approved leave',
        requirementsMet: true,
        routeFamiliarity: 'medium',
        training: ['MIDAS'],
        selectable: false,
        blockReason: 'Unavailable — approved leave',
      },
    ]
  },

  assignCover(input: {
    originalPersonName: string
    coverPersonId: string
    coverPersonName: string
    dutyLabel: string
    actorName: string
    overrideReason?: string
  }) {
    buildBoard()
    boardStore = boardStore.map((r) => {
      if (r.personName === input.originalPersonName) {
        return {
          ...r,
          status: 'late' as const,
          currentDutyLabel: `${r.currentDutyLabel ?? input.dutyLabel} (removed — cover assigned)`,
          dutyId: null,
        }
      }
      return r
    })
    const coverRow = boardStore.find((r) => r.personId === input.coverPersonId)
    if (!coverRow) {
      boardStore = [
        ...boardStore,
        {
          id: `att-cover-${input.coverPersonId}`,
          personId: input.coverPersonId,
          personName: input.coverPersonName,
          role: 'driver',
          roleLabel: 'Driver',
          depotName: 'Streatham',
          scheduledStart: null,
          clockedInAt: new Date().toISOString(),
          status: 'cover_assigned',
          differenceLabel: null,
          currentDutyLabel: input.dutyLabel,
          dutyId: 'duty-cover',
          vehicleRegistration: null,
          passengersAtRisk: 0,
          schoolRoute: true,
          attendanceScore: 90,
          scoreBand: 'good',
          reportedReason: null,
          managerClassification: null,
        },
      ]
    } else {
      boardStore = boardStore.map((r) =>
        r.personId === input.coverPersonId
          ? {
              ...r,
              status: 'cover_assigned' as const,
              currentDutyLabel: input.dutyLabel,
              clockedInAt: r.clockedInAt ?? new Date().toISOString(),
            }
          : r,
      )
    }
    return {
      ok: true as const,
      message: `${input.coverPersonName} assigned to ${input.dutyLabel}${
        input.overrideReason ? ` (override: ${input.overrideReason})` : ''
      } · Schedule, Driver App and Audit Log updated`,
      actorName: input.actorName,
    }
  },

  createDemoPending() {
    leaveSeq += 1
    const row: LeaveRequestRecord = {
      id: `leave-${leaveSeq}`,
      reference: `LR-${String(leaveSeq).padStart(5, '0')}`,
      personId: 'drv-andre',
      personName: 'Andre Thomas',
      personNumber: 'D-1112',
      role: 'driver',
      depotName: 'Croydon',
      leaveType: 'medical_appointment',
      status: 'pending',
      startDate: '2026-07-28',
      endDate: '2026-07-28',
      startTime: '09:00',
      endTime: '12:00',
      partialDay: true,
      reason: 'Hospital follow-up — letter attached',
      attachmentLabel: 'Hospital letter.pdf',
      submittedAt: new Date().toISOString(),
      decidedAt: null,
      decidedBy: null,
      impact: {
        tripsAffected: 1,
        schoolRoutesAffected: 0,
        passengersAffected: 4,
        replacementRequired: true,
        readinessPercent: 96,
        readinessBand: 'low',
        readinessSummary: 'Partial-day cover available — low impact.',
      },
      audit: [
        {
          id: `la-new-${leaveSeq}`,
          at: new Date().toISOString(),
          actorName: 'Andre Thomas',
          action: 'Submitted',
          detail: 'Medical appointment half-day',
        },
      ],
      previousWindow: null,
    }
    leaveStore = [row, ...leaveStore]
    return row
  },
}
