const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig = {
  async rewrites() {
    return [
      { source: "/connect", destination: `${BACKEND_URL}/connect` },
      { source: "/connect-file", destination: `${BACKEND_URL}/connect-file` },
      { source: "/query", destination: `${BACKEND_URL}/query` },
      { source: "/conversations", destination: `${BACKEND_URL}/conversations` },
      {
        source: "/conversations/:path*",
        destination: `${BACKEND_URL}/conversations/:path*`,
      },
    ];
  },
};

export default nextConfig;
