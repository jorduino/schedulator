# Schedule template

## START OF SEASON SETUP

1. Read the PDF calendar they send you
2. Manually type the data into a JSON file (simple format — no timezone required if it can be inferred from the city):

   ```json
   {
     "engagements": [
       {
         "town": "Los Angeles",
         "shows": ["2025-01-01T19:00:00", "2025-01-02T19:00:00"]
       }
     ]
   }
   ```

3. Run the generator script. It will:
   - Ask for a timezone for any city that doesn't have one and can't be inferred
   - Generate the rotation schedule (see rotation rules below)
   - Output a `.ics` calendar file

4. Import the `.ics` file into Google Calendar (one time)

## DURING THE SEASON

1. When PDF gets updated:
   - Open Google Calendar
   - Manually add/delete/edit events as needed
   - Don't run the script again
   - Don't touch the JSON file again

---

## ROTATION RULES

- The **last show of every engagement** always has the same fixed assignment (same person always does strike/load-out at the same location)
- Earlier shows in an engagement are derived by rotating **backwards** from the last show
- Example with 3 locations and 3 employees:
  - Last show: Employee1→LocationA, Employee2→LocationB, Employee3→LocationC
  - Second-to-last: Employee2→LocationA, Employee3→LocationB, Employee1→LocationC
  - Third-to-last: Employee3→LocationA, Employee1→LocationB, Employee2→LocationC
- **Manual overrides**: if a show already has placements defined in the JSON (e.g. someone needs to be moved due to a doctor's appointment), `generateRotation` will leave that show alone. Use `forceGenerateRotation` to ignore all existing placements and recompute everything from scratch.

---

## DATA TYPES (TODO: implement these as Zod schemas + inferred types)

Three distinct schedule shapes are needed:

- **`SimpleSchedule`**: what the user provides as input. Only `town` and show date strings. No timezone, no placements.
- **`RotatedSchedule`**: the fully generated output. `town`, `timezone` (required), and shows as objects with `date` + `placements`.
- **`Schedule`** (current generic): the mixed intermediate type that allows shows to be either strings or objects. Used internally.

Currently all three are represented by the same `Schedule` class and `Engagement` type. The return types of `getSimpleSchedule()`, `generateRotation()`, and `forceGenerateRotation()` should eventually reflect these distinctions.

---

## STILL TODO

- [ ] Create distinct Zod schemas and types for `SimpleSchedule` and `RotatedSchedule`
- [ ] Implement the actual rotation math in `rotateOneEngagement` (compute placements from employee/location lists and show index relative to last show)
- [ ] Implement `timezoneFromTown` — prompt the user via CLI when timezone is missing, cache responses
- [ ] Implement `createCalendarFile` — generate a `.ics` file from a `RotatedSchedule`
