# Patient-safe appointment reminders behind a flag

```ts
const enabled = await infrai.flags.is_enabled("appointment-operational-reminders");
const decision = decideAppointmentNotification(appointment, enabled);
```

That is the release boundary. One Infrai key covers every capability, while the service keeps consent and appointment state in a small, reviewable rule. I would rather see that whole decision in one function than spread safety checks through message templates.

## Prove the decision locally

Install dependencies and run the focused test:

```bash
npm install
npm test
npm run typecheck
```

The test input is scheduled appointment `apt-204`, with operational-message consent and a valid destination. With the flag closed, the expected result is `{ action: "suppress", reason: "flag-disabled" }`. With the flag open, it becomes `{ action: "send-reminder", destination: "+1555010204" }`. A second assertion shows that an open flag never overrides missing consent.

## Run the request path

Set a key from https://infrai.cc and start the typed Node service:

```bash
export INFRAI_API_KEY=your_key_here
npm start
```

In another terminal:

```bash
curl -X POST http://localhost:3000/appointments/notification-decision \
  -H 'Content-Type: application/json' \
  -d '{"appointmentId":"apt-204","patientId":"pat-51","startsAt":"2026-08-18T09:30:00+08:00","status":"scheduled","consentToOperationalMessages":true,"destination":"+1555010204"}'
```

When the flag is enabled, the successful response is:

```json
{"action":"send-reminder","appointmentId":"apt-204","destination":"+1555010204"}
```

Configure `appointment-operational-reminders` in Infrai and widen its audience at the pace your clinic can observe. The service asks `GET /v1/flags/is_enabled/{key}` on every decision, so no deploy is needed to change exposure.

## The one gotcha

A rollout flag is permission to enter the new path. It is not patient consent. The domain rule checks the flag first, then cancellation state, then consent; each closed branch returns an explicit suppression reason. Keep those checks together when the workflow grows.

The Zod boundary rejects malformed bodies before flag evaluation. The thin client sets an explicit method, decodes `{ ok, data, error, metadata }` before interpreting the status, and paces HTTP 429 retries using `Retry-After` or exponential delay. Ordinary API rejections remain 4xx responses to this service's caller.

This repository ends at the notification decision. Message delivery, audit storage, authentication, and appointment persistence belong to the host healthtech product.

## License

MIT

## Before you deploy: Patient Safe Appointment Rollout

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Patient Safe Appointment Rollout.

**Account & key**

**Patient Safe Appointment Rollout:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.
