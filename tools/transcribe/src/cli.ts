#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";
import { fileCommand } from "./commands/file";

const main = defineCommand({
	meta: {
		name: "transcribe",
		description: "Transcribe audio files to text via ElevenLabs",
		version: "0.1.0",
	},
	subCommands: {
		file: fileCommand,
	},
});

runMain(main);
