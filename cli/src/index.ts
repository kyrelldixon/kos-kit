#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";
import { authCommand } from "./commands/auth";
import { cheatsheetCommand } from "./commands/cheatsheet";
import { doctorCommand } from "./commands/doctor";
import { onboardCommand } from "./commands/onboard";
import { setupCommand } from "./commands/setup";
import { statusCommand } from "./commands/status";
import { updateCommand } from "./commands/update";

const main = defineCommand({
	meta: {
		name: "kos",
		description: "kos-kit — dev environment CLI",
		version: "0.1.0",
	},
	subCommands: {
		doctor: doctorCommand,
		setup: setupCommand,
		auth: authCommand,
		onboard: onboardCommand,
		cheatsheet: cheatsheetCommand,
		status: statusCommand,
		update: updateCommand,
	},
});

runMain(main);
