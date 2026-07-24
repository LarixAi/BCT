import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useYard } from "@/store/yard";
import { useSessionStore } from "@/platform/auth/session-store";
import { SectionHeader, RegPlate } from "@/components/yard/primitives";
import { PermissionGate } from "@/components/yard/PermissionGate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatTaskDue } from "@/domain/tasks/task-stats";
import {
  canAcceptTask,
  canAssignTask,
  canCompleteTask,
  getUserDisplayName,
} from "@/domain/tasks/task-workflow";
import { TaskProgressSteps } from "@/features/tasks/TaskProgressSteps";
import { ArrowLeft, CheckCircle2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { yardCopy } from "@/copy/yard-messages";

export const Route = createFileRoute("/_app/tasks/$taskId")({
  head: ({ params }) => ({
    meta: [{ title: `Task ${params.taskId} — Veyvio Yard` }],
  }),
  component: TaskDetailPage,
});

const TEAM = [
  { id: "usr_j.miller", name: "J. Miller" },
  { id: "usr_s.ahmed", name: "S. Ahmed" },
  { id: "usr_t.manager", name: "T. Manager" },
];

function TaskDetailPage() {
  const { taskId } = Route.useParams();
  const task = useYard(s => s.tasks.find(t => t.id === taskId));
  const vehicles = useYard(s => s.vehicles);
  const trips = useYard(s => s.trips);
  const acceptTask = useYard(s => s.acceptTask);
  const completeTask = useYard(s => s.completeTask);
  const assignTask = useYard(s => s.assignTask);
  const user = useSessionStore(s => s.user);
  const userId = user?.id;
  const userName = getUserDisplayName(user);
  const [note, setNote] = useState("");

  if (!task) throw notFound();

  const vehicle = task.vehicleId ? vehicles.find(v => v.id === task.vehicleId) : undefined;
  const trip = task.tripId ? trips.find(t => t.id === task.tripId) : undefined;

  const showAccept = canAcceptTask(task, userId, userName);
  const showComplete = canCompleteTask(task, userId, userName);
  const showAssign = canAssignTask(task);

  function handleComplete() {
    completeTask(task.id, note || undefined);
    toast.success(yardCopy.toast.task.completed);
  }

  return (
    <div className="space-y-5 animate-in-up pb-4">
      <Link to="/tasks" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        <ArrowLeft className="size-3" /> Tasks
      </Link>

      <header className="bg-white border border-border rounded-xs p-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-display text-lg font-extrabold tracking-tight">{task.title}</h1>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border shrink-0 ${
            task.priority === "Urgent" ? "bg-vor/10 text-vor border-vor/30"
            : task.priority === "High" ? "bg-warn/10 text-warn border-warn/40"
            : "bg-secondary text-muted border-border"
          }`}>{task.priority}</span>
        </div>
        {task.description && <p className="mt-2 text-sm text-muted">{task.description}</p>}
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-widest text-muted">
          <span>{task.kind}</span>
          <span>Due {formatTaskDue(task.dueAt)}</span>
          <span className="text-primary">{task.status.replace("_", " ")}</span>
        </div>
      </header>

      <section className="bg-white border border-border rounded-xs p-4">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Progress</h2>
        <TaskProgressSteps status={task.status} assigneeName={task.assigneeName} />
      </section>

      {(vehicle || trip) && (
        <section className="bg-white border border-border rounded-xs p-4 space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">Linked</h2>
          {vehicle && (
            <Link to="/yard/$vehicleId/equipment" params={{ vehicleId: vehicle.id }} className="flex items-center gap-2 hover:opacity-90">
              <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} />
              <span className="text-xs text-muted">{vehicle.bayId}</span>
            </Link>
          )}
          {trip && (
            <div className="text-xs">
              <span className="font-bold">{trip.code}</span> · {trip.service} · {trip.departAt}
            </div>
          )}
        </section>
      )}

      {task.assigneeName && (
        <section className="bg-secondary/30 border border-border rounded-xs p-3 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Assignee</span>
          <div className="font-bold mt-1">{task.assigneeName}</div>
          {task.acceptedAt && (
            <div className="text-[10px] text-muted mt-1">Accepted {new Date(task.acceptedAt).toLocaleString()}</div>
          )}
        </section>
      )}

      {showAssign && (
        <PermissionGate permission="task.assign">
          <section className="space-y-2">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">Assign to</h2>
            <div className="flex flex-wrap gap-2">
              {TEAM.map(member => (
                <Button
                  key={member.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    assignTask(task.id, member.id, member.name);
                    toast.success(yardCopy.toast.task.assigned(member.name));
                  }}
                  className="text-[10px] uppercase tracking-widest font-bold"
                >
                  <UserPlus className="size-3 mr-1" /> {member.name}
                </Button>
              ))}
            </div>
          </section>
        </PermissionGate>
      )}

      {showComplete && (
        <section className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">Completion note</h2>
          <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What was done?" rows={3} />
          <Button onClick={handleComplete} className="w-full bg-ok hover:bg-ok/90 text-white uppercase tracking-widest font-bold">
            <CheckCircle2 className="size-4 mr-2" /> Mark complete
          </Button>
        </section>
      )}

      {showAccept && !showComplete && (
        <Button
          onClick={() => {
            acceptTask(task.id);
            toast.success(yardCopy.toast.task.accepted);
          }}
          className="w-full bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold"
        >
          Accept task
        </Button>
      )}

      {task.status === "completed" && (
        <section className="bg-ok/5 border border-ok/30 rounded-xs p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-ok">Completed</div>
          <div className="text-sm mt-1">{task.completedBy} · {task.completedAt && new Date(task.completedAt).toLocaleString()}</div>
          {task.completionNote && <p className="text-sm text-muted mt-2">{task.completionNote}</p>}
        </section>
      )}
    </div>
  );
}
