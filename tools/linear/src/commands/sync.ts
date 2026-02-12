import { defineCommand } from "citty";
import { findTeamByKey, saveCache } from "../lib/cache";
import { loadConfig, saveConfig } from "../lib/config";
import { globalConfig } from "../lib/context";
import { getLinearClient } from "../lib/linear";
import { formatSyncResult } from "../lib/output";
import type { Cache, Team, WorkflowState } from "../types";

export const syncCommand = defineCommand({
	meta: {
		name: "sync",
		description: "Sync teams from Linear and update cache",
	},
	args: {
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	async run({ args }) {
		const client = getLinearClient();

		// Fetch teams from Linear
		const teamsResult = await client.teams();
		const teams: Team[] = teamsResult.nodes.map((t) => ({
			id: t.id,
			name: t.name,
			key: t.key,
		}));

		// Fetch statuses for each team
		const statuses: Record<string, WorkflowState[]> = {};
		for (const team of teamsResult.nodes) {
			const states = await team.states();
			statuses[team.key] = states.nodes.map((s) => ({
				id: s.id,
				name: s.name,
				type: s.type,
			}));
		}

		// Save to cache
		const cache: Cache = {
			teams,
			statuses,
			synced_at: new Date().toISOString(),
		};
		await saveCache(cache);

		// Check if default_team in config is valid
		let configUpdated = false;
		let newDefaultTeam: string | undefined;

		if (globalConfig) {
			const currentDefault = globalConfig.default_team;
			const teamExists = findTeamByKey(teams, currentDefault);

			if (!teamExists && teams.length > 0) {
				// Invalid default_team, update to first available team
				const firstTeam = teams[0];
				const updatedConfig = {
					...globalConfig,
					default_team: firstTeam.key,
				};
				await saveConfig(updatedConfig);
				configUpdated = true;
				newDefaultTeam = firstTeam.key;
			}
		}

		const result = {
			teams,
			synced_at: cache.synced_at,
			config_updated: configUpdated,
			new_default_team: newDefaultTeam,
		};

		console.log(formatSyncResult(result, { json: args.json }));
	},
});
