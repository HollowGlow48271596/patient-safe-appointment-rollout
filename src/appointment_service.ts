import { createServer } from "node:http";
import { ZodError } from "zod";
import { AppointmentRequest, decideAppointmentNotification } from "./appointment_notification.js";
import { InfraiError, infrai } from "./infrai_flags.js";

const FLAG_KEY = "kb_release_gate_demo";

async function readJson(request: AsyncIterable<unknown>): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk as Uint8Array));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "POST" || request.url !== "/appointments/notification-decision") {
    response.writeHead(404).end(JSON.stringify({ error: "route not found" }));
    return;
  }

  try {
    const appointment = AppointmentRequest.parse(await readJson(request));
    const enabled = await infrai.flags.is_enabled(FLAG_KEY);
    const decision = decideAppointmentNotification(appointment, enabled);
    response.writeHead(200).end(JSON.stringify(decision));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      response.writeHead(400).end(JSON.stringify({ error: "invalid appointment request" }));
      return;
    }
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) {
      response.writeHead(error.status).end(JSON.stringify({ error: error.message }));
      return;
    }
    response.writeHead(502).end(JSON.stringify({ error: "feature decision unavailable" }));
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Appointment decision service listening on http://localhost:${port}`));
