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

	constructor();
	constructor(scheduleData: ScheduleData);
	constructor(p1?: unknown) {
		if (p1 === undefined) {
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
		} else {
			// Validate and parse in one step
			const validated = ScheduleDataSchema.parse(p1);
			this.engagements = validated.engagements;
		}
	}

	generateRotation() {
		// TODO: do this doesn't do anything
		return structuredClone(this.engagements);
	}
}
