-- Dodaj unique constraint na timesheet_days(timesheet_id, date)
-- Potrebno za upsert onConflict u saveTimesheetDays action

alter table public.timesheet_days
  add constraint timesheet_days_timesheet_id_date_key
  unique (timesheet_id, date);
