const ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";

export interface TranscriptionResult {
	transcript: string;
	duration: string;
}

interface ElevenLabsWord {
	text: string;
	start: number | null;
	end: number | null;
	type: string;
}

interface ElevenLabsResponse {
	text: string;
	words: ElevenLabsWord[];
}

function isElevenLabsResponse(value: unknown): value is ElevenLabsResponse {
	return (
		typeof value === "object" &&
		value !== null &&
		"text" in value &&
		typeof (value as Record<string, unknown>).text === "string" &&
		"words" in value &&
		Array.isArray((value as Record<string, unknown>).words)
	);
}

export function formatDuration(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = Math.floor(totalSeconds % 60);
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function buildTranscriptionResult(
	response: ElevenLabsResponse,
): TranscriptionResult {
	const lastWord = response.words.findLast((w) => w.end !== null);
	const durationSeconds = lastWord?.end ?? 0;

	return {
		transcript: response.text,
		duration: formatDuration(durationSeconds),
	};
}

export async function transcribeFile(
	filePath: string,
): Promise<TranscriptionResult> {
	const apiKey = process.env.ELEVENLABS_API_KEY;
	if (!apiKey) {
		throw new Error(
			"ELEVENLABS_API_KEY not set. Export it in your shell or configure via varlock.",
		);
	}

	const file = Bun.file(filePath);
	if (!(await file.exists())) {
		throw new Error(`File not found: ${filePath}`);
	}

	const formData = new FormData();
	formData.append("model_id", "scribe_v2");
	formData.append("file", file);
	formData.append("language_code", "en");
	formData.append("timestamps_granularity", "word");
	formData.append("tag_audio_events", "true");

	const response = await fetch(ELEVENLABS_STT_URL, {
		method: "POST",
		headers: { "xi-api-key": apiKey },
		body: formData,
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`ElevenLabs STT failed (${response.status}): ${error}`);
	}

	const raw: unknown = await response.json();
	if (!isElevenLabsResponse(raw)) {
		throw new Error("Unexpected response shape from ElevenLabs STT");
	}
	return buildTranscriptionResult(raw);
}
