import { expect, test } from "bun:test";
import Schedule from "../src/schedule";

test("rotate should throw with no shows", () => {
	const schedule = new Schedule();
	expect(schedule.generateRotation().engagements[0]?.shows?.length).toBe(2);
});
