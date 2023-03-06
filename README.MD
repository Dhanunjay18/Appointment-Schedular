## GDC Application Task

GDC Fellowship Program for students who have completed the Lite Program. To be considered, students must complete a coding challenge using NodeJS and JavaScript/Typescript. The challenge involves building a web application using NodeJS and TailwindCSS to manage appointments.

The application should have the following mandatory features:

-   View a list of all currently scheduled appointments.
-   Create a new appointment in an available time slot.
-   Delete an existing appointment.
-   Edit the details of an appointment, except for the time slot.

Additionally, the following optional features can be attempted for extra credit:

-   If a new appointment is being scheduled in a time slot with existing appointments, the user should be given the option to delete the overlapping appointments and save the new appointment.
-   Suggest the closest available time slot if the user tries to schedule an appointment in a time slot with existing appointments.

For example, if a user tries to schedule an appointment from 4:00 PM to 5:00 PM, and there are existing appointments from 4:15 PM to 4:30 PM, 4:30 PM to 5:00 PM, 5:15 PM to 6:00 PM, and 7:00 PM to 8:00 PM, the recommended available time slot would be 6:00 PM to 7:00 PM. If the user accepts the recommendation, the new appointment would be saved, and the appointments would look like this:

-   Event 1: 4:15 PM to 4:30 PM
-   Event 2: 4:30 PM to 5:00 PM
-   Event 3: 5:15 PM to 6:00 PM
-   New Event: 6:00 PM to 7:00 PM
-   Event 4: 7:00 PM to 8:00 PM
