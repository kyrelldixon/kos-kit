import { z } from "zod";

export const ConfigSchema = z.object({
	default_team: z.string(),
	env_file: z.string(),
});

export type Config = z.infer<typeof ConfigSchema>;

export const TeamSchema = z.object({
	id: z.string(),
	name: z.string(),
	key: z.string(),
});

export type Team = z.infer<typeof TeamSchema>;

export const WorkflowStateSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
});

export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

export const CacheSchema = z.object({
	teams: z.array(TeamSchema),
	statuses: z.record(z.string(), z.array(WorkflowStateSchema)).optional(),
	synced_at: z.string(),
});

export type Cache = z.infer<typeof CacheSchema>;

export const LabelSchema = z.object({
	id: z.string(),
	name: z.string(),
	color: z.string().optional(),
});

export type Label = z.infer<typeof LabelSchema>;

export const CycleSchema = z.object({
	id: z.string(),
	name: z.string(),
	number: z.number(),
	startsAt: z.string().optional(),
	endsAt: z.string().optional(),
});

export type Cycle = z.infer<typeof CycleSchema>;
