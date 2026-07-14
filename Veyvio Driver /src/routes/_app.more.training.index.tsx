import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { MoreField } from "@/components/driver/more/MoreLayout";
import {
  PCJ_TRAINING_MODULES,
  QUALIFICATIONS_ON_FILE,
  trainingModuleStatusLabel,
} from "@/domain/passenger/passenger-training";
import { useTrainingStore } from "@/store/training";

export const Route = createFileRoute("/_app/more/training/")({
  head: () => ({ meta: [{ title: "Training — Veyvio Driver" }] }),
  component: TrainingPage,
});

function TrainingPage() {
  const progress = useTrainingStore((s) => s.progress);
  const moduleStatus = useTrainingStore((s) => s.moduleStatus);

  return (
    <MoreSubpageLayout title="Training and qualifications">
      <section className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">Passenger centred journeys</h2>
        {PCJ_TRAINING_MODULES.map((module) => {
          const status = moduleStatus(module.id);
          return (
            <Link key={module.id} to={module.href}>
              <HomeCard className="transition-colors hover:bg-secondary/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{module.title}</p>
                    <p className="mt-1 text-sm text-muted">{module.description}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted">
                      {trainingModuleStatusLabel(status, module, progress)}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                </div>
              </HomeCard>
            </Link>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">Qualifications on file</h2>
        {QUALIFICATIONS_ON_FILE.map((t) => (
          <HomeCard key={t.name}>
            <p className="font-semibold">{t.name}</p>
            <MoreField label="Status" value={t.status} />
            <MoreField label="Expiry" value={t.expiry} />
          </HomeCard>
        ))}
      </section>
    </MoreSubpageLayout>
  );
}
