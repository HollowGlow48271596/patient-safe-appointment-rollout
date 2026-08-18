import assert from "node:assert/strict";
import test from "node:test";
import { AppointmentRequest, decideAppointmentNotification } from "../src/appointment_notification.js";

const appointment = AppointmentRequest.parse({
  appointmentId: "apt-204",
  patientId: "pat-51",
  startsAt: "2026-08-18T09:30:00+08:00",
  status: "scheduled",
  consentToOperationalMessages: true,
  destination: "+1555010204",
});

test("a consented scheduled appointment is notified only after the flag opens", () => {
  assert.deepEqual(decideAppointmentNotification(appointment, false), {
    action: "suppress",
    appointmentId: "apt-204",
    reason: "flag-disabled",
  });
  assert.deepEqual(decideAppointmentNotification(appointment, true), {
    action: "send-reminder",
    appointmentId: "apt-204",
    destination: "+1555010204",
  });
});

test("consent remains a hard boundary when the flag is open", () => {
  assert.equal(
    decideAppointmentNotification({ ...appointment, consentToOperationalMessages: false }, true).action,
    "suppress",
  );
});
