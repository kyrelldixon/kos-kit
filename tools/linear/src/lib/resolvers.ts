import type { Issue, LinearClient } from "@linear/sdk";

/**
 * Find an issue by identifier (e.g., KYR-21) or UUID
 */
export async function findIssue(
	client: LinearClient,
	id: string,
): Promise<Issue | null> {
	if (id.match(/^[A-Z]+-\d+$/i)) {
		const [teamKey, numberStr] = id.toUpperCase().split("-");
		const number = Number.parseInt(numberStr, 10);
		const issues = await client.issues({
			filter: {
				team: { key: { eq: teamKey } },
				number: { eq: number },
			},
		});
		return issues.nodes[0] ?? null;
	}
	return client.issue(id);
}

/**
 * Resolve a status name to a stateId for a given team
 */
export async function resolveStateId(
	client: LinearClient,
	teamId: string,
	statusName: string,
): Promise<string> {
	const team = await client.team(teamId);
	const states = await team.states();
	const state = states.nodes.find(
		(s) => s.name.toLowerCase() === statusName.toLowerCase(),
	);
	if (!state) {
		const availableStates = states.nodes.map((s) => s.name).join(", ");
		throw new Error(
			`Status "${statusName}" not found. Available: ${availableStates}`,
		);
	}
	return state.id;
}

/**
 * Resolve cycle input to a cycle ID. Always fetches fresh (no cache).
 * Values: current, next, previous, none, or UUID
 */
export async function resolveCycle(
	client: LinearClient,
	teamId: string,
	cycleInput: string,
): Promise<string | null> {
	if (cycleInput === "none") return null;

	if (cycleInput.match(/^[0-9a-f-]{36}$/i)) {
		return cycleInput;
	}

	const team = await client.team(teamId);
	const cycles = await team.cycles();
	const now = new Date();

	if (cycleInput === "current") {
		const current = cycles.nodes.find(
			(c) => new Date(c.startsAt) <= now && new Date(c.endsAt) >= now,
		);
		if (!current) {
			throw new Error("No active cycle found for this team.");
		}
		return current.id;
	}

	if (cycleInput === "next") {
		const future = cycles.nodes
			.filter((c) => new Date(c.startsAt) > now)
			.sort(
				(a, b) =>
					new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
			);
		if (future.length === 0) {
			throw new Error("No upcoming cycle found for this team.");
		}
		return future[0].id;
	}

	if (cycleInput === "previous") {
		const past = cycles.nodes
			.filter((c) => new Date(c.endsAt) < now)
			.sort(
				(a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime(),
			);
		if (past.length === 0) {
			throw new Error("No previous cycle found for this team.");
		}
		return past[0].id;
	}

	throw new Error(
		`Invalid cycle: "${cycleInput}". Use: current, next, previous, none, or a cycle UUID.`,
	);
}

/**
 * Parse due date input to YYYY-MM-DD string.
 * Values: today, tomorrow, or YYYY-MM-DD
 */
export function parseDueDate(input: string): string {
	if (input === "today") {
		return new Date().toISOString().split("T")[0];
	}
	if (input === "tomorrow") {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		return tomorrow.toISOString().split("T")[0];
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
		throw new Error(
			`Invalid date format: "${input}". Use: today, tomorrow, or YYYY-MM-DD.`,
		);
	}
	return input;
}

/**
 * Map priority name to Linear's numeric priority (0-4).
 * Values: none (0), urgent (1), high (2), medium (3), low (4)
 */
export function parsePriority(input: string): number {
	const map: Record<string, number> = {
		none: 0,
		urgent: 1,
		high: 2,
		medium: 3,
		low: 4,
	};
	const priority = map[input.toLowerCase()];
	if (priority === undefined) {
		throw new Error(
			`Invalid priority: "${input}". Use: none, urgent, high, medium, low.`,
		);
	}
	return priority;
}

/**
 * Resolve label names to label IDs for a given team.
 * Labels must already exist — throws if not found.
 */
export async function resolveLabels(
	client: LinearClient,
	teamId: string,
	labelNames: string[],
): Promise<string[]> {
	const team = await client.team(teamId);
	const teamLabels = await team.labels();

	const labelIds: string[] = [];
	for (const name of labelNames) {
		const label = teamLabels.nodes.find(
			(l) => l.name.toLowerCase() === name.toLowerCase(),
		);
		if (!label) {
			const available = teamLabels.nodes.map((l) => l.name).join(", ");
			throw new Error(`Label "${name}" not found. Available: ${available}`);
		}
		labelIds.push(label.id);
	}
	return labelIds;
}

/**
 * Resolve team key or UUID to team ID. Falls back to default team from config.
 */
export async function resolveTeamId(
	client: LinearClient,
	teamInput: string,
): Promise<string> {
	if (teamInput.match(/^[0-9a-f-]{36}$/i)) {
		return teamInput;
	}
	const teams = await client.teams();
	const team = teams.nodes.find(
		(t) => t.key.toLowerCase() === teamInput.toLowerCase(),
	);
	if (!team) {
		throw new Error(`Team not found: ${teamInput}`);
	}
	return team.id;
}
