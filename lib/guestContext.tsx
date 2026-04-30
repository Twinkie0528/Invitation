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
export function formatGuestName(raw: string): string {
  const match = /^([A-Za-zÀ-ÿ]{1,3})\.\s*(.+)$/.exec(raw);
  if (match) return `${match[2]} ${match[1]}.`;
  return raw;
}
