/**
 * Ridova driver policy library (v2026-01).
 * Template content for UK PHV/PSV operators — replace or extend per organisation.
 */

export const DRIVER_POLICY_CONTENT = {
  driver_handbook: {
    title: "Driver handbook",
    version: "2026-01",
    readMinutes: 8,
    summary: "Core standards for professional driving, conduct, and use of the Veyvio Driver app.",
    sections: [
      {
        heading: "Purpose",
        body: [
          "This handbook sets out how we expect licensed drivers to operate safely, lawfully, and professionally on behalf of your transport operator.",
          "It applies whenever you are on duty, representing the operator, or using operator-branded vehicles.",
        ],
      },
      {
        heading: "Your responsibilities",
        bullets: [
          "Hold a valid UK driving licence and any licence required for the work you carry out (PHV, PSV, CPC as applicable).",
          "Complete daily vehicle checks before going on duty and report defects immediately.",
          "Follow the route, timing, and passenger instructions issued through dispatch unless safety requires a change.",
          "Treat passengers, schools, and colleagues with respect; zero tolerance for harassment or discrimination.",
          "Keep the Veyvio Driver app signed in during duty so dispatch can assign jobs and track compliance.",
          "Do not drive if unfit through fatigue, illness, medication, or alcohol/drugs.",
        ],
      },
      {
        heading: "Uniform, ID, and vehicle presentation",
        bullets: [
          "Display operator ID and any required licence disc or signage as instructed.",
          "Keep the vehicle clean inside and out; no smoking or vaping with passengers on board.",
          "Do not carry unauthorised passengers or use the vehicle for personal errands while on duty.",
        ],
      },
      {
        heading: "Using Veyvio Driver",
        bullets: [
          "Accept jobs only through the app when you are fit, checked-in, and legally permitted to drive.",
          "Use in-app navigation and status updates (arrived, passenger on board, completed) accurately.",
          "Report incidents, defects, and absences through the app without delay.",
        ],
      },
      {
        heading: "Breaches",
        body: [
          "Failure to follow this handbook may result in suspension from dispatch, retraining, or termination of your engagement with the operator, in line with contract and UK transport law.",
        ],
      },
    ],
  },

  safeguarding_policy: {
    title: "Safeguarding policy",
    version: "2026-01",
    readMinutes: 6,
    summary: "Protecting children, young people, and vulnerable passengers.",
    sections: [
      {
        heading: "Our commitment",
        body: [
          "We are committed to safeguarding all passengers, especially children and vulnerable adults on school and care transport.",
        ],
      },
      {
        heading: "What you must do",
        bullets: [
          "Never be alone with a child or vulnerable passenger in circumstances that could be misinterpreted; follow operator seating and escort rules.",
          "Report any concern about a child's welfare, unexplained injury, disclosure of abuse, or inappropriate behaviour immediately to dispatch and record it in the app.",
          "Do not attempt your own investigation; pass information promptly to the designated safeguarding lead.",
          "Complete DBS checks and safeguarding training when required for your role.",
          "Challenge and report peer behaviour that puts passengers at risk.",
        ],
      },
      {
        heading: "Reporting",
        body: [
          "In an emergency, call 999 first. Then notify dispatch. For non-emergency concerns, use the incident flow in Veyvio Driver and your operator's safeguarding contact.",
        ],
      },
    ],
  },

  vehicle_check_policy: {
    title: "Vehicle check policy",
    version: "2026-01",
    readMinutes: 5,
    summary: "Daily walkaround checks before every duty.",
    sections: [
      {
        heading: "When to check",
        body: ["Complete a full walkaround check at the start of each duty, and after any long break where the vehicle was unattended, before carrying passengers."],
      },
      {
        heading: "What to inspect",
        bullets: [
          "Tyres, wheels, and tread depth; lights, indicators, and reflectors.",
          "Mirrors, windscreen, wipers, and washer fluid.",
          "Doors, steps, handrails, and wheelchair equipment if fitted.",
          "Fluid leaks, body damage, and secure load/compartment doors.",
          "Interior cleanliness, seat belts, and fire extinguisher if required.",
        ],
      },
      {
        heading: "If you find a defect",
        bullets: [
          "Do not take the vehicle on duty if the defect is safety-critical.",
          "Log the defect in Veyvio Driver with photos where possible.",
          "Wait for authorisation from dispatch or workshop before continuing.",
        ],
      },
    ],
  },

  defect_policy: {
    title: "Defect reporting policy",
    version: "2026-01",
    readMinutes: 4,
    summary: "How to report and manage vehicle defects.",
    sections: [
      {
        heading: "Report immediately",
        body: ["Any defect that could affect safety, compliance, or passenger comfort must be reported before the next journey."],
      },
      {
        heading: "How to report",
        bullets: [
          "Use Defect Report in Veyvio Driver; include location, description, and photos.",
          "Classify severity honestly — do not minimise serious faults.",
          "If broken down, ensure passengers are safe and follow operator breakdown procedure.",
        ],
      },
      {
        heading: "Follow-up",
        body: [
          "Do not drive a vehicle with an open safety-critical defect unless explicitly authorised in writing for a single transfer to workshop.",
        ],
      },
    ],
  },

  incident_policy: {
    title: "Incident reporting policy",
    version: "2026-01",
    readMinutes: 5,
    summary: "Collisions, near-misses, and passenger incidents.",
    sections: [
      {
        heading: "Report without delay",
        bullets: [
          "Road traffic collisions, however minor.",
          "Near-misses that could have caused injury or damage.",
          "Passenger injury, illness, or behavioural incident on board.",
          "Assault, theft, or criminal damage involving the vehicle or passengers.",
        ],
      },
      {
        heading: "At the scene",
        bullets: [
          "Ensure safety; call 999 if anyone is hurt or the scene is hazardous.",
          "Do not admit liability; exchange details as required by law.",
          "Photograph the scene and note witnesses, time, and location.",
          "Notify dispatch as soon as it is safe to do so.",
        ],
      },
      {
        heading: "After the incident",
        body: ["Complete the incident report in Veyvio Driver within 24 hours. Cooperate with insurance, police, and operator investigations."],
      },
    ],
  },

  passenger_safety_policy: {
    title: "Passenger safety policy",
    version: "2026-01",
    readMinutes: 5,
    summary: "Safe boarding, seating, and journey management.",
    sections: [
      {
        heading: "Boarding and alighting",
        bullets: [
          "Stop only at designated safe points; use hazard lights where appropriate.",
          "Ensure doors are clear before moving; count passengers on school runs if instructed.",
          "Never move off until passengers are seated and, where required, seat belts are fastened.",
        ],
      },
      {
        heading: "Special needs and mobility aids",
        body: [
          "Follow individual care plans and operator training for wheelchair users and passengers with additional needs. Secure wheelchairs and equipment to manufacturer and operator standards.",
        ],
      },
      {
        heading: "Behaviour",
        bullets: [
          "Address low-level disruption calmly; stop safely if behaviour creates a safety risk.",
          "Escalate serious behaviour to dispatch and complete an incident report.",
        ],
      },
    ],
  },

  mobile_phone_policy: {
    title: "Mobile phone policy",
    version: "2026-01",
    readMinutes: 3,
    summary: "Legal and safe use of phones and devices while driving.",
    sections: [
      {
        heading: "While driving",
        bullets: [
          "Do not hold or interact with a phone while the vehicle is moving, except via a fixed hands-free system where legal.",
          "Do not text, scroll apps, or adjust navigation by hand in motion.",
          "Pull over and park safely before handling non-urgent communication.",
        ],
      },
      {
        heading: "Veyvio Driver app",
        body: [
          "Mount the device securely. Use voice or passenger assistant where possible. Accept jobs and update status only when stationary if local policy requires.",
        ],
      },
      {
        heading: "Breaches",
        body: ["Phone offences may be reported to the operator and licensing authority and can result in suspension."],
      },
    ],
  },

  fatigue_policy: {
    title: "Fatigue / fitness to drive policy",
    version: "2026-01",
    readMinutes: 4,
    summary: "Recognising fatigue and declaring fitness to drive.",
    sections: [
      {
        heading: "Fitness to drive",
        bullets: [
          "You must be fit to drive at the start of each duty and throughout your shift.",
          "Declare medical conditions and medication changes that may affect driving to the operator.",
          "Do not drive if you feel drowsy, unwell, or impaired.",
        ],
      },
      {
        heading: "Managing fatigue",
        bullets: [
          "Take statutory breaks and use rest periods away from the wheel.",
          "Avoid extended shifts without approval; report scheduling concerns to dispatch.",
          "Stop in a safe place if you become tired — do not continue.",
        ],
      },
    ],
  },

  data_protection_policy: {
    title: "Data protection policy",
    version: "2026-01",
    readMinutes: 4,
    summary: "Handling passenger and journey data (UK GDPR).",
    sections: [
      {
        heading: "Your role",
        body: [
          "You may see passenger names, addresses, school details, and contact numbers to perform your job. This is personal data and must be protected.",
        ],
      },
      {
        heading: "Rules",
        bullets: [
          "Use passenger data only for the journey in progress; do not copy, share, or discuss it outside work.",
          "Do not photograph passenger lists or screens showing personal data.",
          "Report lost devices or suspected data breaches to dispatch immediately.",
          "Follow operator instructions for returning or deleting data when you leave.",
        ],
      },
    ],
  },

  tachograph_policy: {
    title: "Tachograph / drivers' hours policy",
    version: "2026-01",
    readMinutes: 6,
    summary: "Drivers' hours, records, and tachograph use where applicable.",
    sections: [
      {
        heading: "Scope",
        body: [
          "This applies if you drive vehicles subject to EU/UK drivers' hours rules or operate tachograph-equipped PSV vehicles. Your operator will confirm which rules apply to your duties.",
        ],
      },
      {
        heading: "Your duties",
        bullets: [
          "Understand whether your shift is in scope before starting duty.",
          "Use the tachograph correctly: select mode, insert card, and record other work and rest.",
          "Do not exceed driving time or reduce rest periods below legal limits.",
          "Carry and produce records when requested by enforcement.",
        ],
      },
      {
        heading: "Veyvio and records",
        body: [
          "App duty times supplement but do not replace tachograph or written records where legally required. Report discrepancies to dispatch.",
        ],
      },
    ],
  },
};

export function getDriverPolicyContent(policyKey) {
  return DRIVER_POLICY_CONTENT[policyKey] ?? null;
}

export function listDriverPolicyContentKeys() {
  return Object.keys(DRIVER_POLICY_CONTENT);
}
