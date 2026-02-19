import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import { Schedule } from "./schedule";

const scheduleLocation = "./schedule.json";
let schedule: Schedule;

if (!existsSync(scheduleLocation)) {
	console.error("schedule.json not found! Please make one using the following format:");
	console.log(JSON.stringify(new Schedule(), null, 2));
	process.exit();
}

try {
	const scheduleData = await fs.readFile(scheduleLocation, { encoding: "utf8" });
	console.log("Got the file");
	schedule = new Schedule(JSON.parse(scheduleData));
	console.log("Schedule got parsed");
} catch (err) {
	console.error(err);
	process.exit();
}

console.log(JSON.stringify(schedule.generateRotation()));
