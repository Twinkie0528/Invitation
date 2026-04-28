/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "image.mux.com" },
    ],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ["raw-loader"],
    });
    // Handle video imports (mp4/webm) from anywhere in the project — lets
    // us `import vid from "@/assets/foo.mp4"` and have webpack copy the
    // file into the build output and resolve the import to a URL string.
    config.module.rules.push({
      test: /\.(mp4|webm|ogv)$/i,
      type: "asset/resource",
      generator: {
        filename: "static/media/[name].[hash:8][ext]",
      },
    });
    return config;
  },
};

module.exports = nextConfig;
