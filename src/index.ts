import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import Schedule from "./schedule";

const scheduleLocation = "./schedule.json";
const employees = ["Employee 1", "Employee 3", "Employee 2"];
const locations = ["Location 1", "Location 2", "Location 3"];
let schedule: Schedule;

// if there is no schedule, tell the user to make one and exit
if (!existsSync(scheduleLocation)) {
	console.error("schedule.json not found! Please make one using the following format:");
	console.log(JSON.stringify(new Schedule(), null, 2));
	process.exit();
}

try {
	const scheduleData = await fs.readFile(scheduleLocation, { encoding: "utf8" });
	console.log("Got the file");
	schedule = new Schedule(scheduleData, employees, locations);
	console.log("Schedule got parsed");
} catch (err) {
	console.error(err);
	process.exit();
}
if (!(await fs.exists("./out"))) {
	await fs.mkdir("./out");
}

const rotated = JSON.stringify(schedule.generateRotation(true), null, 2);
const forceRotated = JSON.stringify(schedule.forceGenerateRotation(true), null, 2);
const simple = JSON.stringify(schedule.getSimpleSchedule(), null, 2);

await fs.writeFile("./out/Schedule-Rotated.json", rotated);
await fs.writeFile("./out/Schedule-Force-Rotated.json", forceRotated);
await fs.writeFile("./out/Schedule-Simple.json", simple);

console.log("Wrote some stuff");
