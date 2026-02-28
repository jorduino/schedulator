import type { PathLike } from "node:fs";
import { z } from "zod";
import Timezones from "../timezones";
import type {
	EmployeeString,
	Engagement,
	LocationObject,
	LocationString,
	RotatedEngagement,
	RotatedScheduleData,
	ScheduleData,
	ShowObject,
} from "./types";

const ShowStringSchema = z
	.string()
	.regex(
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
		"Invalid datetime format. Expected YYYY-MM-DDTHH:mm:ss",
	);
const ScheduleDataSchema: z.ZodType<ScheduleData> = z.object({
	engagements: z.array(
		z.object({
			town: z.string(),
			timezone: z.string().optional(),
			shows: z
				.array(
					z.union([
						ShowStringSchema,
						z.object({
							date: ShowStringSchema,
							placements: z.array(
								z.object({
									location: z.string(),
									employee: z.string(),
								}),
							),
						}),
					]),
				)
				.optional(),
		}),
	),
	employees: z.array(z.string()).optional(),
	locations: z.array(z.string()).optional(),
});

const exampleEngagements = [
	{
		town: "example1",
		shows: ["2000-01-10T12:00:00", "2000-01-10T16:00:00"],
	},
	{
		town: "example2",
		timezone: "GMT",
		shows: [
			{
				date: "2000-01-11T12:00:00",
				placements: [
					{ location: "Location A", employee: "Employee 1" },
					{ location: "Location B", employee: "Employee 2" },
					{ location: "Location C", employee: "Employee 3" },
				],
			},
			{
				date: "2000-01-11T16:00:00",
				placements: [
					{ location: "Location A", employee: "Employee 3" },
					{ location: "Location B", employee: "Employee 1" },
					{ location: "Location C", employee: "Employee 2" },
				],
			},
		],
	},
];

/**
 * Represents a schedule with engagements, employees, and locations.
 * Constructed from raw input data (ScheduleData or a JSON string) with Zod validation.
 * Defaults to example data when constructed with no arguments.
 */
export default class Schedule {
	engagements: Engagement[] = exampleEngagements;
	employees: EmployeeString[] = ["Employee 1", "Employee 2", "Employee 3"] as EmployeeString[];
	locations: LocationString[] = ["Location A", "Location B", "Location C"] as LocationString[];
	timezones: Timezones = new Timezones();

	/** Creates a Schedule using example data. */
	constructor();
	/** Creates a Schedule from validated ScheduleData or a JSON string. Throws if validation fails. */
	constructor(scheduleData: ScheduleData | string);
	/** Creates a Schedule, overriding the employees and locations from the data with explicit lists. */
	constructor(scheduleData: ScheduleData | string, employees: string[], locations: string[]);
	/** Creates a Schedule, listing a cache path to save timezone info */
	constructor(
		scheduleData: ScheduleData | string,
		employees: string[],
		locations: string[],
		TimezoneCachePath?: PathLike,
	);
	constructor(
		p1?: ScheduleData | string,
		employees?: string[],
		locations?: string[],
		timezoneCachePath?: PathLike,
	) {
		if (p1 !== undefined) {
			// Validate and parse in one step
			const validated = ScheduleDataSchema.parse(
				// if p1 is a string, convert to json before validating
				typeof p1 === "string" ? JSON.parse(p1) : p1,
			);
			this.engagements = validated.engagements;
			if (validated.employees) this.employees = validated.employees as EmployeeString[];
			if (validated.locations) this.locations = validated.locations as LocationString[];

			if (employees !== undefined && locations !== undefined) {
				this.employees = employees as EmployeeString[];
				this.locations = locations as LocationString[];
			}
			this.timezones.extCachePath = timezoneCachePath;
		}
	}

	/**
	 * Returns a new RotatedSchedule with the rotation applied. Leaves the original untouched.
	 * Shows that already have placements are left as-is — use forceGenerateRotation() to overwrite them.
	 * @param keepFirstShow If true, locks the first show's assignment to the initial employee order.
	 */
	async generateRotation(keepFirstShow?: boolean): Promise<RotatedSchedule> {
		try {
			await this.timezones.readCache();
		} catch (e) {
			console.warn(`WARN: Couldn't read timezone cache: ${e}\nignoring`);
		}
		const rotatedEngagements: RotatedEngagement[] = [];
		for (const engagement of this.engagements) {
			rotatedEngagements.push(
				await rotateOneEngagement(
					engagement,
					this.employees,
					this.locations,
					keepFirstShow ?? false,
					this.timezones,
				),
			);
		}
		try {
			await this.timezones.writeCache();
		} catch (e) {
			console.warn(`WARN: Couldn't write timezone cache: ${e}\n ignoring`);
		}
		return new RotatedSchedule({
			engagements: rotatedEngagements,
			employees: this.employees,
			locations: this.locations,
		});
	}

	/**
	 * Returns a new RotatedSchedule with the rotation applied. Leaves the original untouched.
	 * Strips all existing placements before rotating, ignoring any manual overrides.
	 * @param keepFirstShow If true, locks the first show's assignment to the initial employee order.
	 */
	async forceGenerateRotation(keepFirstShow?: boolean): Promise<RotatedSchedule> {
		// remove any information that may exist on this.engagements and rotate
		const rotatedSchedule = await this.getSimpleSchedule().generateRotation(keepFirstShow);
		return rotatedSchedule;
	}

	/** Returns a new Schedule with all shows reduced to date strings, stripping any placements. */
	getSimpleSchedule(): Schedule {
		const simpleSchedule = new Schedule(
			{ engagements: this.engagements },
			this.employees,
			this.locations,
			this.timezones.extCachePath,
		);
		simpleSchedule.engagements = simpleSchedule.engagements.map(simplifyOneEngagement);
		simpleSchedule.timezones.cache = new Map([...this.timezones.cache]);
		return simpleSchedule;
	}
}

/**
 * The fully rotated output type. All shows are ShowObjects with placements, and every
 * engagement has a timezone. Produced by Schedule.generateRotation() or forceGenerateRotation().
 */
export class RotatedSchedule extends Schedule {
	declare engagements: RotatedEngagement[];
	/** Creates a RotatedSchedule directly from pre-built RotatedScheduleData. */
	constructor(scheduleData: RotatedScheduleData) {
		super({ engagements: [] });
		this.engagements = scheduleData.engagements;
		this.employees = scheduleData.employees as EmployeeString[];
		this.locations = scheduleData.locations as LocationString[];
	}
}

/**
 * Applies the rotation algorithm to a single engagement.
 * Rotation is computed backwards from the last show — the last show gets the initial employee
 * order, and each earlier show rotates forward by one step relative to the show after it.
 * Shows that already have placements are left as-is.
 * Prompts the user for a timezone if the engagement has none and it can't be inferred.
 * @param engagement The engagement to rotate.
 * @param employees The ordered list of employees.
 * @param locations The ordered list of locations.
 * @param keepFirstShow If true, locks the first show to the initial employee order before rotating the rest.
 */
export async function rotateOneEngagement(
	engagement: Engagement,
	employees: EmployeeString[],
	locations: LocationString[],
	keepFirstShow: boolean,
	timezones: Timezones,
): Promise<RotatedEngagement> {
	const rotatedEngagement = structuredClone(engagement);
	employees = structuredClone(employees);
	locations = structuredClone(locations);

	const timezone =
		rotatedEngagement.timezone ?? (await timezones.askUserForTimezone(engagement.town));

	if (!rotatedEngagement.shows || rotatedEngagement.shows.length === 0) {
		return { town: rotatedEngagement.town, timezone, shows: [] };
	}

	const shows = rotatedEngagement.shows;
	const endIndex = keepFirstShow ? 1 : 0;
	if (keepFirstShow) {
		const firstShow = shows[0];
		if (typeof firstShow === "string") {
			shows[0] = {
				date: firstShow,
				placements: mapEmployeeAndLocation(employees, locations),
			};
		}
	}
	for (let i = shows.length - 1; i >= endIndex; i--) {
		let show = shows[i];
		if (typeof show === "string") {
			show = {
				date: show,
				placements: mapEmployeeAndLocation(employees, locations),
			};
			shows[i] = show;
		}
		const last = employees.shift();
		if (last !== undefined) employees.push(last);
	}

	return { town: rotatedEngagement.town, timezone, shows: shows as ShowObject[] };
}

/**
 * Pairs each employee with a location by index, producing a placements array.
 * @param employees Ordered list of employees.
 * @param locations Ordered list of locations. Must be the same length as employees.
 * @throws If employees and locations have different lengths.
 */
export function mapEmployeeAndLocation(
	employees: EmployeeString[],
	locations: LocationString[],
): LocationObject[] {
	if (employees.length !== locations.length) {
		throw new Error("employees and locations must be the same length");
	}

	const result: LocationObject[] = [];
	for (const [i, location] of locations.entries()) {
		const employee = employees[i];
		if (employee !== undefined) {
			result.push({ location, employee });
		}
	}
	return result;
}

/**
 * Returns a copy of an engagement with all shows reduced to date strings, stripping placements.
 * @param engagement The engagement to simplify.
 */
export function simplifyOneEngagement(engagement: Engagement): Engagement {
	return {
		town: engagement.town,
		timezone: engagement.timezone,
		shows: engagement.shows?.map(show => {
			if (typeof show === "string") {
				return show;
			} else {
				return show.date;
			}
		}),
	};
}
