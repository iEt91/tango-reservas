# Availability Regression Tests

This document defines the official rules that the reservation system must keep
stable across Web, Reservations, Floor Plan, and Calendar.

## Official overlap rule

Two reservation intervals overlap when:

`startA < endB && endA > startB`

The comparison must be done in minutes, not by raw string comparison.

## Table blocking states

Blocking states:

- `pending` when the reservation already has one or more tables assigned
- `confirmed`

Non-blocking states:

- `cancelled`
- `no_show`
- `completed` for future availability
- `pending` without assigned tables

Base table states that always block:

- `blocked`
- `out_of_service`

Base table states that are visual only and must not hard-block by themselves:

- `reserved`
- `occupied`

## Real duration

The real duration of a reservation is resolved in this order:

1. service duration
2. business default reservation duration
3. safe fallback of 120 minutes

The slot duration is only the timeline granularity. It is not the same thing as
the reservation duration.

The regression script also checks that:

- service duration wins over the default duration when it exists
- public auto-confirmation chooses a table when available and stays pending when it is not

## Business hours vs reservation hours

There are two separate concepts:

- Business hours: when the venue opens and closes
- Reservation admission window: when new bookings can start

The public widget must use the reservation admission window, not
`closing - duration`.

If `allowReservationsAfterClose` is enabled, a booking may start before the end
of the admission window even if its occupancy ends after closing.
The reservation admission window can also differ from the venue opening hours
when the business is configured that way.

## Public web behavior

The public web must only show time slots that can actually be booked.

For each candidate slot:

- calculate the reservation interval
- load the real tables of the business
- exclude tables blocked by hard base state
- exclude tables with insufficient capacity
- exclude tables occupied by another active reservation that overlaps
- show the slot only if at least one valid table remains

The customer should not see hidden/blocked reasons. If nothing is available,
the widget should show a single empty state.

## Floor plan behavior

The floor plan must use the same overlap logic as reservations and the public
widget.

- 14:30 cannot occupy a 15:00 reservation
- 15:00 must show the assigned table occupied
- 15:30 must still show it occupied if the interval overlaps
- the exact end minute must release the table

## Manual validation

Recommended checks:

1. Create a reservation at 15:00 for 150 minutes on Mesa 1.
2. Try to assign Mesa 1 to a 15:30 reservation. It must fail.
3. Try Mesa 2 at 15:30. It must succeed if Mesa 2 is free.
4. Try Mesa 1 again at 17:30. It must succeed if the interval no longer overlaps.
5. Edit the original reservation and confirm Mesa 1 does not block against itself.
6. Open `/demuru` and verify late valid slots still appear.
7. Open `/local/plano` and verify the occupied slot changes at the exact time boundaries.
8. Run `npm run test:availability`.
