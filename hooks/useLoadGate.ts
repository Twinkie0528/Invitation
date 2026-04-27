"use client";

import { useSyncExternalStore } from "react";
import { getState, subscribe } from "@/lib/loadGate";

// SSR snapshot must match the client's initial state on first paint —
// both `ready` and `introDone` start false until subsystems report in.
const SSR_SNAPSHOT = Object.freeze({ ready: false, introDone: false });
const getSSRSnapshot = () => SSR_SNAPSHOT;

export function useLoadGate(): { ready: boolean; introDone: boolean } {
  return useSyncExternalStore(subscribe, getState, getSSRSnapshot);
}
