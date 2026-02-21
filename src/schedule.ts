import { z } from "zod";
import lookupTimezone from "./utils/askUserForTimezone";

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

export type ShowString = z.infer<typeof ShowStringSchema>;
export type EmployeeString = string & { __brand: "Employee" };
export type LocationString = string & { __brand: "Location" };
export type LocationObject = {
	location: string;
	employee: string;
};
export type ShowObject = {
	date: ShowString;
	placements: LocationObject[];
};
export type Show = ShowString | ShowObject;
export type Engagement = {
	town: string;
	timezone?: string;
	shows?: Show[];
};
export type ScheduleData = {
	engagements: Engagement[];
	employees?: string[];
	locations?: string[];
};

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

export default class Schedule {
	engagements: Engagement[] = exampleEngagements;
	employees: EmployeeString[] = ["Employee 1", "Employee 2", "Employee 3"] as EmployeeString[];
	locations: LocationString[] = ["Location A", "Location B", "Location C"] as LocationString[];

	constructor();
	constructor(scheduleData: ScheduleData | string);
	constructor(scheduleData: ScheduleData | string, employees: string[], locations: string[]);

	constructor(p1?: ScheduleData | string, employees?: string[], locations?: string[]) {
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
		}
	}

	/**
	 * Returns a new schedule with the rotation applied. Leaves original schedule untouched.
	 * If the schedule has already been rotated, this will ignore any rotated shows.
	 * Use forceGenerateRotation() to overwrite any existing rotation information
	 * @returns The schedule with the rotation
	 */
	async generateRotation(keepFirstShow?: boolean): Promise<Schedule> {
		const rotatedSchedule = new Schedule(
			{ engagements: this.engagements },
			this.employees,
			this.locations,
		);
		const rotatedEngagements: Engagement[] = [];
		for (const engagement of rotatedSchedule.engagements) {
			rotatedEngagements.push(
				await Schedule.rotateOneEngagement(
					engagement,
					this.employees,
					this.locations,
					keepFirstShow ?? false,
				),
			);
		}
		rotatedSchedule.engagements = rotatedEngagements;
		return rotatedSchedule;
	}

	/**
	 * Returns a new schedule with the rotation applied. Leaves original schedule untouched.
	 * Ignores any existing rotation information
	 * @returns The schedule with the rotation
	 */
	async forceGenerateRotation(keepFirstShow?: boolean): Promise<Schedule> {
		// remove any information that may exist on this.engagements
		const rotatedSchedule = new Schedule(
			{
				engagements: this.engagements,
			},
			this.employees,
			this.locations,
		).getSimpleSchedule();

		const rotatedEngagements: Engagement[] = [];
		for (const engagement of rotatedSchedule.engagements) {
			rotatedEngagements.push(
				await Schedule.rotateOneEngagement(
					engagement,
					this.employees,
					this.locations,
					keepFirstShow ?? false,
				),
			);
		}
		rotatedSchedule.engagements = rotatedEngagements;
		return rotatedSchedule;
	}

	static async rotateOneEngagement(
		engagement: Engagement,
		employees: EmployeeString[],
		locations: LocationString[],
		keepFirstShow: boolean,
	): Promise<Engagement> {
		const rotatedEngagement = structuredClone(engagement);
		employees = structuredClone(employees);

		if (!rotatedEngagement.shows || rotatedEngagement.shows.length === 0) {
			rotatedEngagement.shows = [];
			return rotatedEngagement;
		}
		if (!rotatedEngagement.timezone) {
			rotatedEngagement.timezone = await lookupTimezone(engagement.town);
		}
		const shows = rotatedEngagement.shows;
		const endIndex = keepFirstShow ? 1 : 0;
		if (keepFirstShow) {
			const firstShow = shows[0];
			if (typeof firstShow === "string") {
				shows[0] = {
					date: firstShow,
					placements: Schedule.mapEmployeeAndLocation(employees, locations),
				};
			}
		}
		for (let i = shows.length - 1; i >= endIndex; i--) {
			let show = shows[i];
			if (typeof show === "string") {
				show = {
					date: show,
					placements: Schedule.mapEmployeeAndLocation(employees, locations),
				};
				shows[i] = show;
			}
			const last = employees.shift();
			if (last !== undefined) employees.push(last);
		}

		return rotatedEngagement;
	}
	static mapEmployeeAndLocation(
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
	 * Returns a new schedule without any rotation information
	 * @returns The schedule with only date strings
	 */
	getSimpleSchedule(): Schedule {
		const simpleSchedule = new Schedule(
			{ engagements: this.engagements },
			this.employees,
			this.locations,
		);
		simpleSchedule.engagements = simpleSchedule.engagements.map(Schedule.simplifyOneEngagement);
		return simpleSchedule;
	}
	/**
	 * Returns a new engagement that has been simplified
	 * @param {Engagement} engagement the engagement to simplify
	 * @returns a new, simplified engagement
	 */
	static simplifyOneEngagement(engagement: Engagement): Engagement {
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
}
