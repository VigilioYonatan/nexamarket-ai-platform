import { createServer } from "vite";

const server = await createServer({
  configFile: "./apps/web/vite.config.ts",
  root: "./apps/web",
  server: {
    port: 5173,
    host: "0.0.0.0",
  },
});

await server.listen();
server.printUrls();

process.stdin.resume();
