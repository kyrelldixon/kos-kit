import { join } from "node:path";
import { defineCommand } from "citty";

export const installCommand = defineCommand({
  meta: {
    name: "install",
    description: "Run the kos-kit installer",
  },
  args: {
    yes: {
      type: "boolean",
      alias: "y",
      description: "Non-interactive (install all defaults)",
      default: false,
    },
  },
  async run({ args }) {
    const kosDir = join(process.env.HOME || "", ".kos-kit");

    const installArgs = ["bash", join(kosDir, "install.sh")];
    if (args.yes) installArgs.push("--yes");

    const install = Bun.spawn(installArgs, {
      stdio: ["inherit", "inherit", "inherit"],
    });
    const code = await install.exited;
    process.exit(code);
  },
});
