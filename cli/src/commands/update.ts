import { defineCommand } from "citty";

export const updateCommand = defineCommand({
  meta: {
    name: "update",
    description: "(deprecated) use `kos setup` instead",
  },
  async run({ rawArgs }) {
    console.warn(
      "[deprecated] `kos update` is now `kos setup`. Running `kos setup` for you...\n",
    );
    const kosBin = new URL("../index.ts", import.meta.url).pathname;
    const proc = Bun.spawn(["bun", kosBin, "setup", ...rawArgs], {
      stdio: ["inherit", "inherit", "inherit"],
    });
    process.exit(await proc.exited);
  },
});
