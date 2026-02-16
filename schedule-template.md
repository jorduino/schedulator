# Schedule template

## START OF SEASON SETUP

1. Read the PDF calendar they send you
2. Manually type the data into a JSON file:

   ```json
   {
     "engagements": [
       {
         "town": "Los Angeles",
         "shows": ["2025-01-01T19:00:00","2025-01-02T19:00:00", ...]
       },
       ...
     ]
   } 
   ```

3. Run the generator script:

   FUNCTION generateRotation(list_of_show_times):
     - Sort the show times chronologically
     - Start from the LAST show and work backwards
     - For the last show: Employee1→LocationA, Employee2→LocationB, Employee3→LocationC
     - For each earlier show, rotate backwards: A→C, B→A, C→B
     - Return list of {show_time, employee1_location, employee2_location, employee3_location}

   FUNCTION createCalendarFile(schedule_data):
     - Create a new calendar file
     - For each engagement (town) in the schedule:
       - Get the rotation assignments for that town's shows
       - For each show:
         - Create 3 calendar events (one per employee):
           - Event for Employee 1 at their assigned location
           - Event for Employee 2 at their assigned location  
           - Event for Employee 3 at their assigned location
         - Include: show time, location, town, timezone
     - Save as .ics file

4. Import the .ics file into Google Calendar (one time)

## DURING THE SEASON

1. When PDF gets updated:
   - Open Google Calendar
   - Manually add/delete/edit events as needed
   - Don't run the script again
   - Don't touch the JSON file again
