import { CheckCircle2, ClipboardList, Ruler, Save } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { WorkflowStep } from "@/lib/quote/types";

const workflowSteps: Array<{ id: WorkflowStep; title: string; icon: typeof ClipboardList }> = [
  { id: "client", title: "Client", icon: ClipboardList },
  { id: "walls", title: "Walls", icon: Ruler },
  { id: "review", title: "Review", icon: Save },
];

interface QuoteStepNavProps {
  currentStep: WorkflowStep;
  formBusy: boolean;
  hasClientDetails: boolean;
  hasWalls: boolean;
  hasProducts: boolean;
  workflowReady: boolean;
  onStepChange: (step: WorkflowStep) => void;
}

export function QuoteStepNav({
  currentStep,
  formBusy,
  hasClientDetails,
  hasWalls,
  hasProducts,
  workflowReady,
  onStepChange,
}: QuoteStepNavProps) {
  return (
    <Card className="p-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const active = currentStep === step.id;
          const complete = step.id === "client" ? hasClientDetails : step.id === "walls" ? hasWalls && hasProducts : workflowReady;

          return (
            <button
              key={step.id}
              type="button"
              disabled={formBusy}
              onClick={() => onStepChange(step.id)}
              className={`rounded-md border px-3 py-2 text-left text-sm transition sm:px-2 ${
                active ? "border-blue-500 bg-blue-50" : complete ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
              } ${formBusy ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <div className="flex items-center gap-2 sm:justify-start">
                {complete ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : <Icon className="h-4 w-4 text-blue-700" />}
                <span className="font-semibold">{index + 1}. {step.title}</span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
