# Plugin Development Guide

IronCliw supports extending its core functionality via Plugins.

## Creating a Plugin

Create a `.ts` file in the `plugins/` directory:

```typescript
import { IronCliwPlugin } from "../src/plugins/plugin-manager";

const myPlugin: IronCliwPlugin = {
  name: "MyCustomPlugin",
  version: "1.0.0",
  onInit: async () => {
    console.log("Plugin initialized!");
  },
  onCommand: async (command) => {
    if (command === "hello-plugin") {
      return "Hello from MyCustomPlugin!";
    }
    return null;
  }
};

export default myPlugin;
```
