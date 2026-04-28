// Tell TypeScript that video file imports resolve to a URL string.
// The actual bundling is handled by the webpack rule in next.config.js
// (`asset/resource` for /\.(mp4|webm|ogv)$/i).
declare module "*.mp4" {
  const src: string;
  export default src;
}

declare module "*.webm" {
  const src: string;
  export default src;
}

declare module "*.ogv" {
  const src: string;
  export default src;
}
