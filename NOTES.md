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

- Shows are stored in chronological order; the rotation is computed **backwards** from the last show
- The **last show** of every engagement gets the initial (unrotated) employee assignment
- Each earlier show rotates the employee list forward by one step relative to the show after it
- Example with 3 locations and 3 employees:
  - Last show: Employee1→LocationA, Employee2→LocationB, Employee3→LocationC
  - Second-to-last: Employee2→LocationA, Employee3→LocationB, Employee1→LocationC
  - Third-to-last: Employee3→LocationA, Employee1→LocationB, Employee2→LocationC
- **`keepFirstShow`**: pass `true` to `generateRotation` or `forceGenerateRotation` to lock in the first show's assignment using the initial employee order, leaving it out of the backwards rotation. If the first show is already a string it will still have a placements object generated for it — it just won't be rotated.
- **Manual overrides**: if a show already has placements defined in the JSON (e.g. someone needs to be moved due to a doctor's appointment), `generateRotation` will leave that show alone. Use `forceGenerateRotation` to ignore all existing placements and recompute everything from scratch.

---

## DATA TYPES

- **`Schedule`** (current): the inclusive input/intermediate type. Shows can be either date strings or objects with `date` + `placements`. Timezone is optional. This is the correct shape for user input — there's no need for a more restrictive input type since timezones are valid optional fields.
- **`RotatedSchedule`**: the fully generated output type. All shows as objects with placements, timezone required on every engagement. Needed to make `createCalendarFile` safe at the type level — without it, that function can't enforce at compile time that every show has placements and every engagement has a timezone.

`getSimpleSchedule()` is an internal utility that strips placements back to date strings before a force-rotation. It doesn't represent a distinct user-facing format and doesn't need its own type.

---

## TIMEZONE LOOKUP

Timezone resolution lives in `src/utils/askUserForTimezone.ts` as the `Timezones` class, intentionally isolated and async for future GUI replacement. Current implementation uses Bun's built-in `prompt()`. Responses are cached in `Timezones.cache` (a `Map`) so each city is only asked once per run. Ctrl+C exits cleanly with a message.

Pass an `extCachePath` to the `Schedule` constructor to persist the cache to disk between runs. `readCache()` is called at the start of `generateRotation` and `writeCache()` at the end.

Resolution order:

1. City found in in-memory cache → return immediately
2. Exactly one match in `city-timezones` → return automatically
3. Multiple matches → numbered list, user picks or enters their own
4. No matches → user enters a timezone string manually

---

## STILL TODO

- [ ] Implement `createCalendarFile` — generate a `.ics` file from a `RotatedSchedule`
- [ ] Create a GUI
