"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import DraftManager from "@/components/quest/DraftManager";
import QuestBasicsStep from "@/components/quest/steps/QuestBasicsStep";
import RequirementsCriteriaStep from "@/components/quest/steps/RequirementsCriteriaStep";
import RewardConfigurationStep from "@/components/quest/steps/RewardConfigurationStep";
import TimelineStep from "@/components/quest/steps/TimelineStep";
import VerificationSettingsStep from "@/components/quest/steps/VerificationSettingsStep";
import ReviewPreviewStep from "@/components/quest/steps/ReviewPreviewStep";
import ConfirmationStep from "@/components/quest/steps/ConfirmationStep";
import type { QuestFormData } from "@/lib/types/admin";
import { useCreateQuest } from "@/lib/hooks/useAdmin";
import { useQuestDraft } from "@/lib/hooks/useQuestDraft";
import {
  defaultQuestWizardData,
  QUEST_WIZARD_STEPS,
  sanitizeWizardData,
  validateStep,
  type QuestWizardData,
  type QuestWizardStepIndex,
} from "@/lib/schemas/quest.schema";

function toQuestFormData(data: QuestWizardData): QuestFormData {
  const deadline = data.timeline.deadline
    ? data.timeline.timezone === "UTC"
      ? new Date(`${data.timeline.deadline}:00Z`).toISOString()
      : new Date(data.timeline.deadline).toISOString()
    : "";

  return {
    title: data.basics.title,
    shortDescription: data.basics.shortDescription,
    description: [
      data.basics.description,
      "",
      "## Verification Instructions",
      data.verification.instructions,
      data.verification.mode === "auto"
        ? `\nAuto Criteria:\n${data.verification.autoCriteria}`
        : "",
      "",
      `Timezone: ${data.timeline.timezone}`,
    ]
      .filter(Boolean)
      .join("\n"),
    category: data.basics.category,
    difficulty: "intermediate",
    reward: data.reward.amount,
    xpReward: data.reward.xpReward,
    deadline,
    maxParticipants: 200,
    requirements: [
      ...data.requirements.skills.map((skill) => `Skill: ${skill}`),
      ...data.requirements.deliverables.map(
        (item) =>
          `Deliverable: ${item.title}${item.details ? ` (${item.details})` : ""}${item.required ? " [required]" : ""}`,
      ),
      ...data.timeline.milestones
        .filter((item) => item.title)
        .map(
          (item) =>
            `Milestone: ${item.title}${item.dueDate ? ` by ${item.dueDate}` : ""}`,
        ),
    ],
    tags: [
      "wizard-created",
      `asset-${data.reward.assetType.toLowerCase()}`,
      `verification-${data.verification.mode}`,
    ],
  };
}

function parseErrors(errorList: Array<{ field: string; message: string }>) {
  return errorList.reduce<Record<string, string>>((acc, item) => {
    acc[item.field] = item.message;
    return acc;
  }, {});
}

const QuestWizard = () => {
  const router = useRouter();
  const { create, isCreating } = useCreateQuest();

  const [wizardData, setWizardData] = useState(defaultQuestWizardData);
  const [stepIndex, setStepIndex] = useState<QuestWizardStepIndex>(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { saveDraft, loadDraft, clearDraft, draftMeta } = useQuestDraft(
    wizardData,
    stepIndex,
  );

  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / QUEST_WIZARD_STEPS.length) * 100),
    [stepIndex],
  );

  const validateCurrent = () => {
    const errors = validateStep(stepIndex, wizardData);
    setFieldErrors(parseErrors(errors));
    return errors.length === 0;
  };

  const applyStepUpdate = (
    updater: (prev: QuestWizardData) => QuestWizardData,
  ) => {
    setWizardData((prev) => {
      const next = updater(prev);
      const nextErrors = validateStep(stepIndex, next);
      setFieldErrors(parseErrors(nextErrors));
      return next;
    });
  };

  const goNext = async () => {
    if (!validateCurrent()) {
      return;
    }

    if (stepIndex === 5) {
      const payload = toQuestFormData(sanitizeWizardData(wizardData));
      const result = await create(payload);
      if (!result.success) {
        setSubmitError(result.error ?? "Failed to create quest.");
        setStepIndex(6);
        return;
      }

      setSubmitError(null);
      setSubmitted(true);
      clearDraft();
      setStepIndex(6);
      return;
    }

    if (stepIndex < 6) {
      setFieldErrors({});
      setStepIndex((prev) => Math.min(6, prev + 1) as QuestWizardStepIndex);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setFieldErrors({});
      setStepIndex((prev) => Math.max(0, prev - 1) as QuestWizardStepIndex);
    }
  };

  const handleLoadDraft = () => {
    const draft = loadDraft();
    if (!draft) {
      return;
    }

    setWizardData(draft.data);
    setStepIndex(draft.step);
    setFieldErrors({});
  };

  const currentStepContent = (() => {
    if (stepIndex === 0) {
      return (
        <QuestBasicsStep
          data={wizardData}
          errors={fieldErrors}
          onChange={(next) =>
            applyStepUpdate((prev) => ({ ...prev, basics: next }))
          }
        />
      );
    }
    if (stepIndex === 1) {
      return (
        <RequirementsCriteriaStep
          data={wizardData}
          errors={fieldErrors}
          onChange={(next) =>
            applyStepUpdate((prev) => ({ ...prev, requirements: next }))
          }
        />
      );
    }
    if (stepIndex === 2) {
      return (
        <RewardConfigurationStep
          data={wizardData}
          errors={fieldErrors}
          onChange={(next) =>
            applyStepUpdate((prev) => ({ ...prev, reward: next }))
          }
        />
      );
    }
    if (stepIndex === 3) {
      return (
        <TimelineStep
          data={wizardData}
          errors={fieldErrors}
          onChange={(next) =>
            applyStepUpdate((prev) => ({ ...prev, timeline: next }))
          }
        />
      );
    }
    if (stepIndex === 4) {
      return (
        <VerificationSettingsStep
          data={wizardData}
          errors={fieldErrors}
          onChange={(next) =>
            applyStepUpdate((prev) => ({ ...prev, verification: next }))
          }
        />
      );
    }
    if (stepIndex === 5) {
      return <ReviewPreviewStep data={wizardData} />;
    }
    return (
      <ConfirmationStep
        submitted={submitted}
        questTitle={wizardData.basics.title}
        error={submitError}
      />
    );
  })();

  return (
    <section
      className="mx-auto w-full max-w-6xl py-4 sm:py-6"
      data-testid="quest-wizard"
    >
      <div className="mb-5 rounded-3xl border border-zinc-200 bg-linear-to-br from-cyan-50 via-white to-amber-50 p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:from-cyan-950/30 dark:via-zinc-900 dark:to-amber-950/20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
              Quest Creation Wizard
            </p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
              Build a quest in seven guided steps
            </h1>
          </div>
          <DraftManager
            hasDraft={draftMeta.hasDraft}
            lastSavedAt={draftMeta.lastSavedAt}
            onSave={() => saveDraft(wizardData, stepIndex)}
            onLoad={handleLoadDraft}
            onClear={clearDraft}
          />
        </div>

        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          <span>
            Step {stepIndex + 1} of {QUEST_WIZARD_STEPS.length}:{" "}
            {QUEST_WIZARD_STEPS[stepIndex]}
          </span>
          <span>{progress}% complete</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-linear-to-r from-cyan-500 to-amber-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {QUEST_WIZARD_STEPS.map((stepLabel, index) => {
          const active = index === stepIndex;
          const completed = index < stepIndex;
          return (
            <div
              key={stepLabel}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                active
                  ? "border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200"
                  : completed
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              }`}
            >
              <div className="flex items-center gap-1">
                {completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <span>{index + 1}.</span>
                )}
                <span>{stepLabel}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-900">
        {currentStepContent}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={stepIndex === 0}
          className="rounded-xl border border-zinc-300 px-5 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Back
        </button>

        <div className="flex flex-wrap gap-2">
          {stepIndex === 6 ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setWizardData(defaultQuestWizardData);
                  setFieldErrors({});
                  setSubmitted(false);
                  setSubmitError(null);
                  setStepIndex(0);
                }}
                className="rounded-xl border border-zinc-300 px-5 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Create Another
              </button>
              <button
                type="button"
                onClick={() => router.push("/quests")}
                className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
              >
                Go to Quests
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={isCreating}
              className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating
                ? "Publishing..."
                : stepIndex === 5
                  ? "Publish Quest"
                  : "Continue"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default QuestWizard;
