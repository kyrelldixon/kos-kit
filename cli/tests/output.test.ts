import { describe, expect, test } from "bun:test";
import { type NextAction, error, success } from "../src/lib/output";

describe("output helpers", () => {
  test("success returns correct envelope", () => {
    const result = success("kos jobs list", [{ name: "test-job" }], []);
    expect(result).toEqual({
      ok: true,
      command: "kos jobs list",
      result: [{ name: "test-job" }],
      next_actions: [],
    });
  });

  test("success with next_actions", () => {
    const actions: NextAction[] = [
      {
        command: "kos jobs delete <name>",
        description: "Delete a job",
        params: { name: { enum: ["test-job"] } },
      },
    ];
    const result = success("kos jobs list", [], actions);
    expect(result.next_actions).toEqual(actions);
  });

  test("error returns correct envelope", () => {
    const result = error(
      "kos jobs create bad",
      "VALIDATION_ERROR",
      "Name invalid",
      "Use lowercase alphanumeric",
      [],
    );
    expect(result).toEqual({
      ok: false,
      command: "kos jobs create bad",
      error: { message: "Name invalid", code: "VALIDATION_ERROR" },
      fix: "Use lowercase alphanumeric",
      next_actions: [],
    });
  });
});
