// threejs-components is shipped without types. Narrow shim for the one
// subpath we consume — `cursors/tubes1` — matching the runtime API we use.

declare module "threejs-components/build/cursors/tubes1.min.js" {
  type TubesCursorOptions = {
    tubes?: {
      colors?: string[];
      lights?: {
        intensity?: number;
        colors?: string[];
      };
    };
    sleepRadiusX?: number;
    sleepRadiusY?: number;
    sleepTimeScale1?: number;
    sleepTimeScale2?: number;
  };

  type TubesCursorHandle = {
    three: unknown;
    options: TubesCursorOptions;
    tubes: {
      setColors: (colors: string[]) => void;
      setLightsColors: (colors: string[]) => void;
    };
    bloomPass: unknown;
    dispose: () => void;
  };

  const TubesCursor: (
    canvas: HTMLCanvasElement,
    options?: TubesCursorOptions,
  ) => TubesCursorHandle;

  export default TubesCursor;
}
