import { z } from "zod";

export const AppointmentRequest = z.object({
  appointmentId: z.string().min(1),
  patientId: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  status: z.enum(["scheduled", "cancelled"]),
  consentToOperationalMessages: z.boolean(),
  destination: z.string().min(3),
});

export type Appointment = z.infer<typeof AppointmentRequest>;
export type NotificationDecision =
  | { action: "send-reminder"; appointmentId: string; destination: string }
  | { action: "suppress"; appointmentId: string; reason: "flag-disabled" | "cancelled" | "no-consent" };

export function decideAppointmentNotification(
  appointment: Appointment,
  featureEnabled: boolean,
): NotificationDecision {
  if (!featureEnabled) {
    return { action: "suppress", appointmentId: appointment.appointmentId, reason: "flag-disabled" };
  }
  if (appointment.status === "cancelled") {
    return { action: "suppress", appointmentId: appointment.appointmentId, reason: "cancelled" };
  }
  if (!appointment.consentToOperationalMessages) {
    return { action: "suppress", appointmentId: appointment.appointmentId, reason: "no-consent" };
  }
  return {
    action: "send-reminder",
    appointmentId: appointment.appointmentId,
    destination: appointment.destination,
  };
}
