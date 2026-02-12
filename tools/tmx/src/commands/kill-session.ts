import { defineCommand } from "citty";
import { tmux } from "../lib/tmux";

export const killSessionCommand = defineCommand({
	meta: {
		name: "kill-session",
		description: "Kill a tmux session",
	},
	args: {
		name: {
			type: "positional",
			description: "Session name",
			required: true,
		},
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
		socket: {
			type: "string",
			description: "tmux socket name (-L)",
		},
	},
	async run({ args }) {
		await tmux(["kill-session", "-t", args.name], { socket: args.socket });

		if (args.json) {
			console.log(
				JSON.stringify({ session: args.name, killed: true }, null, 2),
			);
		} else {
			console.log(`Killed session: ${args.name}`);
		}
	},
});
