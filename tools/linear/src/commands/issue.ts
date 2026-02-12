import type { Issue } from "@linear/sdk";
import { defineCommand } from "citty";
import { findStatusByName, getCachedStatuses } from "../lib/cache";
import { globalConfig } from "../lib/context";
import { getLinearClient } from "../lib/linear";
import { formatComment, formatIssue, formatList } from "../lib/output";
import {
	findIssue,
	parseDueDate,
	parsePriority,
	resolveCycle,
	resolveLabels,
	resolveStateId,
	resolveTeamId,
} from "../lib/resolvers";

const create = defineCommand({
	meta: {
		name: "create",
		description: "Create a new issue",
	},
	args: {
		title: {
			type: "positional",
			description: "Issue title",
			required: true,
		},
		team: {
			type: "string",
			description: "Team ID or key",
			alias: "t",
		},
		project: {
			type: "string",
			description: "Project ID to add issue to",
			alias: "p",
		},
		parent: {
			type: "string",
			description: "Parent issue ID (creates sub-issue)",
		},
		description: {
			type: "string",
			description: "Issue description",
			alias: "d",
		},
		status: {
			type: "string",
			description: "Issue status (default: Backlog)",
			alias: "s",
		},
		cycle: {
			type: "string",
			description: "Cycle (current, next, previous, none, or cycle ID)",
			alias: "c",
		},
		"due-date": {
			type: "string",
			description: "Due date (today, tomorrow, or YYYY-MM-DD)",
		},
		priority: {
			type: "string",
			description: "Priority (none, urgent, high, medium, low)",
		},
		label: {
			type: "string",
			description: "Label name(s), comma-separated for multiple",
			alias: "l",
		},
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	async run({ args }) {
		const client = getLinearClient();

		// Get team ID - use provided or default from config
		const teamKey = args.team ?? globalConfig?.default_team;
		if (!teamKey) {
			throw new Error(
				"Team is required. Use --team or set default_team in config.",
			);
		}
		const teamId = await resolveTeamId(client, teamKey);

		// Auto-assign to authenticated user
		const viewer = await client.viewer;

		const issuePayload: {
			title: string;
			teamId: string;
			assigneeId?: string;
			description?: string;
			projectId?: string;
			parentId?: string;
			cycleId?: string;
			dueDate?: string;
			priority?: number;
			labelIds?: string[];
		} = {
			title: args.title,
			teamId,
			assigneeId: viewer.id,
		};

		if (args.description) {
			issuePayload.description = args.description;
		}

		if (args.project) {
			issuePayload.projectId = args.project;
		}

		if (args.parent) {
			issuePayload.parentId = args.parent;
		}

		if (args.cycle) {
			const cycleId = await resolveCycle(client, teamId, args.cycle);
			if (cycleId) {
				issuePayload.cycleId = cycleId;
			}
		}

		if (args["due-date"]) {
			issuePayload.dueDate = parseDueDate(args["due-date"]);
		}

		if (args.priority) {
			issuePayload.priority = parsePriority(args.priority);
		}

		if (args.label) {
			const labelNames = args.label.split(",").map((s: string) => s.trim());
			const labelIds = await resolveLabels(client, teamId, labelNames);
			issuePayload.labelIds = labelIds;
		}

		const issue = await client.createIssue(issuePayload);
		const created = await issue.issue;

		if (!created) {
			throw new Error("Failed to create issue");
		}

		const state = await created.state;
		const project = await created.project;
		const cycle = await created.cycle;
		const labels = await created.labels();

		const issueData = {
			id: created.id,
			identifier: created.identifier,
			title: created.title,
			state: { name: state?.name ?? "Unknown" },
			url: created.url,
			project: project ? { name: project.name } : null,
			priority: created.priority,
			priorityLabel: created.priorityLabel,
			dueDate: created.dueDate ?? null,
			cycle: cycle
				? { name: cycle.name ?? `Cycle ${cycle.number}`, number: cycle.number }
				: null,
			labels: labels.nodes.map((l) => ({ name: l.name, color: l.color })),
		};

		console.log(formatIssue(issueData, { json: args.json }));
	},
});

const list = defineCommand({
	meta: {
		name: "list",
		description: "List issues",
	},
	args: {
		team: {
			type: "string",
			description: "Filter by team ID or key",
			alias: "t",
		},
		project: {
			type: "string",
			description: "Filter by project ID",
			alias: "p",
		},
		status: {
			type: "string",
			description: "Filter by status",
			alias: "s",
		},
		cycle: {
			type: "string",
			description: "Filter by cycle (current, next, previous, or cycle ID)",
			alias: "c",
		},
		"due-date": {
			type: "string",
			description: "Filter by due date (today, tomorrow, or YYYY-MM-DD)",
		},
		priority: {
			type: "string",
			description: "Filter by priority (none, urgent, high, medium, low)",
		},
		label: {
			type: "string",
			description: "Filter by label name",
			alias: "l",
		},
		description: {
			type: "boolean",
			description: "Show issue descriptions",
			alias: "d",
			default: false,
		},
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	async run({ args }) {
		const client = getLinearClient();

		const filter: Record<string, unknown> = {};

		if (args.team) {
			filter.team = { key: { eq: args.team.toUpperCase() } };
		}

		if (args.project) {
			filter.project = { id: { eq: args.project } };
		}

		if (args.status) {
			filter.state = { name: { eq: args.status } };
		}

		if (args.cycle) {
			const teamKey = args.team ?? globalConfig?.default_team;
			if (!teamKey)
				throw new Error("Team required to filter by cycle. Use --team.");
			const teamId = await resolveTeamId(client, teamKey);
			const cycleId = await resolveCycle(client, teamId, args.cycle);
			if (cycleId) {
				filter.cycle = { id: { eq: cycleId } };
			}
		}

		if (args["due-date"]) {
			filter.dueDate = { eq: parseDueDate(args["due-date"]) };
		}

		if (args.priority) {
			filter.priority = { eq: parsePriority(args.priority) };
		}

		if (args.label) {
			filter.labels = { name: { containsIgnoreCase: args.label } };
		}

		const issues = await client.issues({ filter });

		const issueList = await Promise.all(
			issues.nodes.map(async (issue) => {
				const state = await issue.state;
				const project = await issue.project;
				const cycle = await issue.cycle;
				const labels = await issue.labels();
				return {
					id: issue.id,
					identifier: issue.identifier,
					title: issue.title,
					description: issue.description,
					state: { name: state?.name ?? "Unknown" },
					url: issue.url,
					project: project ? { name: project.name } : null,
					priority: issue.priority,
					priorityLabel: issue.priorityLabel,
					dueDate: issue.dueDate ?? null,
					cycle: cycle
						? {
								name: cycle.name ?? `Cycle ${cycle.number}`,
								number: cycle.number,
							}
						: null,
					labels: labels.nodes.map((l) => ({ name: l.name, color: l.color })),
				};
			}),
		);

		const priorityMap: Record<number, string> = {
			1: "!!!",
			2: "!!",
			3: "!",
			4: "~",
		};

		const output = formatList(
			issueList,
			(issue) => {
				const priorityPart = issue.priority
					? ` ${priorityMap[issue.priority] ?? ""}`
					: "";
				const duePart = issue.dueDate ? ` due:${issue.dueDate}` : "";
				const cyclePart = issue.cycle ? ` [C${issue.cycle.number}]` : "";
				const labelPart = issue.labels?.length
					? ` [${issue.labels.map((l) => l.name).join(", ")}]`
					: "";
				const line = `${issue.identifier}: ${issue.title} [${issue.state.name}]${priorityPart}${duePart}${cyclePart}${labelPart}`;
				if (args.description && issue.description) {
					const truncated = issue.description.split("\n")[0].slice(0, 100);
					const suffix = issue.description.length > 100 ? "..." : "";
					return `${line}\n  ${truncated}${suffix}`;
				}
				return line;
			},
			{ json: args.json },
		);

		console.log(output);
	},
});

const show = defineCommand({
	meta: {
		name: "show",
		description: "Show issue details",
	},
	args: {
		id: {
			type: "positional",
			description: "Issue ID or identifier (e.g., KYR-21)",
			required: true,
		},
		comments: {
			type: "boolean",
			description: "Include comments",
			default: false,
		},
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	async run({ args }) {
		const client = getLinearClient();

		const issue = await findIssue(client, args.id);
		if (!issue) {
			throw new Error(`Issue not found: ${args.id}`);
		}

		const state = await issue.state;
		const project = await issue.project;
		const cycle = await issue.cycle;
		const labels = await issue.labels();
		const relations = await fetchIssueRelations(issue);

		// Fetch comments if requested
		let comments: Array<{
			id: string;
			body: string;
			createdAt: string;
			user: { name: string } | null;
		}> = [];

		if (args.comments) {
			const commentsResult = await issue.comments();
			comments = await Promise.all(
				commentsResult.nodes.map(async (c) => {
					const user = await c.user;
					return {
						id: c.id,
						body: c.body,
						createdAt: c.createdAt.toISOString(),
						user: user ? { name: user.name } : null,
					};
				}),
			);
		}

		const issueData = {
			id: issue.id,
			identifier: issue.identifier,
			title: issue.title,
			description: issue.description,
			state: { name: state?.name ?? "Unknown" },
			url: issue.url,
			project: project ? { name: project.name } : null,
			priority: issue.priority,
			priorityLabel: issue.priorityLabel,
			dueDate: issue.dueDate ?? null,
			cycle: cycle
				? { name: cycle.name ?? `Cycle ${cycle.number}`, number: cycle.number }
				: null,
			labels: labels.nodes.map((l) => ({ name: l.name, color: l.color })),
			relations,
			...(args.comments && { comments }),
		};

		console.log(
			formatIssue(issueData, { json: args.json, showComments: args.comments }),
		);
	},
});

const update = defineCommand({
	meta: {
		name: "update",
		description: "Update an existing issue",
	},
	args: {
		id: {
			type: "positional",
			description: "Issue ID or identifier (e.g., KYR-21)",
			required: true,
		},
		status: {
			type: "string",
			description: "Change workflow state",
			alias: "s",
		},
		title: {
			type: "string",
			description: "Update title",
			alias: "t",
		},
		description: {
			type: "string",
			description: "Update description",
			alias: "d",
		},
		project: {
			type: "string",
			description: "Move to project (ID)",
			alias: "p",
		},
		cycle: {
			type: "string",
			description: "Set cycle (current, next, previous, none, or cycle ID)",
			alias: "c",
		},
		"due-date": {
			type: "string",
			description: "Set due date (today, tomorrow, or YYYY-MM-DD)",
		},
		priority: {
			type: "string",
			description: "Set priority (none, urgent, high, medium, low)",
		},
		label: {
			type: "string",
			description: "Set label name(s), comma-separated for multiple",
			alias: "l",
		},
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	async run({ args }) {
		const client = getLinearClient();

		const issue = await findIssue(client, args.id);
		if (!issue) {
			throw new Error(`Issue not found: ${args.id}`);
		}

		const updatePayload: {
			stateId?: string;
			title?: string;
			description?: string;
			projectId?: string;
			cycleId?: string | null;
			dueDate?: string;
			priority?: number;
			labelIds?: string[];
		} = {};

		if (args.status) {
			const team = await issue.team;
			if (!team) {
				throw new Error("Issue has no associated team");
			}
			updatePayload.stateId = await resolveStateId(
				client,
				team.id,
				args.status,
			);
		}

		if (args.title) {
			updatePayload.title = args.title;
		}

		if (args.description) {
			updatePayload.description = args.description;
		}

		if (args.project) {
			updatePayload.projectId = args.project;
		}

		if (args.cycle) {
			const team = await issue.team;
			if (!team) throw new Error("Issue has no associated team");
			const cycleId = await resolveCycle(client, team.id, args.cycle);
			updatePayload.cycleId = cycleId;
		}

		if (args["due-date"]) {
			updatePayload.dueDate = parseDueDate(args["due-date"]);
		}

		if (args.priority) {
			updatePayload.priority = parsePriority(args.priority);
		}

		if (args.label) {
			const team = await issue.team;
			if (!team) throw new Error("Issue has no associated team");
			const labelNames = args.label.split(",").map((s: string) => s.trim());
			const labelIds = await resolveLabels(client, team.id, labelNames);
			updatePayload.labelIds = labelIds;
		}

		if (Object.keys(updatePayload).length === 0) {
			throw new Error(
				"No updates specified. Use --status, --title, --description, --project, --cycle, --due-date, --priority, or --label.",
			);
		}

		await issue.update(updatePayload);

		// Fetch updated issue
		const updated = await findIssue(client, args.id);
		if (!updated) {
			throw new Error("Failed to fetch updated issue");
		}

		const state = await updated.state;
		const project = await updated.project;
		const cycle = await updated.cycle;
		const labels = await updated.labels();

		const issueData = {
			id: updated.id,
			identifier: updated.identifier,
			title: updated.title,
			description: updated.description,
			state: { name: state?.name ?? "Unknown" },
			url: updated.url,
			project: project ? { name: project.name } : null,
			priority: updated.priority,
			priorityLabel: updated.priorityLabel,
			dueDate: updated.dueDate ?? null,
			cycle: cycle
				? { name: cycle.name ?? `Cycle ${cycle.number}`, number: cycle.number }
				: null,
			labels: labels.nodes.map((l) => ({ name: l.name, color: l.color })),
		};

		console.log(formatIssue(issueData, { json: args.json }));
	},
});

const comment = defineCommand({
	meta: {
		name: "comment",
		description: "Add a comment to an issue",
	},
	args: {
		id: {
			type: "positional",
			description: "Issue ID or identifier (e.g., KYR-21)",
			required: true,
		},
		message: {
			type: "positional",
			description: "Comment message",
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

		const issue = await findIssue(client, args.id);
		if (!issue) {
			throw new Error(`Issue not found: ${args.id}`);
		}

		const result = await client.createComment({
			issueId: issue.id,
			body: args.message,
		});

		const created = await result.comment;
		if (!created) {
			throw new Error("Failed to create comment");
		}

		const user = await created.user;

		const commentData = {
			id: created.id,
			body: created.body,
			createdAt: created.createdAt.toISOString(),
			user: user ? { name: user.name } : null,
			issueIdentifier: issue.identifier,
		};

		console.log(formatComment(commentData, { json: args.json }));
	},
});

async function fetchIssueRelations(issue: Issue) {
	const [relations, inverseRelations] = await Promise.all([
		issue.relations(),
		issue.inverseRelations(),
	]);

	const blocks: Array<{ identifier: string; title: string }> = [];
	const blockedBy: Array<{ identifier: string; title: string }> = [];
	const relatesTo: Array<{ identifier: string; title: string }> = [];
	const duplicateOf: Array<{ identifier: string; title: string }> = [];

	for (const rel of relations.nodes) {
		const related = await rel.relatedIssue;
		if (!related) continue;
		const entry = { identifier: related.identifier, title: related.title };

		if (rel.type === "blocks") blocks.push(entry);
		else if (rel.type === "related") relatesTo.push(entry);
		else if (rel.type === "duplicate") duplicateOf.push(entry);
	}

	for (const rel of inverseRelations.nodes) {
		const related = await rel.issue;
		if (!related) continue;
		const entry = { identifier: related.identifier, title: related.title };

		if (rel.type === "blocks") blockedBy.push(entry);
		else if (rel.type === "related") relatesTo.push(entry);
	}

	return { blocks, blockedBy, relatesTo, duplicateOf };
}

const link = defineCommand({
	meta: {
		name: "link",
		description: "Create a relation between issues",
	},
	args: {
		id: {
			type: "positional",
			description: "Source issue ID or identifier",
			required: true,
		},
		target: {
			type: "positional",
			description: "Target issue ID or identifier",
			required: true,
		},
		blocks: {
			type: "boolean",
			description: "Source blocks target",
		},
		"blocked-by": {
			type: "boolean",
			description: "Source is blocked by target",
		},
		"relates-to": {
			type: "boolean",
			description: "Source relates to target",
		},
		"duplicate-of": {
			type: "boolean",
			description: "Source is duplicate of target",
		},
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	async run({ args }) {
		const client = getLinearClient();

		const issue = await findIssue(client, args.id);
		if (!issue) throw new Error(`Issue not found: ${args.id}`);

		const target = await findIssue(client, args.target);
		if (!target) throw new Error(`Target issue not found: ${args.target}`);

		// Determine relation type — exactly one must be specified
		const flags = [
			args.blocks,
			args["blocked-by"],
			args["relates-to"],
			args["duplicate-of"],
		];
		const flagCount = flags.filter(Boolean).length;
		if (flagCount !== 1) {
			throw new Error(
				"Specify exactly one relation type: --blocks, --blocked-by, --relates-to, or --duplicate-of",
			);
		}

		let displayType: string;

		// biome-ignore lint/suspicious/noExplicitAny: IssueRelationType enum not re-exported from @linear/sdk
		type RelationType = any;

		if (args["blocked-by"]) {
			// Reverse: target blocks source
			await client.createIssueRelation({
				issueId: target.id,
				relatedIssueId: issue.id,
				type: "blocks" as RelationType,
			});
			displayType = "is blocked by";
		} else {
			let relationType: string;
			if (args.blocks) {
				relationType = "blocks";
				displayType = "blocks";
			} else if (args["relates-to"]) {
				relationType = "related";
				displayType = "relates to";
			} else {
				relationType = "duplicate";
				displayType = "is duplicate of";
			}

			await client.createIssueRelation({
				issueId: issue.id,
				relatedIssueId: target.id,
				type: relationType as RelationType,
			});
		}

		const result = {
			source: issue.identifier,
			target: target.identifier,
			type: displayType,
			message: `${issue.identifier} ${displayType} ${target.identifier}`,
		};

		console.log(args.json ? JSON.stringify(result, null, 2) : result.message);
	},
});

const deleteIssue = defineCommand({
	meta: {
		name: "delete",
		description: "Delete an issue (moves to Canceled status)",
	},
	args: {
		id: {
			type: "positional",
			description: "Issue ID or identifier (e.g., KYR-21)",
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

		const issue = await findIssue(client, args.id);
		if (!issue) {
			throw new Error(`Issue not found: ${args.id}`);
		}

		const team = await issue.team;
		if (!team) {
			throw new Error("Issue has no associated team");
		}

		// Get cached statuses for this team
		const statuses = await getCachedStatuses(team.key);
		if (statuses.length === 0) {
			throw new Error(
				`No cached statuses for team ${team.key}. Run "linear sync" first.`,
			);
		}

		// Find Canceled status
		const canceledStatus = findStatusByName(statuses, "Canceled");
		if (!canceledStatus) {
			throw new Error(
				`No "Canceled" status found for team ${team.key}. Check workflow settings in Linear.`,
			);
		}

		// Check if already canceled
		const currentState = await issue.state;
		if (currentState?.name.toLowerCase() === "canceled") {
			const result = {
				identifier: issue.identifier,
				status: "already_canceled",
				message: `${issue.identifier} is already Canceled`,
			};
			console.log(args.json ? JSON.stringify(result, null, 2) : result.message);
			return;
		}

		// Update to Canceled
		await issue.update({ stateId: canceledStatus.id });

		const result = {
			identifier: issue.identifier,
			status: "canceled",
			message: `${issue.identifier} moved to Canceled`,
		};

		console.log(args.json ? JSON.stringify(result, null, 2) : result.message);
	},
});

export const issueCommand = defineCommand({
	meta: {
		name: "issue",
		description: "Manage Linear issues",
	},
	subCommands: {
		create,
		list,
		show,
		update,
		comment,
		link,
		delete: deleteIssue,
	},
});
