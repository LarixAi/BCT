/** Normalize checklist position after draft restore or template changes. */
export function normalizeChecklistProgress(items, answers, currentIndex = 0) {
  const total = items?.length ?? 0;
  if (total === 0) {
    return { currentIndex: 0, allComplete: false };
  }

  const answeredCount = items.filter((item) => {
    const status = answers?.[item.id]?.status;
    return status === "pass" || status === "fail" || status === "na" || status === "advisory";
  }).length;

  if (answeredCount >= total) {
    return { currentIndex: total - 1, allComplete: true };
  }

  let index = Number.isFinite(currentIndex) ? currentIndex : 0;
  index = Math.max(0, Math.min(index, total - 1));

  const firstUnanswered = items.findIndex((item) => {
    const status = answers?.[item.id]?.status;
    return status !== "pass" && status !== "fail" && status !== "na" && status !== "advisory";
  });

  if (firstUnanswered >= 0) {
    if (index > firstUnanswered || answers[items[index]?.id]?.status) {
      index = firstUnanswered;
    }
  }

  return { currentIndex: index, allComplete: false };
}

export function isChecklistFullyAnswered(items, answers) {
  if (!items?.length) return false;
  return items.every((item) => {
    const status = answers?.[item.id]?.status;
    return status === "pass" || status === "fail" || status === "na" || status === "advisory";
  });
}
