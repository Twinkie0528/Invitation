"use client";

import { createContext, useContext, type ReactNode } from "react";

type GuestInfo = {
  name: string;
  date?: string;
};

const GuestContext = createContext<GuestInfo | undefined>(undefined);

export function GuestProvider({
  name,
  date,
  children,
}: {
  name: string;
  date?: string;
  children: ReactNode;
}) {
  return (
    <GuestContext.Provider value={{ name, date }}>{children}</GuestContext.Provider>
  );
}

export function useGuest(): GuestInfo | undefined {
  return useContext(GuestContext);
}

export function useGuestName(): string | undefined {
  return useContext(GuestContext)?.name;
}

// Display formatter: "R.Ganbold" → "Ganbold R." — surname first, then
// initials.  Applied at every user-facing surface (hero script + CSV
// export); the raw `Initial.Surname` form is kept inside guests.json
// because it's the cache key the slug generator uses for stability,
// and changing it would invalidate every link the boss has already
// distributed.
//
// The regex matches a 1–3 character initial (Latin or Latin-ext, so
// `Sü` and `Ch` both work), an optional space after the dot, then any
// remaining text — including hyphenated surnames like "Enkh-Amgalan".
// Names without the `Initial.` prefix (Latin-style "Attilla Vitai",
// single-word "Batjargal") fall through unchanged.
//
// Honorific titles (`Mr.`, `Mrs.`, `Ms.`, `Dr.`) match the same shape
// as an initial but should *stay* in front instead of swapping to the
// surname-first order — we just normalise the spacing so the dot is
// followed by a single space ("Mr.Park" → "Mr. Park").
const HONORIFICS: ReadonlySet<string> = new Set(["Mr", "Mrs", "Ms", "Dr"]);

export function formatGuestName(raw: string): string {
  const match = /^([A-Za-zÀ-ÿ]{1,3})\.\s*(.+)$/.exec(raw);
  if (match) {
    if (HONORIFICS.has(match[1])) return `${match[1]}. ${match[2]}`;
    return `${match[2]} ${match[1]}.`;
  }
  return raw;
}
