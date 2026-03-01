import * as fs from "node:fs/promises"; // Use fs/promises for async operations
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Schedule from "./schedule/schedule";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scheduleLocation = "./schedule.json";
const employees = ["Employee 1", "Employee 3", "Employee 2"];
const locations = ["Location 1", "Location 2", "Location 3"];
const tzCachePath = "./cache.json";

let schedule: Schedule;

// if there is no schedule, tell the user to make one and exit
if (!(await fs.exists(scheduleLocation))) {
	await fs.writeFile(scheduleLocation, JSON.stringify(new Schedule(), null, 2));
	const scheduleFullLocation = join(__dirname, scheduleLocation);
	console.error(
		`ERROR: schedule.json not found! Creating template, please modify '${scheduleFullLocation}'.\nRun program again once data is in schedule.json`,
	);
	process.exit();
}

try {
	const scheduleData = await fs.readFile(scheduleLocation, { encoding: "utf8" });
	console.log("Got the file");
	schedule = new Schedule(scheduleData, employees, locations, tzCachePath);
	console.log("Schedule got parsed");
} catch (err) {
	console.error(err);
	process.exit();
}
if (!(await fs.exists("./out"))) {
	await fs.mkdir("./out");
}

const rotated = JSON.stringify(await schedule.generateRotation(true), null, 2);
const forceRotated = JSON.stringify(await schedule.forceGenerateRotation(true), null, 2);
const simple = JSON.stringify(schedule.getSimpleSchedule(), null, 2);

await fs.writeFile("./out/Schedule-Rotated.json", rotated);
await fs.writeFile("./out/Schedule-Force-Rotated.json", forceRotated);
await fs.writeFile("./out/Schedule-Simple.json", simple);

console.log("Wrote some stuff");
