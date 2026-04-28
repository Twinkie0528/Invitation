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
