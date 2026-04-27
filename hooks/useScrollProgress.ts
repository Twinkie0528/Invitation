"use client";

import { useEffect, useRef, useState } from "react";
import type Lenis from "lenis";
import { resolveScene, type SceneState } from "@/lib/scenes";

type Listener = (s: SceneState) => void;

// Shared ref-like store so many components and the R3F frame loop can
// read scroll state without triggering React re-renders.
export const sceneRef: { current: SceneState } = {
  current: { progress: 0, active: "hero", localT: 0 },
};

const listeners = new Set<Listener>();

export function pushSceneProgress(progress: number) {
  const next = resolveScene(progress);
  sceneRef.current = next;
  listeners.forEach((l) => l(next));
}

export function subscribeScene(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

// Bind a Lenis instance to scene state.
export function attachLenis(lenis: Lenis) {
  const handler = ({ progress }: { progress: number }) => {
    pushSceneProgress(progress);
  };
  lenis.on("scroll", handler);
  return () => lenis.off("scroll", handler);
}

// Hook form — useful for DOM components that genuinely need to re-render.
export function useSceneState(): SceneState {
  const [state, setState] = useState<SceneState>(sceneRef.current);
  useEffect(() => {
    return subscribeScene(setState);
  }, []);
  return state;
}

// Hook that exposes a persistent ref without re-rendering.
export function useSceneRef() {
  const ref = useRef<SceneState>(sceneRef.current);
  useEffect(() => {
    return subscribeScene((s) => {
      ref.current = s;
    });
  }, []);
  return ref;
}

// Returns `true` once scroll progress has crossed `atProgress`, and stays
// true for the rest of the session. Used to trigger scroll-bound
// animations (typewriters, word reveals) exactly when the matching scene
// is about to be on screen — not on page load.
export function useSceneEntered(atProgress: number): boolean {
  const [entered, setEntered] = useState(sceneRef.current.progress >= atProgress);

  useEffect(() => {
    if (sceneRef.current.progress >= atProgress) {
      setEntered(true);
      return;
    }
    const unsub = subscribeScene(({ progress }) => {
      if (progress >= atProgress) {
        setEntered(true);
      }
    });
    return unsub;
  }, [atProgress]);

  return entered;
}
