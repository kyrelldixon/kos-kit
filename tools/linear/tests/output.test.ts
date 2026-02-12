import { describe, expect, test } from "bun:test";
import { formatIssue, formatLabel, formatList } from "../src/lib/output";

describe("output formatting", () => {
	test("formatIssue returns human-readable string", () => {
		const issue = {
			id: "abc123",
			identifier: "PER-1",
			title: "Test issue",
			state: { name: "Backlog" },
			url: "https://linear.app/test/issue/PER-1",
		};

		const result = formatIssue(issue);

		expect(result).toContain("PER-1");
		expect(result).toContain("Test issue");
		expect(result).toContain("Backlog");
	});

	test("formatIssue with json flag returns JSON", () => {
		const issue = {
			id: "abc123",
			identifier: "PER-1",
			title: "Test issue",
			state: { name: "Backlog" },
			url: "https://linear.app/test/issue/PER-1",
		};

		const result = formatIssue(issue, { json: true });

		expect(() => JSON.parse(result)).not.toThrow();
		const parsed = JSON.parse(result);
		expect(parsed.identifier).toBe("PER-1");
	});

	test("formatIssue shows priority when set", () => {
		const issue = {
			id: "abc123",
			identifier: "PER-1",
			title: "Test issue",
			state: { name: "Backlog" },
			url: "https://linear.app/test/issue/PER-1",
			priority: 2,
			priorityLabel: "High",
		};

		const result = formatIssue(issue);
		expect(result).toContain("Priority: High");
	});

	test("formatIssue shows cycle when set", () => {
		const issue = {
			id: "abc123",
			identifier: "PER-1",
			title: "Test issue",
			state: { name: "In Progress" },
			url: "https://linear.app/test/issue/PER-1",
			cycle: { name: "Week 6", number: 6 },
		};

		const result = formatIssue(issue);
		expect(result).toContain("Cycle: Week 6");
	});

	test("formatIssue shows due date when set", () => {
		const issue = {
			id: "abc123",
			identifier: "PER-1",
			title: "Test issue",
			state: { name: "Backlog" },
			url: "https://linear.app/test/issue/PER-1",
			dueDate: "2026-03-15",
		};

		const result = formatIssue(issue);
		expect(result).toContain("Due:");
	});

	test("formatIssue shows labels when set", () => {
		const issue = {
			id: "abc123",
			identifier: "PER-1",
			title: "Test issue",
			state: { name: "Backlog" },
			url: "https://linear.app/test/issue/PER-1",
			labels: [{ name: "bug" }, { name: "urgent" }],
		};

		const result = formatIssue(issue);
		expect(result).toContain("Labels: bug, urgent");
	});

	test("formatIssue shows relations section", () => {
		const issue = {
			id: "abc123",
			identifier: "PER-1",
			title: "Test issue",
			state: { name: "Backlog" },
			url: "https://linear.app/test/issue/PER-1",
			relations: {
				blocks: [{ identifier: "PER-2", title: "Other issue" }],
				blockedBy: [],
				relatesTo: [{ identifier: "PER-3", title: "Related issue" }],
				duplicateOf: [],
			},
		};

		const result = formatIssue(issue);
		expect(result).toContain("Relations:");
		expect(result).toContain("Blocks: PER-2 (Other issue)");
		expect(result).toContain("Relates to: PER-3 (Related issue)");
	});

	test("formatIssue JSON includes new fields", () => {
		const issue = {
			id: "abc123",
			identifier: "PER-1",
			title: "Test issue",
			state: { name: "Backlog" },
			url: "https://linear.app/test/issue/PER-1",
			priority: 2,
			priorityLabel: "High",
			dueDate: "2026-03-15",
			cycle: { name: "Week 6", number: 6 },
			labels: [{ name: "bug" }],
		};

		const result = formatIssue(issue, { json: true });
		const parsed = JSON.parse(result);
		expect(parsed.priority).toBe(2);
		expect(parsed.priorityLabel).toBe("High");
		expect(parsed.dueDate).toBe("2026-03-15");
		expect(parsed.cycle.name).toBe("Week 6");
		expect(parsed.labels[0].name).toBe("bug");
	});

	test("formatLabel shows name and color", () => {
		const label = { id: "l1", name: "bug", color: "#FF0000" };
		const result = formatLabel(label);
		expect(result).toContain("bug");
		expect(result).toContain("#FF0000");
	});

	test("formatLabel JSON output", () => {
		const label = { id: "l1", name: "bug", color: "#FF0000" };
		const result = formatLabel(label, { json: true });
		const parsed = JSON.parse(result);
		expect(parsed.name).toBe("bug");
	});

	test("formatList formats array of items", () => {
		const items = [
			{ identifier: "PER-1", title: "First" },
			{ identifier: "PER-2", title: "Second" },
		];

		const result = formatList(
			items,
			(item) => `${item.identifier}: ${item.title}`,
		);

		expect(result).toContain("PER-1: First");
		expect(result).toContain("PER-2: Second");
	});
});
