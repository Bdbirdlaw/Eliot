import { Wordmark } from "./Wordmark";

/**
 * Per lane header. One system, tonal variation by lane is applied by the page
 * (spacing, type) rather than a second palette. Carries the lane label, the
 * signed in person, and sign out. Never shows a chooser of lanes the user
 * cannot enter.
 */
export function LaneHeader({
  lane,
  userName,
  tone = "ink",
  links,
}: {
  lane: string;
  userName: string;
  tone?: "ink" | "paper";
  links?: { href: string; label: string }[];
}) {
  const paper = tone === "paper";
  return (
    <header
      className={`flex items-center justify-between border-b px-5 py-4 sm:px-8 ${
        paper ? "border-night-rule" : "border-gray-rule"
      }`}
    >
      <div className="flex items-baseline gap-4">
        <Wordmark tone={tone} />
        <span className={`eyebrow ${paper ? "text-night-mut" : ""}`}>{lane}</span>
      </div>
      <div className="flex items-center gap-5">
        {links?.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className={`text-sm ${paper ? "text-night-mut hover:text-night-paper" : "text-gray-mut hover:text-ink"}`}
          >
            {l.label}
          </a>
        ))}
        <span className={`hidden text-sm sm:inline ${paper ? "text-night-mut" : "text-gray-mut"}`}>
          {userName}
        </span>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className={`text-sm underline-offset-4 hover:underline ${
              paper ? "text-night-paper" : "text-ink"
            }`}
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
