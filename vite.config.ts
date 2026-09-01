import { sites } from "@openai/sites-vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";

const D1_DATABASE_NAME = "tradehustl3-db";
const D1_DATABASE_ID = "a8f61038-9a87-49b2-b708-b14400422d1b";
const R2_BUCKET_NAME = "tradehustl3books";

const { d1, r2 } = hostingConfig;

// Work around a vinext production client-chunk cycle that can leave SSR pages
// visible but completely inert (no hydration, navigation, or event handlers).
// Keep vinext shims together in one client chunk until the upstream fix is
// included in the pinned vinext version.
const vinextShimsSingleChunk = {
  name: "vinext-shims-single-chunk",
  configEnvironment(name: string) {
    if (name !== "client") return;

    return {
      build: {
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [
                {
                  name: "vinext-shims",
                  test: /[\\/]node_modules[\\/]vinext[\\/]dist[\\/]shims[\\/]/,
                },
              ],
            },
          },
        },
      },
    };
  },
};

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  keep_vars: true,
  triggers: {
    crons: ["*/5 * * * *"],
  },
  vars: {
    BREVO_LIST_ID: "3",
    BREVO_SAMPLE_SENDER_EMAIL: "updates@tradehustl3.com",
  },
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: D1_DATABASE_NAME,
          database_id: D1_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: R2_BUCKET_NAME,
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      vinext(),
      vinextShimsSingleChunk,
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
