import React from "react";

type PickedChoice = {
  stepNo: number;
  genreKey: string;
};

type Props = {
  totalSteps: number; // should be 5
  currentStep: number; // 1..5
  picked?: PickedChoice[];
};

const STEP_META = [
  { title: "Build-up" },
  { title: "Branch" },
  { title: "Twist" },
  { title: "Climax" },
  { title: "Finale" },
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7.9 13.4 4.6 10.1a1 1 0 1 1 1.4-1.4l2 2 5.9-5.9a1 1 0 1 1 1.4 1.4l-7.3 7.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function JourneyStepper({ totalSteps, currentStep }: Props) {
  const steps = Math.min(totalSteps || 5, 5);
  const active = clamp(currentStep || 1, 1, steps);

  return (
    <div
      className="journey-stepper w-full rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.10)] border border-slate-100 p-4 sm:p-6"
      role="navigation"
      aria-label="Journey steps"
    >
      <div className="journey-stepper-row flex items-start justify-between gap-2 sm:gap-4">
        {Array.from({ length: steps }).map((_, idx) => {
          const stepNo = idx + 1;
          const isCompleted = stepNo < active;
          const isActive = stepNo === active;
          const isPending = stepNo > active;

          const status = isCompleted ? "Completed" : isActive ? "In Progress" : "Pending";
          const title = STEP_META[idx]?.title ?? `Step ${stepNo}`;

          const circleStateClass = isCompleted
            ? "journey-completed"
            : isActive
            ? "journey-active"
            : "journey-pending";

          const statusClass = isCompleted
            ? "journey-status-completed"
            : isActive
            ? "journey-status-active"
            : "journey-status-pending";

          const fillClass = isCompleted
            ? "journey-fill-completed"
            : isActive
            ? "journey-fill-active"
            : "journey-fill-pending";

          return (
            <div key={stepNo} className="journey-step flex-1">
              {/* top row */}
              <div className="journey-top flex items-center">
                {/* circle */}
                <div className={`journey-circle ${circleStateClass}`}>
                  {isCompleted ? (
                    <CheckIcon />
                  ) : (
                    <span className="journey-dot" />
                  )}
                </div>

                {/* connector */}
                {stepNo !== steps && (
                  <div className="journey-connector mx-2 sm:mx-3 h-[3px] flex-1 rounded-full bg-slate-200 overflow-hidden">
                    <div className={`journey-connector-fill ${fillClass}`} />
                  </div>
                )}
              </div>

              {/* labels */}
              <div className="journey-labels mt-3">
                <div className="journey-stepno text-xs font-semibold tracking-wider text-slate-500">
                  STEP {stepNo}
                </div>
                <div className="journey-title text-sm font-semibold text-slate-900">{title}</div>
                <div className={`journey-status mt-1 text-xs font-medium ${statusClass}`}>
                  {status}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
