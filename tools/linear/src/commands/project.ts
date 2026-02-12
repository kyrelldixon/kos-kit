import { defineCommand } from "citty";
import { z } from "zod";
import { globalConfig } from "../lib/context";
import { getLinearClient } from "../lib/linear";
import { formatList, formatProject } from "../lib/output";

const PROJECT_DESCRIPTION_MAX_LENGTH = 255;

const projectDescriptionSchema = z
	.string()
	.max(
		PROJECT_DESCRIPTION_MAX_LENGTH,
		`Project description must be ${PROJECT_DESCRIPTION_MAX_LENGTH} characters or less (Linear API limit). Use a short summary + vault link.`,
	);

const create = defineCommand({
	meta: {
		name: "create",
		description: "Create a new project",
	},
	args: {
		name: {
			type: "positional",
			description: "Project name",
			required: true,
		},
		team: {
			type: "string",
			description: "Team ID or key",
			alias: "t",
		},
		description: {
			type: "string",
			description: "Project description",
			alias: "d",
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

		let teamId = teamKey;
		if (!teamId.match(/^[0-9a-f-]{36}$/i)) {
			const teams = await client.teams();
			const team = teams.nodes.find(
				(t) => t.key.toLowerCase() === teamKey.toLowerCase(),
			);
			if (!team) {
				throw new Error(`Team not found: ${teamKey}`);
			}
			teamId = team.id;
		}

		const projectPayload: {
			name: string;
			teamIds: string[];
			description?: string;
		} = {
			name: args.name,
			teamIds: [teamId],
		};

		if (args.description) {
			const result = projectDescriptionSchema.safeParse(args.description);
			if (!result.success) {
				throw new Error(result.error.errors[0].message);
			}
			projectPayload.description = args.description;
		}

		const result = await client.createProject(projectPayload);
		const project = await result.project;

		if (!project) {
			throw new Error("Failed to create project");
		}

		const projectData = {
			id: project.id,
			name: project.name,
			state: project.state,
			url: project.url,
			description: project.description,
		};

		console.log(formatProject(projectData, { json: args.json }));
	},
});

const show = defineCommand({
	meta: {
		name: "show",
		description: "Show project details",
	},
	args: {
		id: {
			type: "positional",
			description: "Project ID",
			required: true,
		},
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	async run({ args }) {
		const client = getLinearClient();

		const project = await client.project(args.id);
		if (!project) {
			throw new Error(`Project not found: ${args.id}`);
		}

		const teams = await project.teams();
		const issues = await project.issues();

		const projectData = {
			id: project.id,
			name: project.name,
			state: project.state,
			url: project.url,
			description: project.description,
			teams: teams.nodes.map((t) => ({ key: t.key, name: t.name })),
			issueCount: issues.nodes.length,
		};

		if (args.json) {
			console.log(JSON.stringify(projectData, null, 2));
		} else {
			const lines = [
				project.name,
				`  State: ${project.state}`,
				`  URL: ${project.url}`,
			];

			if (project.description) {
				lines.push(`  Description: ${project.description}`);
			}

			if (teams.nodes.length > 0) {
				const teamNames = teams.nodes.map((t) => t.key).join(", ");
				lines.push(`  Teams: ${teamNames}`);
			}

			lines.push(`  Issues: ${issues.nodes.length}`);

			console.log(lines.join("\n"));
		}
	},
});

const list = defineCommand({
	meta: {
		name: "list",
		description: "List projects",
	},
	args: {
		team: {
			type: "string",
			description: "Filter by team ID or key",
			alias: "t",
		},
		status: {
			type: "string",
			description:
				"Filter by project state (backlog, planned, started, paused, completed, canceled)",
			alias: "s",
		},
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	async run({ args }) {
		const client = getLinearClient();

		const projects = await client.projects();

		let projectList = projects.nodes;

		// Filter by team if specified
		if (args.team) {
			const filteredProjects = await Promise.all(
				projectList.map(async (project) => {
					const teams = await project.teams();
					const hasTeam = teams.nodes.some(
						(t) =>
							t.key.toLowerCase() === args.team?.toLowerCase() ||
							t.id === args.team,
					);
					return hasTeam ? project : null;
				}),
			);
			projectList = filteredProjects.filter(
				(p) => p !== null,
			) as typeof projectList;
		}

		// Filter by status if specified
		if (args.status) {
			projectList = projectList.filter(
				(p) => p.state.toLowerCase() === args.status?.toLowerCase(),
			);
		}

		const formattedList = projectList.map((project) => ({
			id: project.id,
			name: project.name,
			state: project.state,
			url: project.url,
		}));

		const output = formatList(
			formattedList,
			(project) => `${project.name} [${project.state}]`,
			{ json: args.json },
		);

		console.log(output);
	},
});

const update = defineCommand({
	meta: {
		name: "update",
		description: "Update a project",
	},
	args: {
		id: {
			type: "positional",
			description: "Project ID",
			required: true,
		},
		name: {
			type: "string",
			description: "Update project name",
			alias: "n",
		},
		description: {
			type: "string",
			description: "Update project description (255 char limit)",
			alias: "d",
		},
		state: {
			type: "string",
			description:
				"Update project state (backlog, planned, started, paused, completed, canceled)",
			alias: "s",
		},
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	async run({ args }) {
		const client = getLinearClient();

		const project = await client.project(args.id);
		if (!project) {
			throw new Error(`Project not found: ${args.id}`);
		}

		const updatePayload: {
			name?: string;
			description?: string;
			state?: string;
		} = {};

		if (args.name) {
			updatePayload.name = args.name;
		}

		if (args.description) {
			const result = projectDescriptionSchema.safeParse(args.description);
			if (!result.success) {
				throw new Error(result.error.errors[0].message);
			}
			updatePayload.description = args.description;
		}

		if (args.state) {
			const validStates = [
				"backlog",
				"planned",
				"started",
				"paused",
				"completed",
				"canceled",
			];
			if (!validStates.includes(args.state.toLowerCase())) {
				throw new Error(
					`Invalid state "${args.state}". Valid states: ${validStates.join(", ")}`,
				);
			}
			updatePayload.state = args.state.toLowerCase();
		}

		if (Object.keys(updatePayload).length === 0) {
			throw new Error(
				"No updates specified. Use --name, --description, or --state.",
			);
		}

		await client.updateProject(project.id, updatePayload);

		// Fetch updated project
		const updated = await client.project(args.id);
		if (!updated) {
			throw new Error("Failed to fetch updated project");
		}

		const projectData = {
			id: updated.id,
			name: updated.name,
			state: updated.state,
			url: updated.url,
			description: updated.description,
		};

		console.log(formatProject(projectData, { json: args.json }));
	},
});

const deleteProject = defineCommand({
	meta: {
		name: "delete",
		description: "Delete a project (moves to canceled state)",
	},
	args: {
		id: {
			type: "positional",
			description: "Project ID",
			required: true,
		},
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	async run({ args }) {
		const client = getLinearClient();

		const project = await client.project(args.id);
		if (!project) {
			throw new Error(`Project not found: ${args.id}`);
		}

		// Check if already canceled
		if (project.state === "canceled") {
			const result = {
				id: project.id,
				name: project.name,
				status: "already_canceled",
				message: `${project.name} is already canceled`,
			};
			console.log(args.json ? JSON.stringify(result, null, 2) : result.message);
			return;
		}

		// Update to canceled
		await client.updateProject(project.id, { state: "canceled" });

		const result = {
			id: project.id,
			name: project.name,
			status: "canceled",
			message: `${project.name} moved to canceled`,
		};

		console.log(args.json ? JSON.stringify(result, null, 2) : result.message);
	},
});

export const projectCommand = defineCommand({
	meta: {
		name: "project",
		description: "Manage Linear projects",
	},
	subCommands: {
		create,
		list,
		show,
		update,
		delete: deleteProject,
	},
});
