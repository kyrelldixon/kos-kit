import { defineCommand } from "citty";
import { transcribeFile } from "../lib/elevenlabs";
import { formatTranscription } from "../lib/output";

export const fileCommand = defineCommand({
	meta: {
		name: "file",
		description: "Transcribe an audio file to text",
	},
	args: {
		path: {
			type: "positional",
			description: "Path to audio file (.m4a, .mp3, .wav, .webm)",
			required: true,
		},
		json: {
			type: "boolean",
			description: "Output as JSON (includes duration)",
			default: false,
		},
		copy: {
			type: "boolean",
			description: "Copy transcript to clipboard",
			default: false,
		},
	},
	async run({ args }) {
		const result = await transcribeFile(args.path);
		const output = formatTranscription(result, { json: args.json });

		console.log(output);

		if (args.copy && !args.json) {
			const proc = Bun.spawn(["pbcopy"], {
				stdin: new Response(result.transcript).body,
			});
			await proc.exited;
			console.error("(copied to clipboard)");
		}
	},
});
