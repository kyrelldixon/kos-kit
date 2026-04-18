#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";
import { authCommand } from "./commands/auth";
import { captureCommand } from "./commands/capture";
import { cheatsheetCommand } from "./commands/cheatsheet";
import { configCommand } from "./commands/config";
import { doctorCommand } from "./commands/doctor";
import { jobsCommand } from "./commands/jobs";
import { onboardCommand } from "./commands/onboard";
import { setupCommand } from "./commands/setup";
import { statusCommand } from "./commands/status";
import { updateCommand } from "./commands/update";

const main = defineCommand({
  meta: {
    name: "kos",
    description: "kos-kit — dev environment CLI",
    version: "0.2.0",
  },
  subCommands: {
    setup: setupCommand,
    doctor: doctorCommand,
    update: updateCommand,
    auth: authCommand,
    onboard: onboardCommand,
    cheatsheet: cheatsheetCommand,
    status: statusCommand,
    jobs: jobsCommand,
    config: configCommand,
    capture: captureCommand,
  },
});

runMain(main);
