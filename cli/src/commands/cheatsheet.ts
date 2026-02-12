import { defineCommand } from "citty";

const sections = [
	{
		title: "Git",
		items: [
			["gs", "git status"],
			["ga / gaa", "git add / git add ."],
			["gc / gcm", "git commit / git commit -m"],
			["gd", "git diff"],
			["gsw / gswc", "git switch / git switch -c"],
			["gb / gbd / gbD", "git branch / -d / -D"],
			["gmv", "git branch -m (rename)"],
			["gp / gpush", "git pull / git push -u origin HEAD"],
			["gm / gmm", "git merge / git merge main"],
			["gstash", "git stash -u"],
			["glog", "git log --pretty=oneline"],
		],
	},
	{
		title: "GitHub CLI",
		items: [
			["ghprc", "gh pr create"],
			["ghprv", "gh pr view --web"],
			["ghprs / ghprls", "gh pr status / list"],
			["ghprm / ghprcl", "gh pr merge / close"],
			["ghils", "gh issues list"],
		],
	},
	{
		title: "Bun",
		items: [
			["b", "bun"],
			["bs / bd", "bun start / bun dev"],
			["bt", "bun test"],
			["ba / bad", "bun add / bun add -D"],
			["bl", "bun run lint"],
		],
	},
	{
		title: "npm",
		items: [
			["ni / nis / nid", "npm install / --save / --save-dev"],
		],
	},
	{
		title: "Shell",
		items: [
			["ll / la", "list detailed / list all"],
			["tree", "eza --tree --git-ignore"],
			["z <dir>", "zoxide (smart cd)"],
			["ctrl+r", "fuzzy history search"],
		],
	},
	{
		title: "Search",
		items: [
			["fd <pattern>", "find files by name"],
			["rg <pattern>", "search file contents"],
			["fzf", "fuzzy finder"],
		],
	},
];

export const cheatsheetCommand = defineCommand({
	meta: {
		name: "cheatsheet",
		description: "Print categorized alias and command reference",
	},
	run() {
		for (const section of sections) {
			console.log(`\n  \x1b[1m${section.title}\x1b[0m`);
			for (const [alias, desc] of section.items) {
				console.log(`    ${alias.padEnd(20)} ${desc}`);
			}
		}
		console.log("");
	},
});
