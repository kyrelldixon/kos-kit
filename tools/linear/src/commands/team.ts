import { defineCommand } from "citty";
import { getCachedTeams } from "../lib/cache";
import { globalConfig } from "../lib/context";
import { formatList } from "../lib/output";

const list = defineCommand({
	meta: {
		name: "list",
		description: "List cached teams",
	},
	args: {
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	async run({ args }) {
		const teams = await getCachedTeams();

		if (teams.length === 0) {
			console.log("No teams cached. Run 'linear sync' first.");
			return;
		}

		const defaultTeam = globalConfig?.default_team?.toLowerCase();

		const output = formatList(
			teams,
			(team) => {
				const isDefault = team.key.toLowerCase() === defaultTeam;
				const marker = isDefault ? " (default)" : "";
				return `${team.key}: ${team.name}${marker}`;
			},
			{ json: args.json },
		);

		console.log(output);
	},
});

export const teamCommand = defineCommand({
	meta: {
		name: "team",
		description: "Manage Linear teams",
	},
	subCommands: {
		list,
	},
});
