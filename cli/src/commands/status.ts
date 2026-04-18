import { defineCommand } from "citty";
import {
  type OsName,
  checkInstalled,
  loadKit,
  loadMise,
} from "../lib/manifest";

function currentOs(): OsName {
  if (process.platform === "darwin") return "darwin";
  if (process.platform === "linux") return "linux";
  throw new Error(`Unsupported platform: ${process.platform}`);
}

export const statusCommand = defineCommand({
  meta: {
    name: "status",
    description: "Fast health check — show installed tool count",
  },
  async run() {
    const os = currentOs();
    const kit = loadKit(os);
    const mise = loadMise();

    const kitResults = await Promise.all(
      kit.map((e) => checkInstalled(e.check)),
    );
    const miseResults = await Promise.all(
      mise.map((m) => checkInstalled(`command -v ${m.name}`)),
    );

    const installed =
      kitResults.filter(Boolean).length + miseResults.filter(Boolean).length;
    const total = kit.length + mise.length;

    const defaultKitInstalled = kit.filter(
      (e, i) => e.default && kitResults[i],
    ).length;
    const defaultKitTotal = kit.filter((e) => e.default).length;
    const defaultInstalled =
      defaultKitInstalled + miseResults.filter(Boolean).length;
    const defaultTotal = defaultKitTotal + mise.length;

    console.log(
      `kos: ${installed}/${total} tools installed (${defaultInstalled}/${defaultTotal} default)`,
    );
  },
});
