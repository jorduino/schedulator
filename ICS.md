# ICS File

## Requirements

Each calendar event should have the following things visible to the user:

- City name
- Time of show in title
- Locations and employees in title
- Locations and employees in description

Each calendar event should also have the following things not necessarily visible:

- Timezone

---

## Questions to resolve before implementing

- **One event per show, or one event per employee per show?**
  - One per show: all placements in one event, simpler, but everyone sees everyone else's assignment
  - One per employee: each person only sees their own event — cleaner for individual calendars, but 3x the events
- **Show duration**: not in the data — needs a default (2 hours) or a configurable field added to `RotatedEngagement`
- **`createCalendarJSON` vs `scheduleToCalendarJSON`**: these appear to be duplicates — one should be removed

---

## Data flow

```text
RotatedSchedule
  → scheduleToCalendarJSON()   // transform domain data into calendar-friendly shape
  → CalendarJSON
  → createCalendarFile()       // serialize CalendarJSON into ICS format string
  → CalendarFile (string)
  → write to disk
```

---

## Pseudocode

### `EventJSON` (needs expanding)

```text
EventJSON {
  cityName: string
  date: string            // ISO datetime, local time (no offset)
  timezone: string        // IANA timezone, e.g. "America/New_York"
  placements: { employee: string, location: string }[]
  duration?: number       // minutes, default e.g. 150
}
```

---

### `showToCalendarEventJSON(show, engagement)`

Note: current signature only takes `show` — it also needs `engagement` for `cityName` and `timezone`

```text
function showToCalendarEventJSON(show: RotatedShow, engagement: RotatedEngagement): EventJSON
  return {
    cityName:   engagement.town
    date:       show.date
    timezone:   engagement.timezone
    placements: show.placements
  }
```

---

### `scheduleToCalendarJSON(schedule: RotatedSchedule): CalendarJSON`

```text
function scheduleToCalendarJSON(schedule)
  events = []
  for each engagement in schedule.engagements
    for each show in engagement.shows
      events.push(showToCalendarEventJSON(show, engagement))
  return { events }
```

---

### `createCalendarFile(calendarJSON): CalendarFile`

```text
function createCalendarFile(calendarJSON)
  lines = []
  lines.push("BEGIN:VCALENDAR")
  lines.push("VERSION:2.0")
  lines.push("PRODID:-//Schedulator//EN")
  lines.push("CALSCALE:GREGORIAN")

  for each event in calendarJSON.events
    placementSummary = join(event.placements, ", ") as "Location:Employee"
    placementDetail  = join(event.placements, "\n") as "Location:Employee"

    lines.push("BEGIN:VEVENT")
    lines.push("DTSTART;TZID=<event.timezone>:<event.date formatted as YYYYMMDDTHHmmss>")
    lines.push("DTEND;TZID=<event.timezone>:<start + duration>")
    lines.push("SUMMARY:<event.cityName> - <show time>: <placementSummary>")
    lines.push("DESCRIPTION:<placementDetail>")
    lines.push("LOCATION:<event.cityName>")
    lines.push("END:VEVENT")

  lines.push("END:VCALENDAR")
  return join(lines, "\r\n")   // ICS spec requires CRLF line endings (RFC 5545)
```

---

### `validateCalendarFile(file): boolean`

```text
function validateCalendarFile(file)
  check file starts with "BEGIN:VCALENDAR"
  check file ends with "END:VCALENDAR"
  check each "BEGIN:VEVENT" has a matching "END:VEVENT"
  check each VEVENT has DTSTART, DTEND, SUMMARY
  return true if all pass, false otherwise
```

---

## Sample output

```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Schedulator//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
DTSTART;TZID=America/New_York:20250101T190000
DTEND;TZID=America/New_York:20250101T213000
SUMMARY:New York - 7:00PM - Employee 1@Location 1, Employee 2@Location 2, Employee 3@Location 3
DESCRIPTION:Employee 1: Location 1\nEmployee 2: Location 2\nEmployee 3: Location 3
LOCATION:New York
END:VEVENT
END:VCALENDAR
```
