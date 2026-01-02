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

/**
 * ✅ Mobile-friendly, ONE-LINE, horizontally scrollable stepper
 * - Stays in one row
 * - Swipe to scroll on mobile
 * - Scroll-snap so each step aligns nicely
 */
export default function JourneyStepper({ totalSteps, currentStep }: Props) {
  const steps = Math.min(totalSteps || 5, 5);
  const active = clamp(currentStep || 1, 1, steps);

  return (
    <div
      className="journey-stepper w-full rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.10)] border border-slate-100 p-3 sm:p-5"
      role="navigation"
      aria-label="Journey steps"
    >
      {/* ✅ Scroll container */}
      <div className="relative">
        <div
          className="
            flex flex-nowrap items-start gap-3
            overflow-x-auto overscroll-x-contain
            pb-2
            snap-x snap-mandatory
            [-webkit-overflow-scrolling:touch]
          "
        >
          {Array.from({ length: steps }).map((_, idx) => {
            const stepNo = idx + 1;
            const isCompleted = stepNo < active;
            const isActive = stepNo === active;

            const status = isCompleted ? "Completed" : isActive ? "In progress" : "Pending";
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
              <div
                key={stepNo}
                className="
                  snap-start
                  min-w-[150px] sm:min-w-0
                  shrink-0 sm:shrink
                  rounded-2xl border border-slate-100 bg-white
                  px-3 py-3
                "
              >
                {/* top row */}
                <div className="flex items-center">
                  {/* circle */}
                  <div className={`journey-circle ${circleStateClass}`}>
                    {isCompleted ? <CheckIcon /> : <span className="journey-dot" />}
                  </div>

                  {/* connector inside card (tiny, so it looks like a continuous stepper) */}
                  {stepNo !== steps && (
                    <div className="ml-2 h-[3px] flex-1 rounded-full bg-slate-200 overflow-hidden">
                      <div className={`h-full ${fillClass}`} />
                    </div>
                  )}
                </div>

                {/* labels */}
                <div className="mt-2 min-w-0">
                  <div className="text-[10px] font-semibold tracking-wider text-slate-500 whitespace-nowrap">
                    STEP {stepNo}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 leading-tight whitespace-nowrap">
                    {title}
                  </div>
                  <div className={`mt-1 text-[11px] font-medium ${statusClass} whitespace-nowrap`}>
                    {status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ✅ subtle edge fades (optional) */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent" />
      </div>
    </div>
  );
}
