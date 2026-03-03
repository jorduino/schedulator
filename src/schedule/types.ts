import type Timezones from "../timezones";

export type ShowString = string;
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
export type RotatedEngagement = {
	town: string;
	timezone: string;
	shows: ShowObject[];
};
export type ScheduleData = {
	engagements: Engagement[];
	employees?: string[];
	locations?: string[];
	timezones?: Timezones;
};
export type RotatedScheduleData = {
	engagements: RotatedEngagement[];
	employees: string[];
	locations: string[];
	timezones: Timezones;
};
