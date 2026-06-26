"use client";

import { useActionState, useState } from "react";
import { fileReport, type FileReportState } from "./actions";

const initial: FileReportState = { idle: true };

function Segmented({
  name,
  value,
  onChange,
}: {
  name: string;
  value: "yes" | "no";
  onChange: (v: "yes" | "no") => void;
}) {
  return (
    <div className="flex gap-2">
      {(["yes", "no"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`flex-1 border px-4 py-3 text-base font-medium capitalize ${
            value === v
              ? "border-ink bg-ink text-paper"
              : "border-gray-rule bg-paper-raised text-ink"
          }`}
        >
          {v}
        </button>
      ))}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

export function IntakeForm({ properties }: { properties: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(fileReport, initial);
  const [safety, setSafety] = useState<"yes" | "no">("no");
  const [hasQuote, setHasQuote] = useState<"yes" | "no">("no");
  const [canWait, setCanWait] = useState<"yes" | "no">("yes");
  const [showNoPhoto, setShowNoPhoto] = useState(false);

  if ("ok" in state && state.ok) {
    const o = state.outcome;
    const chip =
      o.bucket === "auto" ? "chip-go" : o.bucket === "queue" ? "chip-hold" : "chip-stop";
    const headline =
      o.bucket === "auto"
        ? "Approved"
        : o.bucket === "queue"
        ? "Submitted for review"
        : "Escalated";
    return (
      <div className="card p-6">
        <span className={chip}>{headline}</span>
        <p className="mt-4 text-lg">{o.summary}</p>
        <p className="mt-1 text-gray-mut">{o.recommendation}</p>
        {o.bucket === "auto" && (
          <p className="mt-4 text-sm text-go">
            Logged and approved under the spend threshold. Proceed with the work.
          </p>
        )}
        {o.bucket === "queue" && (
          <p className="mt-4 text-sm text-gray-mut">
            Submitted for review. You will be notified once a decision is made.
          </p>
        )}
        {o.bucket === "escalate" && (
          <p className="mt-4 text-sm text-stop">
            Escalated for immediate handling.
          </p>
        )}
        <a href="/contractor" className="btn-ghost mt-6">
          Submit another
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="label" htmlFor="propertyLabel">
          Property
        </label>
        <select id="propertyLabel" name="propertyLabel" className="field" required>
          {properties.map((p) => (
            <option key={p.id} value={p.label}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="issue">
          What is the issue
        </label>
        <textarea
          id="issue"
          name="issue"
          required
          rows={4}
          className="field"
          placeholder="Describe what you see"
        />
      </div>

      <div>
        <label className="label">
          Is anyone&apos;s safety or ability to stay in the home affected right now
        </label>
        <Segmented name="safetyAffected" value={safety} onChange={setSafety} />
      </div>

      <div>
        <label className="label">Do you have a price</label>
        <Segmented name="hasQuote" value={hasQuote} onChange={setHasQuote} />
        {hasQuote === "yes" && (
          <input
            type="number"
            name="amount"
            min="0"
            step="1"
            placeholder="Amount in dollars"
            className="field mt-2"
          />
        )}
      </div>

      <div>
        <label className="label">Can it wait until tomorrow</label>
        <Segmented name="canWait" value={canWait} onChange={setCanWait} />
      </div>

      <div>
        <label className="label" htmlFor="photo">
          Photo {showNoPhoto ? "(skipped)" : "(required)"}
        </label>
        {!showNoPhoto && (
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            capture="environment"
            className="field"
          />
        )}
        <button
          type="button"
          onClick={() => setShowNoPhoto((s) => !s)}
          className="mt-2 text-sm text-accent underline"
        >
          {showNoPhoto ? "I can take a photo after all" : "No photo possible (such as a locked unit)?"}
        </button>
        {showNoPhoto && (
          <textarea
            name="noPhotoReason"
            rows={2}
            required
            className="field mt-2"
            placeholder="Why a photo is not possible"
          />
        )}
      </div>

      {"ok" in state && !state.ok && (
        <p className="text-sm text-stop">{state.error}</p>
      )}

      <button type="submit" className="btn-ink w-full py-4 text-base" disabled={pending}>
        {pending ? "Submitting" : "Submit report"}
      </button>
    </form>
  );
}
