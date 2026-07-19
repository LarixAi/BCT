/**
 * Map FCM notification data payload to driver app routes.
 */
export function routeFromNotificationData(data, navigate) {
  if (!data || !navigate) return;

  const screen = data.screen ?? data.type;
  const jobId = data.jobId;
  const offerId = data.offerId;
  const threadId = data.threadId;

  switch (screen) {
    case "JobDetail":
    case "job_assigned":
    case "phv_trip_assigned":
    case "job_updated":
    case "job_cancelled":
    case "route_changed":
      if (jobId) navigate(`/job/${jobId}`);
      else navigate("/jobs");
      break;
    case "JobOffer":
    case "job_offered":
      if (offerId) navigate(`/offers/${offerId}`);
      else navigate("/jobs");
      break;
    case "MessageThread":
    case "driver_message_received":
    case "admin_message_received":
      if (threadId) navigate(`/threads/${threadId}`);
      else navigate("/threads");
      break;
    case "VehicleCheck":
    case "vehicle_check_missing":
      navigate("/check");
      break;
    case "DutyDetail":
    case "duty_published":
    case "duty_assigned":
    case "duty_updated":
      navigate("/jobs");
      break;
    case "Documents":
    case "document_expiring":
    case "document_rejected":
      navigate("/documents");
      break;
    case "Defects":
    case "defect_report_received":
      navigate("/defects");
      break;
    case "Onboarding":
      navigate("/onboarding");
      break;
    case "Notifications":
    case "dispatch":
    case "test":
    default:
      navigate("/notifications");
      break;
  }
}

export function extractNotificationData(notification) {
  const raw = notification?.data ?? notification?.notification?.data ?? {};
  const data = {};
  for (const [key, value] of Object.entries(raw)) {
    data[key] = typeof value === "string" ? value : value != null ? String(value) : "";
  }
  return data;
}
