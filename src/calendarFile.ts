import type { RotatedSchedule } from "./schedule/schedule";

type Event = {
	dateTimeString: string;
	placements: string;
	town: string;
	timezone: string;
};

const header: string[] = [
	"BEGIN:VCALENDAR",
	"VERSION:2.0",
	"PRODID:-//schedulator//schedulator//EN",
	"CALSCALE:GREGORIAN",
	"METHOD:PUBLISH",
];
const footer: string[] = ["END:VCALENDAR"];

export default function createCalendarFile(rotatedSchedule: RotatedSchedule): string {
	const body: string[] = [];

	for (const { shows, timezone, town } of rotatedSchedule.engagements) {
		for (const show of shows) {
			const placements = show.placements.map(p => `${p.location}:${p.employee}`).join(",\\n");

			body.push(
				createCalendarEvent({
					dateTimeString: show.date,
					placements,
					town,
					timezone,
				}),
			);
		}
	}
	return [header.join("\r\n"), ...body, footer.join("\r\n")].join("\r\n\r\n");
}
export function createCalendarEvent(event: Event): string {
	const eventHead: string = "BEGIN:VEVENT";
	const eventBody: string[] = [];
	const eventFoot: string = "END:VEVENT";

	const description = `${event.town} - ${formatTime(event.dateTimeString)}: ${event.placements}`;
	eventBody.push(
		`UID:${eventUID(event.dateTimeString, event.town)}`,
		`DTSTAMP:${toICSDate(new Date())}`,
		`DTSTART;TZID=${event.timezone}:${toICSDate(event.dateTimeString)}`,
		`DTEND;TZID=${event.timezone}:${toICSDate(getEndTime(event.dateTimeString))}`,
		`SUMMARY:${description}`,
		`DESCRIPTION:${description}`,
		`LOCATION:${event.town}`,
		`STATUS:CONFIRMED`,
	);

	return [eventHead, ...eventBody, eventFoot].join("\r\n");
}

function getEndTime(startTime: string): string {
	const date = new Date(startTime);
	date.setHours(date.getHours() + 2);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function eventUID(date: string, town: string): string {
	const hash = new Bun.CryptoHasher("sha1").update(`${date}:${town}`).digest("hex").slice(0, 16);
	return `${hash}@schedulator`;
}

function formatTime(dateTimeString: string | Date): string {
	return new Date(dateTimeString).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

function toICSDate(date: Date | string): string {
	const str = date instanceof Date ? date.toISOString().replace(/\.\d{3}/, "") : date;
	return str.replace(/[-:]/g, "");
}
