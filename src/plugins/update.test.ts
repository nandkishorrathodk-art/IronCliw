import { beforeEach, describe, expect, it, vi } from "vitest";

const installPluginFromNpmSpecMock = vi.fn();
const resolveBundledPluginSourcesMock = vi.fn();

vi.mock("./install.js", () => ({
  installPluginFromNpmSpec: (...args: unknown[]) => installPluginFromNpmSpecMock(...args),
  resolvePluginInstallDir: (pluginId: string) => `/tmp/${pluginId}`,
  PLUGIN_INSTALL_ERROR_CODE: {
    NPM_PACKAGE_NOT_FOUND: "npm_package_not_found",
  },
}));

vi.mock("./bundled-sources.js", () => ({
  resolveBundledPluginSources: (...args: unknown[]) => resolveBundledPluginSourcesMock(...args),
}));

describe("updateNpmInstalledPlugins", () => {
  beforeEach(() => {
    installPluginFromNpmSpecMock.mockReset();
    resolveBundledPluginSourcesMock.mockReset();
  });

  it("skips integrity drift checks for unpinned npm specs during dry-run updates", async () => {
    installPluginFromNpmSpecMock.mockResolvedValue({
      ok: true,
      pluginId: "opik-ironcliw",
      targetDir: "/tmp/opik-ironcliw",
      version: "0.2.6",
      extensions: ["index.ts"],
    });

    const { updateNpmInstalledPlugins } = await import("./update.js");
    await updateNpmInstalledPlugins({
      config: {
        plugins: {
          installs: {
            "opik-ironcliw": {
              source: "npm",
              spec: "@opik/opik-ironcliw",
              integrity: "sha512-old",
              installPath: "/tmp/opik-ironcliw",
            },
          },
        },
      },
      pluginIds: ["opik-ironcliw"],
      dryRun: true,
    });

    expect(installPluginFromNpmSpecMock).toHaveBeenCalledWith(
      expect.objectContaining({
        spec: "@opik/opik-ironcliw",
        expectedIntegrity: undefined,
      }),
    );
  });

  it("keeps integrity drift checks for exact-version npm specs during dry-run updates", async () => {
    installPluginFromNpmSpecMock.mockResolvedValue({
      ok: true,
      pluginId: "opik-ironcliw",
      targetDir: "/tmp/opik-ironcliw",
      version: "0.2.6",
      extensions: ["index.ts"],
    });

    const { updateNpmInstalledPlugins } = await import("./update.js");
    await updateNpmInstalledPlugins({
      config: {
        plugins: {
          installs: {
            "opik-ironcliw": {
              source: "npm",
              spec: "@opik/opik-ironcliw@0.2.5",
              integrity: "sha512-old",
              installPath: "/tmp/opik-ironcliw",
            },
          },
        },
      },
      pluginIds: ["opik-ironcliw"],
      dryRun: true,
    });

    expect(installPluginFromNpmSpecMock).toHaveBeenCalledWith(
      expect.objectContaining({
        spec: "@opik/opik-ironcliw@0.2.5",
        expectedIntegrity: "sha512-old",
      }),
    );
  });

  it("formats package-not-found updates with a stable message", async () => {
    installPluginFromNpmSpecMock.mockResolvedValue({
      ok: false,
      code: "npm_package_not_found",
      error: "Package not found on npm: @ironcliw/missing.",
    });

    const { updateNpmInstalledPlugins } = await import("./update.js");
    const result = await updateNpmInstalledPlugins({
      config: {
        plugins: {
          installs: {
            missing: {
              source: "npm",
              spec: "@ironcliw/missing",
              installPath: "/tmp/missing",
            },
          },
        },
      },
      pluginIds: ["missing"],
      dryRun: true,
    });

    expect(result.outcomes).toEqual([
      {
        pluginId: "missing",
        status: "error",
        message: "Failed to check missing: npm package not found for @ironcliw/missing.",
      },
    ]);
  });

  it("falls back to raw installer error for unknown error codes", async () => {
    installPluginFromNpmSpecMock.mockResolvedValue({
      ok: false,
      code: "invalid_npm_spec",
      error: "unsupported npm spec: github:evil/evil",
    });

    const { updateNpmInstalledPlugins } = await import("./update.js");
    const result = await updateNpmInstalledPlugins({
      config: {
        plugins: {
          installs: {
            bad: {
              source: "npm",
              spec: "github:evil/evil",
              installPath: "/tmp/bad",
            },
          },
        },
      },
      pluginIds: ["bad"],
      dryRun: true,
    });

    expect(result.outcomes).toEqual([
      {
        pluginId: "bad",
        status: "error",
        message: "Failed to check bad: unsupported npm spec: github:evil/evil",
      },
    ]);
  });
});

describe("syncPluginsForUpdateChannel", () => {
  beforeEach(() => {
    installPluginFromNpmSpecMock.mockReset();
    resolveBundledPluginSourcesMock.mockReset();
  });

  it("keeps bundled path installs on beta without reinstalling from npm", async () => {
    resolveBundledPluginSourcesMock.mockReturnValue(
      new Map([
        [
          "feishu",
          {
            pluginId: "feishu",
            localPath: "/app/extensions/feishu",
            npmSpec: "@ironcliw/feishu",
          },
        ],
      ]),
    );

    const { syncPluginsForUpdateChannel } = await import("./update.js");
    const result = await syncPluginsForUpdateChannel({
      channel: "beta",
      config: {
        plugins: {
          load: { paths: ["/app/extensions/feishu"] },
          installs: {
            feishu: {
              source: "path",
              sourcePath: "/app/extensions/feishu",
              installPath: "/app/extensions/feishu",
              spec: "@ironcliw/feishu",
            },
          },
        },
      },
    });

    expect(installPluginFromNpmSpecMock).not.toHaveBeenCalled();
    expect(result.changed).toBe(false);
    expect(result.summary.switchedToNpm).toEqual([]);
    expect(result.config.plugins?.load?.paths).toEqual(["/app/extensions/feishu"]);
    expect(result.config.plugins?.installs?.feishu?.source).toBe("path");
  });

  it("repairs bundled install metadata when the load path is re-added", async () => {
    resolveBundledPluginSourcesMock.mockReturnValue(
      new Map([
        [
          "feishu",
          {
            pluginId: "feishu",
            localPath: "/app/extensions/feishu",
            npmSpec: "@ironcliw/feishu",
          },
        ],
      ]),
    );

    const { syncPluginsForUpdateChannel } = await import("./update.js");
    const result = await syncPluginsForUpdateChannel({
      channel: "beta",
      config: {
        plugins: {
          load: { paths: [] },
          installs: {
            feishu: {
              source: "path",
              sourcePath: "/app/extensions/feishu",
              installPath: "/tmp/old-feishu",
              spec: "@ironcliw/feishu",
            },
          },
        },
      },
    });

    expect(result.changed).toBe(true);
    expect(result.config.plugins?.load?.paths).toEqual(["/app/extensions/feishu"]);
    expect(result.config.plugins?.installs?.feishu).toMatchObject({
      source: "path",
      sourcePath: "/app/extensions/feishu",
      installPath: "/app/extensions/feishu",
      spec: "@ironcliw/feishu",
    });
    expect(installPluginFromNpmSpecMock).not.toHaveBeenCalled();
  });
});
