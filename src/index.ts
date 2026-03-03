import { resolve } from "node:path";
import { parseArgs } from "util";
import createCalendarFile from "./calendarFile";
import Schedule from "./schedule/schedule";

let values: ReturnType<typeof parseArgs>["values"];

try {
	({ values } = parseArgs({
		options: {
			schedule: { type: "string", short: "s", default: "./schedule.json" },
			out: { type: "string", short: "o", default: "./out/rotated.ics" },
			generate: { type: "boolean", short: "g" },
			help: { type: "boolean", short: "h" },
		},
	}));
} catch (err) {
	console.error("Invalid arguments:", err instanceof Error ? err.message : err);
	process.exit(1);
}

// assertions are safe due to defaults in parseArgs
const scheduleLocation = resolve(values["schedule"] as string);
const out = resolve(values["out"] as string);

if (values["help"]) {
	console.log(
		[
			`Options:`,
			`  -s <schedule>   : Schedule location (default: "./schedule.json")`,
			`  -o <out>        : Output location   (default: "./out/rotated.ics")`,
			`  -g <generate>   : Create a new schedule.json template`,
			`  -h <help>       : Show this info`,
		].join("\n"),
	);
	process.exit();
}

if (values["generate"]) {
	const tempSchedule = new Schedule();
	tempSchedule.timezones.extCachePath = "./cache.json";
	if (await Bun.file(scheduleLocation).exists()) {
		console.error(
			`File already exists: '${scheduleLocation}', cancelling operation.\nRerun without -g`,
		);
		process.exit(1);
	}
	await Bun.write(scheduleLocation, JSON.stringify(tempSchedule, null, 2));
	console.log(`Generated '${scheduleLocation}'. Fill it in and rerun without -g.`);
	process.exit();
}

let schedule: Schedule;

try {
	const scheduleData = await Bun.file(scheduleLocation).text();
	schedule = new Schedule(scheduleData);
} catch (err) {
	if (err instanceof Error && "code" in err && err.code === "ENOENT") {
		console.error(
			`ERROR: schedule file not found at '${scheduleLocation}'.\nRun with -g to generate a template.`,
		);
	} else {
		console.error(err);
	}
	process.exit(1);
}

const rotated = await schedule.generateRotation(true);
const calendarFile = createCalendarFile(rotated);

await Bun.write(out, calendarFile);

console.log(`Wrote calendar to '${out}'.`);
