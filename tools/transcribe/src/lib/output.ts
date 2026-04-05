import type { TranscriptionResult } from "./elevenlabs";

export interface OutputOptions {
	json?: boolean;
}

export function formatTranscription(
	result: TranscriptionResult,
	options: OutputOptions = {},
): string {
	if (options.json) {
		return JSON.stringify(result, null, 2);
	}
	return result.transcript;
}
