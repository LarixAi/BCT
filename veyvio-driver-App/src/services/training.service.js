import { getSupabaseClient } from "@/lib/supabase/client";
import {
  getCommandApiBaseUrl,
  commandListDriverTraining,
  commandUpdateDriverTrainingProgress,
} from "@/lib/command-api";
import {
  getLocalTrainingProgress,
  mergeLessonProgress,
  saveLocalTrainingProgress,
} from "@/lib/training-progress-store";
import {
  computeProgressPercentage,
  getNextLessonId,
  getTrainingCourseContent,
} from "@/lib/training-catalog";

async function accessTokenFromSession(session) {
  if (session?.accessToken || session?.access_token) {
    return session.accessToken ?? session.access_token;
  }
  const supabase = getSupabaseClient();
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();
  return authSession?.access_token ?? null;
}

function enrichAssignment(assignment, driverId) {
  if (!assignment) return null;
  const content = getTrainingCourseContent(assignment.courseId, {
    title: assignment.title,
    requiredFor: assignment.requiredFor,
    estimatedMinutes: assignment.estimatedMinutes,
    category: assignment.category,
  });
  const local = getLocalTrainingProgress(driverId, assignment.id);
  const lessonProgress = mergeLessonProgress(assignment.lessonProgress ?? {}, local.lessonProgress);
  const progressPercentage = Math.max(
    Number(assignment.progressPercentage ?? 0),
    computeProgressPercentage(content, lessonProgress),
    Number(local.progressPercentage ?? 0),
  );
  const nextLessonId = getNextLessonId(content, lessonProgress);
  return {
    ...assignment,
    lessonProgress,
    progressPercentage,
    nextLessonId,
    content,
  };
}

export async function loadDriverTrainingCentre(session) {
  const token = await accessTokenFromSession(session);
  const driverId = session?.driverId ?? session?.driver?.id ?? null;
  if (!token) {
    return {
      ok: false,
      message: "Sign in again to load training.",
      wired: Boolean(getCommandApiBaseUrl()),
    };
  }

  const base = getCommandApiBaseUrl();
  if (!base) {
    return { ok: false, message: "Command API URL is not configured in this app build.", wired: false };
  }

  const result = await commandListDriverTraining(token);
  if (!result.ok) return { ...result, wired: true, driverId };

  const assignments = (result.assignments ?? []).map((a) => enrichAssignment(a, driverId));
  return {
    ok: true,
    wired: true,
    driverId: result.driverId ?? driverId,
    summary: result.summary ?? {
      compliancePercent: 100,
      requiredOpen: 0,
      dueSoon: 0,
      overdue: 0,
      nextDeadline: null,
      statusLabel: "Up to date",
    },
    urgent: result.urgent
      ? enrichAssignment(result.urgent, driverId)
      : assignments.find((a) => a.warningStatus === "overdue") ?? null,
    assignments,
  };
}

/** Lightweight connectivity check for Offline & sync screen. */
export async function probeDriverTrainingConnection(session) {
  const token = await accessTokenFromSession(session);
  const base = getCommandApiBaseUrl();
  if (!base) return { ok: false, message: "Command API URL missing from build", assignmentCount: 0 };
  if (!token) return { ok: false, message: "Not signed in to Command", assignmentCount: 0 };
  const result = await commandListDriverTraining(token);
  if (!result.ok) return { ok: false, message: result.message, assignmentCount: 0 };
  return {
    ok: true,
    message: null,
    driverId: result.driverId ?? session?.driverId ?? null,
    assignmentCount: (result.assignments ?? []).length,
    requiredOpen: result.summary?.requiredOpen ?? 0,
  };
}

export async function startTrainingAssignment(session, assignment) {
  const token = await accessTokenFromSession(session);
  if (!token || !assignment) return { ok: false, message: "Training could not be started." };
  const result = await commandUpdateDriverTrainingProgress(token, {
    action: "start",
    assignmentId: assignment.id,
    courseId: assignment.courseId,
  });
  if (!result.ok) return result;
  return { ok: true, assignment: enrichAssignment(result.assignment, session?.driverId) };
}

export async function completeTrainingLesson(session, assignment, lessonId, extras = {}) {
  const token = await accessTokenFromSession(session);
  const driverId = session?.driverId ?? null;
  if (!assignment || !lessonId) return { ok: false, message: "Lesson could not be saved." };

  const content = assignment.content ?? getTrainingCourseContent(assignment.courseId, assignment);
  const lessonProgress = {
    ...(assignment.lessonProgress ?? {}),
    [lessonId]: {
      ...(assignment.lessonProgress?.[lessonId] ?? {}),
      completedAt: new Date().toISOString(),
      acknowledgedAt: extras.acknowledged
        ? new Date().toISOString()
        : assignment.lessonProgress?.[lessonId]?.acknowledgedAt,
      ...extras.lessonPayload,
    },
  };
  const progressPercentage = computeProgressPercentage(content, lessonProgress);
  saveLocalTrainingProgress(driverId, assignment.id, { lessonProgress, progressPercentage });

  if (!token) {
    return {
      ok: true,
      offline: true,
      assignment: enrichAssignment({ ...assignment, lessonProgress, progressPercentage }, driverId),
    };
  }

  const result = await commandUpdateDriverTrainingProgress(token, {
    action: "complete_lesson",
    assignmentId: assignment.id,
    courseId: assignment.courseId,
    lessonId,
    totalLessons: content.lessons.length,
    progressPercentage,
    acknowledged: Boolean(extras.acknowledged),
    lessonPayload: extras.lessonPayload ?? {},
  });

  if (!result.ok) {
    return {
      ok: true,
      offline: true,
      message: result.message,
      assignment: enrichAssignment({ ...assignment, lessonProgress, progressPercentage }, driverId),
    };
  }

  return { ok: true, assignment: enrichAssignment(result.assignment, driverId) };
}

export async function completeTrainingDeclaration(session, assignment) {
  const token = await accessTokenFromSession(session);
  const driverId = session?.driverId ?? null;
  if (!token || !assignment) return { ok: false, message: "Declaration could not be submitted." };

  const result = await commandUpdateDriverTrainingProgress(token, {
    action: "complete_declaration",
    assignmentId: assignment.id,
    courseId: assignment.courseId,
  });
  if (!result.ok) return result;

  saveLocalTrainingProgress(driverId, assignment.id, {
    lessonProgress: assignment.lessonProgress ?? {},
    progressPercentage: 100,
  });

  return { ok: true, assignment: enrichAssignment(result.assignment, driverId) };
}

export function formatTrainingDue(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(`${String(dateStr).slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr).slice(0, 10);
  }
}

export function trainingPrimaryAction(assignment) {
  const status = String(assignment?.status ?? "");
  if (status === "completed") return { label: "View completion record", to: "completed" };
  if (status === "evidence_required") return { label: "View requirements", to: "evidence" };
  if (status === "awaiting_review") return { label: "View submission", to: "" };
  if (status === "changes_requested") return { label: "Continue training", to: "continue" };
  if (Number(assignment?.progressPercentage ?? 0) > 0 || status === "in_progress") {
    return { label: "Continue training", to: "continue" };
  }
  return { label: "Start training", to: "start" };
}

export function eligibilityRestrictionCopy(assignment) {
  if (!assignment) return null;
  const effect = String(assignment.eligibilityEffect ?? "none");
  if (effect === "none") return null;
  if (effect === "block_all_work") {
    return `You cannot start active duty until ${assignment.title} is completed.`;
  }
  if (effect === "block_specific_work") {
    const types = (assignment.restrictedWorkTypes ?? []).join(", ") || "restricted";
    return `You cannot be assigned to ${types} duties until ${assignment.title} is completed.`;
  }
  if (effect === "warning") {
    return `Complete ${assignment.title} to stay fully duty-ready.`;
  }
  return null;
}
