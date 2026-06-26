import "server-only";
import type AnthropicSDK from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../env";
import { MODEL_ID } from "../constants";

/**
 * ModelProvider: triage classification (and later, drafting) on the SERVER.
 * Uses the fixed model string claude-sonnet-4-6 with the photo as a vision
 * input. The photo is AUTHORITATIVE: if it shows something worse than the
 * words (active water, scorching, structural damage, exposed wiring, a security
 * gap) the image outweighs the description.
 *
 * The triage engine (lib/triage.ts) applies the hard rules and the safety nets.
 * This provider only returns the model's classification. On any parse or model
 * failure the engine defaults to the queue (fail safe toward the human).
 */

export type TriageModelInput = {
  workstream: string;
  issue: string;
  safetyAffected: boolean;
  hasQuote: boolean;
  amount: number | null;
  canWait: boolean;
  // data URL: "data:image/jpeg;base64,...". May be absent (escape hatch).
  photoDataUrl?: string | null;
};

export const TriageModelResultSchema = z.object({
  bucket: z.enum(["auto", "queue", "escalate"]),
  summary: z.string().min(1).max(600),
  recommendation: z.string().min(1).max(600),
});
export type TriageModelResult = z.infer<typeof TriageModelResultSchema>;

export interface ModelProvider {
  classifyMaintenance(input: TriageModelInput): Promise<TriageModelResult>;
}

// --- Mock: deterministic keyword heuristic over the description --------------
const ESCALATE_WORDS = [
  "water", "leak", "flood", "burst", "sewage", "gas", "smoke", "fire",
  "burning", "scorch", "spark", "exposed wire", "electrical", "shock",
  "structural", "collapse", "ceiling", "mold", "carbon monoxide", "break in",
  "broken lock", "door won't lock", "security", "no heat", "no power",
];
const AUTO_WORDS = [
  "drip", "squeak", "loose", "cosmetic", "paint", "caulk", "filter",
  "light bulb", "bulb", "handle", "knob", "touch up", "minor",
];

class MockModelProvider implements ModelProvider {
  async classifyMaintenance(input: TriageModelInput): Promise<TriageModelResult> {
    const text = input.issue.toLowerCase();
    const hitEscalate = ESCALATE_WORDS.find((w) => text.includes(w));
    const hitAuto = AUTO_WORDS.find((w) => text.includes(w));

    if (hitEscalate) {
      return {
        bucket: "escalate",
        summary: `Possible high severity issue at ${input.workstream}: ${input.issue}`,
        recommendation:
          "Treat as urgent. Dispatch a qualified trade and confirm the area is safe before any other work proceeds.",
      };
    }
    if (hitAuto && input.canWait) {
      return {
        bucket: "auto",
        summary: `Routine, low severity at ${input.workstream}: ${input.issue}`,
        recommendation: "Proceed and log. No principal review needed.",
      };
    }
    return {
      bucket: "queue",
      summary: `Needs a quick look at ${input.workstream}: ${input.issue}`,
      recommendation: input.hasQuote
        ? `Review the $${input.amount ?? 0} quote and approve or adjust.`
        : "Ask the contractor for a quote, then approve.",
    };
  }
}

// --- Real: Anthropic vision classification ----------------------------------
const SYSTEM_PROMPT = `You triage property maintenance reports for a real estate principal.
Classify each report into exactly one bucket:
- "escalate": safety or habitability risk, or anything that could get worse fast (active water, scorching, structural damage, exposed wiring, a security gap).
- "queue": needs the principal's quick decision (a quote to approve, ambiguous severity, or above a routine spend).
- "auto": clearly routine and low cost and can wait; safe to proceed and just log.
The PHOTO IS AUTHORITATIVE. If the image shows something worse than the words, weight the image over the description.
When uncertain, choose "queue". Never choose "auto" for anything involving safety, water, electrical, or structure.
Reply with ONLY a JSON object: {"bucket": "...", "summary": "...", "recommendation": "..."}. No prose, no code fences.`;

class AnthropicModelProvider implements ModelProvider {
  async classifyMaintenance(input: TriageModelInput): Promise<TriageModelResult> {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: env.anthropicApiKey });

    const content: AnthropicSDK.MessageParam["content"] = [];
    if (input.photoDataUrl) {
      const m = /^data:(image\/[a-zA-Z.+-]+);base64,(.+)$/.exec(input.photoDataUrl);
      if (m) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: m[1] as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: m[2],
          },
        });
      }
    }
    content.push({
      type: "text",
      text: [
        `Workstream: ${input.workstream}`,
        `Reported issue: ${input.issue}`,
        `Reporter says safety affected: ${input.safetyAffected}`,
        `Has quote: ${input.hasQuote}${input.amount != null ? ` ($${input.amount})` : ""}`,
        `Can wait until tomorrow: ${input.canWait}`,
        input.photoDataUrl ? "A photo is attached and is authoritative." : "No photo was provided.",
      ].join("\n"),
    });

    const msg = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const textBlock = msg.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Model returned no JSON object");
    }
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    return TriageModelResultSchema.parse(parsed);
  }
}

let cached: ModelProvider | null = null;

export function getModelProvider(): ModelProvider {
  if (cached) return cached;
  cached =
    env.providers.model === "real"
      ? new AnthropicModelProvider()
      : new MockModelProvider();
  return cached;
}
