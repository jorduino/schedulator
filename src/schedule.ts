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

export class Schedule {
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
			if (employees === undefined || locations === undefined) {
			} else {
				this.employees = employees;
				this.locations = locations;
			}
		}
	}

	generateRotation(): Schedule {
		// TODO: write a better description
		// returns a new schedule with placements that rotate from the final show in the schedule
		const rotatedSchedule = new Schedule({ engagements: structuredClone(this.engagements) });
		rotatedSchedule.engagements = rotatedSchedule.engagements.map(this.rotateOneEngagement);
		return rotatedSchedule;
	}
	private rotateOneEngagement(engagement: Engagement): Engagement {
		// TODO: this is a placeholder, please write this function
		const rotatedEngagement = structuredClone(engagement);
		// if (rotatedEngagement.shows && rotatedEngagement.shows.length > 0) {
		// 	const shows = rotatedEngagement.shows;
		// 	for (let i = shows.length; i >= 0; i--) {
		// 		let show = shows[i];
		// 		show = typeof show === "string" ? { date: show, placements: [] } : show;
		// 	}
		// } else {
		// 	rotatedEngagement.shows = [];
		// }
		return rotatedEngagement;
	}

	getSimpleSchedule(): Schedule {
		// TODO: write better description
		// converts a schedule's Shows from ShowObjects to ShowStrings
		const simpleSchedule = new Schedule({ engagements: structuredClone(this.engagements) });
		simpleSchedule.engagements = simpleSchedule.engagements.map(this.simplifyOneEngagement);
		return simpleSchedule;
	}
	private simplifyOneEngagement(engagement: Engagement): Engagement {
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
