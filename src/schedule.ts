import { z } from "zod";

const ShowStringSchema = z
	.string()
	.regex(
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
		"Invalid datetime format. Expected YYYY-MM-DDTHH:mm:ss",
	);
const LocationObjectSchema = z.array(
	z.object({
		location: z.string(),
		employee: z.string(),
	}),
);
const ShowObjectSchema = z.object({
	date: ShowStringSchema,
	placements: LocationObjectSchema,
});
const ShowSchema = z.union([ShowStringSchema, ShowObjectSchema]);
const EngagementSchema = z.object({
	town: z.string(),
	timezone: z.string().optional(),
	shows: z.array(ShowSchema).optional(),
});
const ScheduleDataSchema = z.object({
	engagements: z.array(EngagementSchema),
});

// Infer types from schemas
export type ShowString = z.infer<typeof ShowStringSchema>;
export type LocationObject = z.infer<typeof LocationObjectSchema>;
export type ShowObject = z.infer<typeof ShowObjectSchema>;
export type Show = z.infer<typeof ShowSchema>;
export type Engagement = z.infer<typeof EngagementSchema>;
export type ScheduleData = z.infer<typeof ScheduleDataSchema>;

export default class Schedule {
	engagements: Engagement[];
	employees?: string[];
	locations?: string[];

	constructor();
	constructor(scheduleData: ScheduleData | string);
	constructor(scheduleDate: ScheduleData | string, employees: string[], locations: string[]);

	constructor(p1?: ScheduleData | string, employees?: string[], locations?: string[]) {
		if (p1 === undefined && employees === undefined && locations === undefined) {
			this.engagements = [
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
			this.employees = ["Employee 1", "Employee 2", "Employee 3"];
			this.locations = ["Location A", "Location B", "Location C"];
		} else {
			// Validate and parse in one step
			const validated = ScheduleDataSchema.parse(
				// if p1 is a string, convert to json before validating
				typeof p1 === "string" ? JSON.parse(p1) : p1,
			);
			this.engagements = validated.engagements;
			if (employees !== undefined && locations !== undefined) {
				this.employees = employees;
				this.locations = locations;
			}
		}
	}

	/**
	 * Returns a new schedule with the rotation applied. Leaves original schedule untouched.
	 * If the schedule has already been rotated, this will ignore any rotated shows.
	 * Use forceGenerateRotation() to ignore any existing rotation information
	 * @returns The schedule with the rotation
	 */
	generateRotation(): Schedule {
		const rotatedSchedule = new Schedule({ engagements: this.engagements });
		rotatedSchedule.engagements = rotatedSchedule.engagements.map(engagement =>
			Schedule.rotateOneEngagement(engagement, this.employees, this.locations),
		);
		return rotatedSchedule;
	}

	/**
	 * Returns a new schedule with the rotation applied. Leaves original schedule untouched.
	 * Ignores any existing rotation information
	 * @returns The schedule with the rotation
	 */
	forceGenerateRotation(): Schedule {
		// remove any information that may exist on this.engagements
		const rotatedSchedule = new Schedule({
			engagements: this.engagements,
		}).getSimpleSchedule();
		rotatedSchedule.engagements = rotatedSchedule.engagements.map(engagement =>
			Schedule.rotateOneEngagement(engagement, this.employees, this.locations),
		);
		return rotatedSchedule;
	}

	private static rotateOneEngagement(
		engagement: Engagement,
		_employees: string[] | undefined,
		_locations: string[] | undefined,
	): Engagement {
		const rotatedEngagement = structuredClone(engagement);

		if (!rotatedEngagement.shows || rotatedEngagement.shows.length === 0) {
			rotatedEngagement.shows = [];
			return rotatedEngagement;
		}

		const shows = rotatedEngagement.shows;
		for (let i = shows.length - 1; i >= 0; i--) {
			let show = shows[i];
			show = {
				// TODO: fix this
				date: typeof show === "string" ? show : (show?.date ?? ""),
				placements: typeof show === "string" || show === undefined ? [] : show.placements,
			};
			shows[i] = show;
		}

		return rotatedEngagement;
	}

	/**
	 * Returns a new schedule without any rotation information
	 * @returns The schedule with only date strings
	 */
	getSimpleSchedule(): Schedule {
		const simpleSchedule = new Schedule({ engagements: this.engagements });
		simpleSchedule.engagements = simpleSchedule.engagements.map(Schedule.simplifyOneEngagement);
		return simpleSchedule;
	}
	/**
	 * Returns a new engagement that has been simplified
	 * @param {Engagement} engagement the engagement to simplify
	 * @returns a new, simplified engagement
	 */
	private static simplifyOneEngagement(engagement: Engagement): Engagement {
		return {
			town: engagement.town,
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
