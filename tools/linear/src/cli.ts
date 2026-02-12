#!/usr/bin/env bun
import { homedir } from "node:os";
import { join } from "node:path";
import { defineCommand, runMain } from "citty";
import { authCommand } from "./commands/auth";
import { issueCommand } from "./commands/issue";
import { labelCommand } from "./commands/label";
import { projectCommand } from "./commands/project";
import { syncCommand } from "./commands/sync";
import { teamCommand } from "./commands/team";
import { loadConfig, loadEnv } from "./lib/config";
import { setGlobalConfig } from "./lib/context";
import { initLinearClient } from "./lib/linear";

const main = defineCommand({
	meta: {
		name: "linear",
		description: "CLI for interacting with Linear",
		version: "0.1.0",
	},
	async setup() {
		// Skip setup for auth and help (config may not exist yet)
		const isAuth = process.argv.includes("auth");
		const isHelp = process.argv.includes("--help") || process.argv.includes("-h");
		if (isAuth || isHelp) return;

		const configPath = join(homedir(), ".linear-cli", "config.json");
		const config = await loadConfig(configPath);
		setGlobalConfig(config);
		const env = await loadEnv(config.env_file);
		initLinearClient(env.LINEAR_API_KEY);
	},
	subCommands: {
		auth: authCommand,
		issue: issueCommand,
		label: labelCommand,
		project: projectCommand,
		sync: syncCommand,
		team: teamCommand,
	},
});

runMain(main);
