/**
 * Driver Training Centre course content (lessons + declaration).
 * Keep courseId keys aligned with admin TRAINING_COURSE_META / DRIVER_TRAINING_CATALOG.
 */

function lessonsFor(prefix, titles) {
  return titles.map((title, index) => ({
    id: `${prefix}-${index + 1}`,
    title,
    order: index + 1,
    kind: index === titles.length - 1 ? "declaration_prep" : "content",
    estimatedMinutes: Math.max(3, Math.round(18 / titles.length)),
    body: [
      `This section covers: ${title}.`,
      "Read each point carefully. You must acknowledge that you understand before continuing.",
      "If anything is unclear, speak to your training lead before accepting related duties.",
    ],
    checklist: [
      "I have read this section",
      "I understand how it applies to my driving duties",
    ],
    requiresAcknowledgement: true,
    minSeconds: 8,
  }));
}

const COURSE_LESSONS = {
  company_induction: lessonsFor("induction", [
    "Welcome and company standards",
    "Depot rules and yard safety",
    "Reporting lines and contacts",
    "Professional conduct with passengers",
  ]),
  driver_app: lessonsFor("app", [
    "Signing on and duty status",
    "Messages and notifications",
    "Vehicle checks in the app",
    "Working offline and sync",
  ]),
  daily_vehicle_checks: lessonsFor("checks", [
    "Why walkaround checks matter",
    "Exterior and lights",
    "Interior, doors and equipment",
    "Reporting defects correctly",
  ]),
  health_safety: lessonsFor("hs", [
    "Your health and safety duties",
    "Slips, trips and manual tasks",
    "Fatigue and fitness to drive",
    "Reporting incidents",
  ]),
  emergency_procedures: lessonsFor("emergency", [
    "Breakdown and roadside safety",
    "Collision and incident reporting",
    "Fire and evacuation",
    "Passenger welfare in an emergency",
  ]),
  manual_handling: lessonsFor("mh", [
    "Assess before you lift",
    "Safe lifting technique",
    "Assisting passengers safely",
    "When to stop and get help",
  ]),
  midas_standard: lessonsFor("midas", [
    "MiDAS responsibilities",
    "Passenger boarding and seating",
    "Safe driving with passengers",
    "Emergency stops and evacuation awareness",
  ]),
  safeguarding_adults: lessonsFor("sg-adult", [
    "What safeguarding means",
    "Recognising concerns",
    "Reporting a concern",
    "Transport-specific scenarios",
  ]),
  first_aid_efaw: lessonsFor("first-aid", [
    "Priorities at an incident",
    "Calling for help",
    "Basic first aid for drivers",
    "Aftercare and reporting",
  ]),
  midas_accessible: lessonsFor("midas-a", [
    "Accessible transport duties",
    "Communication with passengers",
    "Securement overview",
    "Lift and ramp awareness",
  ]),
  wheelchair_restraint: lessonsFor("wc", [
    "Wheelchair types and risks",
    "Securement sequence",
    "Passenger restraints",
    "Practical assessment requirements",
  ]),
  lift_ramp_operation: lessonsFor("lift", [
    "Pre-use checks",
    "Safe operation sequence",
    "Passenger positioning",
    "Faults and when not to use",
  ]),
  safeguarding_children: lessonsFor("sg-child", [
    "Safeguarding children on transport",
    "Recognising concerns",
    "Reporting a concern",
    "Handover and authorised collection",
  ]),
  send_autism_awareness: lessonsFor("send", [
    "Understanding SEND passengers",
    "Communication approaches",
    "Routine and sensory needs",
    "Escalation and support",
  ]),
  behaviour_management: lessonsFor("behaviour", [
    "Preventing conflict",
    "De-escalation techniques",
    "When to stop the vehicle safely",
    "Reporting behavioural incidents",
  ]),
  infection_prevention: lessonsFor("ipc", [
    "Hygiene on passenger transport",
    "PPE and cleaning",
    "Exposure incidents",
    "Reporting requirements",
  ]),
  dementia_awareness: lessonsFor("dementia", [
    "Recognising dementia signs",
    "Communication tips",
    "Keeping journeys calm",
    "When to escalate",
  ]),
  driver_cpc: lessonsFor("cpc", [
    "CPC obligations",
    "Periodic training topics",
    "Evidence and card validity",
    "Keeping records up to date",
  ]),
};

const OVERVIEWS = {
  company_induction: {
    learn: "Company standards, yard rules, reporting lines and passenger conduct.",
    why: "Required before active duty so every driver works to the same operating standard.",
    appliesTo: "All drivers",
    passRequirements: "Complete all lessons and confirm the driver declaration.",
    certificate: false,
    validFor: "Until company policy is updated or you are asked to renew.",
  },
  driver_app: {
    learn: "How to use Veyvio Driver for duties, checks, messages and offline work.",
    why: "You need the app to start and complete duties safely.",
    appliesTo: "All drivers",
    passRequirements: "Complete all lessons and confirm the declaration.",
    certificate: false,
    validFor: "Until a newer app training version is assigned.",
  },
  daily_vehicle_checks: {
    learn: "How to complete a thorough walkaround and report defects.",
    why: "Unsafe vehicles must not enter service.",
    appliesTo: "All drivers",
    passRequirements: "Complete lessons and declaration.",
    certificate: false,
    validFor: "12 months",
  },
  safeguarding_adults: {
    learn: "How to recognise and report safeguarding concerns for adults.",
    why: "Required for passenger transport involving vulnerable adults.",
    appliesTo: "All drivers",
    passRequirements: "Complete lessons, declaration, and upload certificate evidence when asked.",
    certificate: true,
    validFor: "36 months",
  },
  safeguarding_children: {
    learn: "Child safeguarding, reporting, and authorised collection on school/SEND work.",
    why: "Missing safeguarding blocks SEND and school assignments.",
    appliesTo: "School / SEND transport",
    passRequirements: "Complete lessons and declaration. Certificate evidence may be required.",
    certificate: true,
    validFor: "36 months",
  },
  wheelchair_restraint: {
    learn: "Correct wheelchair securement and passenger restraint practice.",
    why: "Expired or missing training blocks wheelchair-accessible trips.",
    appliesTo: "Wheelchair passenger work",
    passRequirements: "Theory lessons plus practical sign-off.",
    certificate: true,
    validFor: "36 months",
  },
};

function defaultOverview(courseId, title, requiredFor) {
  return (
    OVERVIEWS[courseId] ?? {
      learn: `Core knowledge for ${title}.`,
      why: "Assigned by your operator to keep you duty-ready.",
      appliesTo: requiredFor || "Assigned drivers",
      passRequirements: "Complete all lessons and the driver declaration.",
      certificate: false,
      validFor: "As set by your operator",
    }
  );
}

/**
 * @param {string} courseId
 * @param {{ title?: string, requiredFor?: string, estimatedMinutes?: number, category?: string }} [meta]
 */
export function getTrainingCourseContent(courseId, meta = {}) {
  const lessons = COURSE_LESSONS[courseId] ?? lessonsFor(courseId || "course", [
    "Introduction",
    "Key procedures",
    "Operational scenarios",
    "Summary",
  ]);
  const title = meta.title ?? courseId.replace(/_/g, " ");
  return {
    courseId,
    title,
    category: meta.category ?? "Compliance",
    estimatedMinutes: meta.estimatedMinutes ?? lessons.reduce((n, l) => n + l.estimatedMinutes, 0),
    overview: defaultOverview(courseId, title, meta.requiredFor),
    lessons,
    declarationText:
      "I confirm that I completed this training myself, understand the guidance, and will follow the required procedure while carrying out my duties.",
  };
}

export function getNextLessonId(courseContent, lessonProgress = {}) {
  for (const lesson of courseContent.lessons) {
    const prog = lessonProgress[lesson.id];
    if (!prog?.completedAt) return lesson.id;
  }
  return null;
}

export function computeProgressPercentage(courseContent, lessonProgress = {}) {
  const total = courseContent.lessons.length || 1;
  const done = courseContent.lessons.filter((l) => lessonProgress[l.id]?.completedAt).length;
  return Math.round((done / total) * 100);
}
