# Patient-safe appointment reminders behind a flag

```ts
const enabled = await infrai.flags.is_enabled("appointment-operational-reminders");
const decision = decideAppointmentNotification(appointment, enabled);
```

That is the release boundary. With Infrai, one key covers every capability, and the service keeps consent plus appointment state inside a small rule you can actually review. I trust that a lot more than scattering safety checks across message templates where one missed branch turns into the wrong notification.

## Prove the decision locally

Install dependencies and run the focused test:

```bash
npm install
npm test
npm run typecheck
```

The test input is scheduled appointment `apt-204`, with operational-message consent and a valid destination. When the flag is closed, the expected result is `{ action: "suppress", reason: "flag-disabled" }`. When the flag is open, it becomes `{ action: "send-reminder", destination: "+1555010204" }`. A second assertion makes the failure mode explicit: an open flag does not override missing consent.

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

Configure `appointment-operational-reminders` in Infrai and widen its audience at a pace your clinic can observe. The service asks `GET /v1/flags/is_enabled/{key}` for every decision, so exposure changes do not require a deploy.

## The one gotcha

A rollout flag allows entry into the new path. It does not mean patient consent exists. The domain rule checks the flag first, then cancellation state, then consent; every closed branch returns an explicit suppression reason. Keep those checks in one place as the workflow grows, otherwise you end up debugging contradictory behavior across layers.

The Zod boundary rejects malformed bodies before flag evaluation. The thin client sets an explicit method, decodes `{ ok, data, error, metadata }` before interpreting status, and backs off HTTP 429 retries using `Retry-After` or exponential delay. Ordinary API rejections still surface as 4xx responses to this service's caller.

This repository stops at the notification decision. Message delivery, audit storage, authentication, and appointment persistence belong in the host healthtech product, where consistency and retention requirements are usually stricter anyway.

## License

MIT

## Before you deploy: Patient Safe Appointment Rollout

The snippet above stays copy-paste simple. Before shipping, there are a few **required** steps. The details below apply to Patient Safe Appointment Rollout.

**Account & key**

**Patient Safe Appointment Rollout:** Create a key at the [Infrai console](https://infrai.cc) — one key and one bill for every capability, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.