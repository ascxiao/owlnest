import React, { useState } from "react";
import "./CaptureModal.css";

interface Props {
  app_name: string;
  onSave: (where_left_off: string, next_step: string) => Promise<void>;
  onSkip: () => void;
}

export default function CaptureModal({ app_name, onSave, onSkip }: Props) {
  const [whereLeftOff, setWhereLeftOff] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onSkip();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSkip, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("[CaptureModal] handleSubmit called");
    console.log("[CaptureModal] whereLeftOff:", whereLeftOff);
    console.log("[CaptureModal] nextStep:", nextStep);
    console.log("[CaptureModal] isSubmitting:", isSubmitting);

    if (whereLeftOff.trim() && nextStep.trim() && !isSubmitting) {
      console.log("[CaptureModal] All validation passed, calling onSave");
      try {
        setIsSubmitting(true);
        console.log("[CaptureModal] Set isSubmitting to true");
        console.log("[CaptureModal] Awaiting onSave...");
        await onSave(whereLeftOff, nextStep);
        console.log("[CaptureModal] onSave returned successfully");
      } catch (error) {
        console.error("[CaptureModal] onSave threw error:", error);
        console.error("[CaptureModal] Error details:", JSON.stringify(error));
        alert(`Failed to save: ${error}`);
      } finally {
        console.log(
          "[CaptureModal] Finally block - setting isSubmitting to false",
        );
        setIsSubmitting(false);
      }
    } else {
      console.log("[CaptureModal] Form validation failed", {
        whereLeftOffTrimmed: whereLeftOff.trim(),
        nextStepTrimmed: nextStep.trim(),
        isSubmitting,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onSkip}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Note Saved</h2>
        <p>
          Just closing {app_name}. Help your future self remember where you left
          off.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            placeholder="Where did you leave off?"
            value={whereLeftOff}
            onChange={(e) => setWhereLeftOff(e.target.value)}
            autoFocus
            disabled={isSubmitting}
          />
          <textarea
            placeholder="What's your next step?"
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            disabled={isSubmitting}
          />
          <div className="modal-buttons">
            <button type="button" onClick={onSkip} disabled={isSubmitting}>
              Skip
            </button>
            <button
              type="submit"
              disabled={
                !whereLeftOff.trim() || !nextStep.trim() || isSubmitting
              }
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
