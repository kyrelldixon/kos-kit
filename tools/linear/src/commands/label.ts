import { defineCommand } from "citty";
import { globalConfig } from "../lib/context";
import { getLinearClient } from "../lib/linear";
import { formatLabel, formatList } from "../lib/output";
import { resolveTeamId } from "../lib/resolvers";

const create = defineCommand({
	meta: {
		name: "create",
		description: "Create a new label",
	},
	args: {
		name: {
			type: "positional",
			description: "Label name",
			required: true,
		},
		team: {
			type: "string",
			description: "Team ID or key",
			alias: "t",
		},
		color: {
			type: "string",
			description: "Label color (hex code, e.g. #FF5733)",
		},
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	async run({ args }) {
		const client = getLinearClient();

		const teamKey = args.team ?? globalConfig?.default_team;
		if (!teamKey) {
			throw new Error(
				"Team is required. Use --team or set default_team in config.",
			);
		}
		const teamId = await resolveTeamId(client, teamKey);

		const payload: { name: string; teamId: string; color?: string } = {
			name: args.name,
			teamId,
		};

		if (args.color) {
			payload.color = args.color;
		}

		const result = await client.createIssueLabel(payload);
		const label = await result.issueLabel;

		if (!label) throw new Error("Failed to create label");

		const labelData = {
			id: label.id,
			name: label.name,
			color: label.color,
		};

		console.log(formatLabel(labelData, { json: args.json }));
	},
});

const list = defineCommand({
	meta: {
		name: "list",
		description: "List labels",
	},
	args: {
		team: {
			type: "string",
			description: "Filter by team ID or key",
			alias: "t",
		},
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	async run({ args }) {
		const client = getLinearClient();

		const teamKey = args.team ?? globalConfig?.default_team;
		if (!teamKey) {
			throw new Error(
				"Team is required. Use --team or set default_team in config.",
			);
		}
		const teamId = await resolveTeamId(client, teamKey);
		const team = await client.team(teamId);
		const labels = await team.labels();

		const labelList = labels.nodes.map((label) => ({
			id: label.id,
			name: label.name,
			color: label.color,
		}));

		const output = formatList(labelList, (label) => formatLabel(label), {
			json: args.json,
		});

		console.log(output);
	},
});

export const labelCommand = defineCommand({
	meta: {
		name: "label",
		description: "Manage Linear labels",
	},
	subCommands: {
		create,
		list,
	},
});
