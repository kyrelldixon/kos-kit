import type { Config } from "../types";

// Global config for commands to access (set during CLI setup)
export let globalConfig: Config | null = null;

export function setGlobalConfig(config: Config): void {
	globalConfig = config;
}
