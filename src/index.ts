import createCalendarFile from "./calendarFile";
import Schedule from "./schedule/schedule";

const scheduleLocation = "./schedule.json";

let schedule: Schedule;

// if there is no schedule, tell the user to make one and exit
if (!(await Bun.file(scheduleLocation).exists())) {
	const tempSchedule = new Schedule();
	tempSchedule.timezones.extCachePath = "./cache.json";
	await Bun.write(scheduleLocation, JSON.stringify(tempSchedule, null, 2));
	const scheduleFullLocation = `${import.meta.dir}/${scheduleLocation}`;
	console.error(
		`ERROR: schedule.json not found! Creating template, please modify '${scheduleFullLocation}'.\nRun program again once data is in schedule.json`,
	);
	process.exit();
}

try {
	const scheduleData = await Bun.file(scheduleLocation).text();
	console.log("Got the file");
	schedule = new Schedule(scheduleData);
	console.log("Schedule got parsed");
} catch (err) {
	console.error(err);
	process.exit();
}

const rotated = await schedule.generateRotation(true);
const forceRotated = await schedule.forceGenerateRotation(true);
const simple = schedule.getSimpleSchedule();
const rotatedJSON = JSON.stringify(rotated, null, 2);
const forceRotatedJSON = JSON.stringify(forceRotated, null, 2);
const simpleJSON = JSON.stringify(simple, null, 2);

await Bun.write("./out/Schedule-Rotated.json", rotatedJSON);
await Bun.write("./out/Schedule-Force-Rotated.json", forceRotatedJSON);
await Bun.write("./out/Schedule-Simple.json", simpleJSON);
await Bun.write("./out/Calendar.ics", createCalendarFile(forceRotated));

console.log("Wrote some stuff");
