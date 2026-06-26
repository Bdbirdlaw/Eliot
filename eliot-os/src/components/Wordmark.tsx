import Link from "next/link";

/** The Eliot OS wordmark. Set as real text, not an image. */
export function Wordmark({
  href = "/",
  tone = "ink",
}: {
  href?: string;
  tone?: "ink" | "paper";
}) {
  return (
    <Link
      href={href}
      className={`font-display text-lg tracking-tightest ${
        tone === "paper" ? "text-night-paper" : "text-ink"
      }`}
    >
      Eliot<span className="text-accent">.</span>OS
    </Link>
  );
}
