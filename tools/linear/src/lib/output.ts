export interface OutputOptions {
	json?: boolean;
	showComments?: boolean;
}

export interface IssueComment {
	id: string;
	body: string;
	createdAt: string;
	user: { name: string } | null;
}

export interface IssueData {
	id: string;
	identifier: string;
	title: string;
	state: { name: string };
	url: string;
	description?: string;
	project?: { name: string } | null;
	comments?: IssueComment[];
	priority?: number;
	priorityLabel?: string;
	dueDate?: string | null;
	cycle?: { name: string; number: number } | null;
	labels?: Array<{ name: string; color?: string }>;
	relations?: {
		blocks: Array<{ identifier: string; title: string }>;
		blockedBy: Array<{ identifier: string; title: string }>;
		relatesTo: Array<{ identifier: string; title: string }>;
		duplicateOf: Array<{ identifier: string; title: string }>;
	};
}

export interface ProjectData {
	id: string;
	name: string;
	state: string;
	url: string;
	description?: string;
}

export interface SyncResultData {
	teams: { id: string; name: string; key: string }[];
	synced_at: string;
	config_updated?: boolean;
	new_default_team?: string;
}

export interface CommentData {
	id: string;
	body: string;
	createdAt: string;
	user: { name: string } | null;
	issueIdentifier: string;
}

export function formatIssue(
	issue: IssueData,
	options: OutputOptions = {},
): string {
	if (options.json) {
		return JSON.stringify(issue, null, 2);
	}

	const lines = [
		`${issue.identifier}: ${issue.title} [${issue.state.name}]`,
		`  URL: ${issue.url}`,
	];

	if (issue.project) {
		lines.push(`  Project: ${issue.project.name}`);
	}

	if (issue.priorityLabel && issue.priority && issue.priority > 0) {
		lines.push(`  Priority: ${issue.priorityLabel}`);
	}

	if (issue.cycle) {
		lines.push(`  Cycle: ${issue.cycle.name}`);
	}

	if (issue.dueDate) {
		lines.push(`  Due: ${issue.dueDate}`);
	}

	if (issue.labels && issue.labels.length > 0) {
		lines.push(`  Labels: ${issue.labels.map((l) => l.name).join(", ")}`);
	}

	if (issue.description) {
		lines.push(`  Description: ${issue.description}`);
	}

	if (issue.relations) {
		const { blocks, blockedBy, relatesTo, duplicateOf } = issue.relations;
		const hasRelations =
			blocks.length + blockedBy.length + relatesTo.length + duplicateOf.length >
			0;

		if (hasRelations) {
			lines.push("");
			lines.push("  Relations:");
			lines.push(`  ${"─".repeat(40)}`);
			for (const rel of blocks) {
				lines.push(`  Blocks: ${rel.identifier} (${rel.title})`);
			}
			for (const rel of blockedBy) {
				lines.push(`  Blocked by: ${rel.identifier} (${rel.title})`);
			}
			for (const rel of relatesTo) {
				lines.push(`  Relates to: ${rel.identifier} (${rel.title})`);
			}
			for (const rel of duplicateOf) {
				lines.push(`  Duplicate of: ${rel.identifier} (${rel.title})`);
			}
		}
	}

	if (options.showComments && issue.comments && issue.comments.length > 0) {
		lines.push("");
		lines.push(`  Comments (${issue.comments.length}):`);
		lines.push(`  ${"─".repeat(40)}`);
		for (const comment of issue.comments) {
			const date = new Date(comment.createdAt).toLocaleDateString("en-US", {
				month: "2-digit",
				day: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
			const author = comment.user?.name ?? "Unknown";
			lines.push(`  [${date}] ${author}:`);
			lines.push(`    ${comment.body.split("\n").join("\n    ")}`);
			lines.push("");
		}
	}

	return lines.join("\n");
}

export function formatProject(
	project: ProjectData,
	options: OutputOptions = {},
): string {
	if (options.json) {
		return JSON.stringify(project, null, 2);
	}

	return [
		`${project.name}`,
		`  State: ${project.state}`,
		`  URL: ${project.url}`,
	].join("\n");
}

export function formatList<T>(
	items: T[],
	formatter: (item: T) => string,
	options: OutputOptions = {},
): string {
	if (options.json) {
		return JSON.stringify(items, null, 2);
	}

	if (items.length === 0) {
		return "No items found.";
	}

	return items.map(formatter).join("\n\n");
}

export function formatSyncResult(
	result: SyncResultData,
	options: OutputOptions = {},
): string {
	if (options.json) {
		return JSON.stringify(result, null, 2);
	}

	const lines = [`Synced ${result.teams.length} team(s)`];

	for (const team of result.teams) {
		lines.push(`  ${team.key}: ${team.name}`);
	}

	if (result.config_updated && result.new_default_team) {
		lines.push("");
		lines.push(
			`Config updated: default_team set to "${result.new_default_team}"`,
		);
	}

	return lines.join("\n");
}

export function formatComment(
	comment: CommentData,
	options: OutputOptions = {},
): string {
	if (options.json) {
		return JSON.stringify(comment, null, 2);
	}

	const author = comment.user?.name ?? "Unknown";
	return [
		`Comment added to ${comment.issueIdentifier}`,
		`  Author: ${author}`,
		`  Created: ${comment.createdAt}`,
		"",
		comment.body,
	].join("\n");
}

export interface LabelDisplayData {
	id: string;
	name: string;
	color?: string;
}

export function formatLabel(
	label: LabelDisplayData,
	options: OutputOptions = {},
): string {
	if (options.json) {
		return JSON.stringify(label, null, 2);
	}
	const colorSuffix = label.color ? ` [${label.color}]` : "";
	return `${label.name}${colorSuffix}`;
}
