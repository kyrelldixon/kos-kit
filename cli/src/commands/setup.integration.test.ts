import { describe, expect, test } from "bun:test";
import { join } from "node:path";

describe("kos setup --dry-run", () => {
  test("prints all planned steps without executing them", async () => {
    const repoRoot = join(import.meta.dir, "..", "..", "..");

    const proc = Bun.spawn(
      ["bun", join(repoRoot, "cli/src/index.ts"), "setup", "--dry-run"],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    const stdout = await new Response(proc.stdout).text();
    const exit = await proc.exited;

    expect(exit).toBe(0);
    expect(stdout).toContain("dry-run mode");
    expect(stdout).toContain("pull");
    expect(stdout).toContain("mise");
    expect(stdout).toContain("kit");
    expect(stdout).toContain("link");
    expect(stdout).toContain("dry-run — skipped");
    expect(stdout).toContain("Done.");
  });
});
