import { expect, test } from "bun:test";
import Schedule, { mapEmployeeAndLocation } from "../src/schedule";

// test("rotate should throw with no shows", () => {
// 	//todo rewrite this
// 	const schedule = new Schedule();
// 	expect(schedule.generateRotation().engagements[0]?.shows?.length).toBe(2);
// });

test("map employee and location works", () => {
	const schedule = new Schedule();
	const employees = schedule.employees;
	const locations = schedule.locations;
	const locationObjectArray = mapEmployeeAndLocation(employees, locations);

	expect(locationObjectArray.length).toBe(employees.length);
	expect(locationObjectArray[0]?.location).toBe(locations[0]);
	expect(locationObjectArray[0]?.employee).toBe(employees[0]);
});
