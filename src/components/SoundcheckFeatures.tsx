import type { ReactNode } from "react";

const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "Keep a running history",
    body: "Every show you've been to, logged in one place — or just start from the day you join.",
    icon: <EyeIcon />,
  },
  {
    title: "Rate what you saw",
    body: "A five-star scale with halves, so a good opener doesn't get the same score as a legendary headline set.",
    icon: <StarIcon />,
  },
  {
    title: "Write and share reviews",
    body: "Attach photos and video from the pit, and follow other music fans to see what they've been to.",
    icon: <PenIcon />,
  },
  {
    title: "Pin your top four",
    body: "Letterboxd-style, right on your profile — the four shows you'd tell anyone about.",
    icon: <HeartIcon />,
  },
  {
    title: "Compile lists",
    body: "Group shows into named collections — a tour, a genre, a summer — and share them with a link.",
    icon: <ListIcon />,
  },
  {
    title: "See your year in review",
    body: "Total shows, top artist, top venue, and a month-by-month breakdown, every year you're on Soundcheck.",
    icon: <CalendarIcon />,
  },
];

export default function SoundcheckFeatures() {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
        Soundcheck lets you...
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-4 flex flex-col gap-2">
            <div className="w-9 h-9 rounded-lg bg-[var(--surface-raised)] flex items-center justify-center text-[var(--accent-strong)]">
              {f.icon}
            </div>
            <p className="font-semibold text-sm">{f.title}</p>
            <p className="text-sm text-[var(--muted)] leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function iconProps() {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    "aria-hidden": true,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function EyeIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8L12 2.5Z" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M14 6l4 4" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M12 20.5S3 15 3 8.9A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 9 1.9C21 15 12 20.5 12 20.5Z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
