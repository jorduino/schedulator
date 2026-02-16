import { z } from "zod";

const DateTimeStringSchema = z
	.string()
	.regex(
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
		"Invalid datetime format. Expected YYYY-MM-DDTHH:mm:ss",
	);
const EngagementSchema = z.object({
	town: z.string(),
	shows: z.array(DateTimeStringSchema).nullable(),
});
const ScheduleDataSchema = z.object({
	engagements: z.array(EngagementSchema),
});

// Infer types from schemas
export type DateTimeString = z.infer<typeof DateTimeStringSchema>;
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
					shows: ["2000-01-11T12:00:00", "2000-01-11T16:00:00"],
				},
			];
		} else {
			// Validate and parse in one step
			const validated = ScheduleDataSchema.parse(p1);
			this.engagements = validated.engagements;
		}
	}
}
