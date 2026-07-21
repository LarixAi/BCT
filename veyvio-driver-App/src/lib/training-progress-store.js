/** Local Training Centre progress cache (mirrors Command when online). */

const STORAGE_KEY = "veyvio.driver.trainingProgress.v1";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* private mode / quota */
  }
}

export function getLocalTrainingProgress(driverId, assignmentId) {
  if (!driverId || !assignmentId) return { lessonProgress: {}, progressPercentage: 0 };
  const entry = readAll()?.[driverId]?.[assignmentId];
  if (!entry || typeof entry !== "object") {
    return { lessonProgress: {}, progressPercentage: 0 };
  }
  return {
    lessonProgress: entry.lessonProgress && typeof entry.lessonProgress === "object" ? entry.lessonProgress : {},
    progressPercentage: Number(entry.progressPercentage ?? 0),
    updatedAt: entry.updatedAt ?? null,
  };
}

export function saveLocalTrainingProgress(driverId, assignmentId, payload) {
  if (!driverId || !assignmentId) return;
  const all = readAll();
  if (!all[driverId]) all[driverId] = {};
  all[driverId][assignmentId] = {
    lessonProgress: payload.lessonProgress ?? {},
    progressPercentage: Number(payload.progressPercentage ?? 0),
    updatedAt: new Date().toISOString(),
  };
  writeAll(all);
}

export function mergeLessonProgress(serverProgress = {}, localProgress = {}) {
  const merged = { ...serverProgress };
  for (const [lessonId, local] of Object.entries(localProgress)) {
    const remote = merged[lessonId];
    if (!remote?.completedAt && local?.completedAt) {
      merged[lessonId] = local;
    } else if (remote && local) {
      merged[lessonId] = {
        ...remote,
        ...local,
        completedAt: remote.completedAt || local.completedAt || null,
      };
    } else if (!remote) {
      merged[lessonId] = local;
    }
  }
  return merged;
}
