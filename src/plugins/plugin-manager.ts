import fs from "node:fs/promises";
import path from "node:path";

export interface IronCliwPlugin {
  name: string;
  version: string;
  onInit?: () => Promise<void>;
  onCommand?: (command: string) => Promise<string | null>;
  onVisionAnalysis?: (result: unknown) => Promise<unknown>;
}

export class PluginManager {
  private pluginsDirectory: string;
  private loadedPlugins: Map<string, IronCliwPlugin> = new Map();

  constructor(pluginsDirectory = path.join(process.cwd(), "plugins")) {
    this.pluginsDirectory = pluginsDirectory;
  }

  public async discoverAndLoad() {
    await fs.mkdir(this.pluginsDirectory, { recursive: true });
    const files = await fs.readdir(this.pluginsDirectory);

    for (const file of files) {
      if (file.endsWith(".js") || file.endsWith(".ts")) {
        try {
          const pluginPath = path.join(this.pluginsDirectory, file);
          const imported = await import(`file://${pluginPath}`);

          if (imported.default && imported.default.name) {
            const plugin = imported.default as IronCliwPlugin;
            await this.registerPlugin(plugin);
          }
        } catch (err) {
          console.error(`[PluginManager] Failed to load plugin ${file}:`, err);
        }
      }
    }
  }

  public async registerPlugin(plugin: IronCliwPlugin) {
    if (this.loadedPlugins.has(plugin.name)) {
      console.warn(`[PluginManager] Plugin ${plugin.name} is already loaded. Skipping.`);
      return;
    }

    if (plugin.onInit) {
      await plugin.onInit();
    }

    this.loadedPlugins.set(plugin.name, plugin);
    console.log(`[PluginManager] Successfully loaded plugin: ${plugin.name} v${plugin.version}`);
  }

  public async hookCommand(command: string): Promise<string | null> {
    for (const plugin of this.loadedPlugins.values()) {
      if (plugin.onCommand) {
        const result = await plugin.onCommand(command);
        if (result) {
          return result;
        } // Plugin handled the command
      }
    }
    return null;
  }
}
