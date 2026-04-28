// Pure scroll runway — provides the height Lenis needs so the user can
// scroll through the full timeline. All section content is position:fixed
// above the canvas, so this div is only about giving scroll a distance to
// travel.
export default function ScrollRunway() {
  return (
    <div
      aria-hidden
      style={{ height: "500vh" }}
      className="pointer-events-none"
    />
  );
}
