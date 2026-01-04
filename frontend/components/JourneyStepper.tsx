import React from "react";

type PickedChoice = {
  stepNo: number;
  genreKey: string;
};

type Props = {
  totalSteps: number; // should be 5
  currentStep: number; // 1..5
  picked?: PickedChoice[];
  
  // ✅ new (optional)
  plan?: "free" | "premium" | "creator";
  unlockedChapters?: number[]; // e.g. [3,4]
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

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6.5 9V6.8C6.5 4.7 8.2 3 10.3 3c2.1 0 3.8 1.7 3.8 3.8V9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M5.5 9h9c.8 0 1.5.7 1.5 1.5v5c0 .8-.7 1.5-1.5 1.5h-9C4.7 17 4 16.3 4 15.5v-5C4 9.7 4.7 9 5.5 9Z"
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
export default function JourneyStepper({
  totalSteps,
  currentStep,
  plan = "free",
  unlockedChapters = [],
}: Props) {
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
            const isPaidStep = stepNo >= 3;
            const isUnlocked = unlockedChapters.includes(stepNo);
            const isLocked = plan === "free" && isPaidStep && !isUnlocked;

            const isCompleted = stepNo < active;
            const isActive = stepNo === active;

            const status = isCompleted
              ? "Completed"
              : isLocked
              ? "Locked"
              : isActive
              ? "In progress"
              : "Pending";

            const title = STEP_META[idx]?.title ?? `Step ${stepNo}`;

            const circleStateClass = isCompleted
            ? "journey-completed"
            : isLocked
            ? "journey-locked"
            : isActive
            ? "journey-active"
            : "journey-pending";

            const statusClass = isCompleted
            ? "journey-status-completed"
            : isLocked
            ? "journey-status-locked"
            : isActive
            ? "journey-status-active"
            : "journey-status-pending";

            const fillClass = isCompleted
            ? "journey-fill-completed"
            : isLocked
            ? "journey-fill-locked"
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
                   {isCompleted ? <CheckIcon /> : isLocked ? <LockIcon /> : <span className="journey-dot" />}
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
