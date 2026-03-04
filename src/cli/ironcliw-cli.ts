import type { Command } from "commander";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { registerQrCli } from "./qr-cli.js";

export function registerironcliwCli(program: Command) {
  const ironcliw = program
    .command("ironcliw")
    .description("Legacy ironcliw command aliases")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/ironcliw", "docs.Ironcliw.ai/cli/ironcliw")}\n`,
    );
  registerQrCli(ironcliw);
}


