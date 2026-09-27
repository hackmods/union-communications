import { authorizeIncidentAdmin, issueIncidentStepUp, noStoreJson, requestId } from "@/lib/site-admin/incident-http";
import { incidentStepUpSchema } from "@/lib/site-admin/incident-validation";

export async function POST(request: Request) {
  const authorization = await authorizeIncidentAdmin();
  if (!authorization.ok) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = incidentStepUpSchema.safeParse(body);
  if (!parsed.success) return noStoreJson({ error: "Check the action and verification code." }, { status: 400 });

  const id = requestId();
  try {
    const result = await issueIncidentStepUp({
      actorId: authorization.access.actorId,
      code: parsed.data.code,
      action: parsed.data.action,
      resourceId: parsed.data.resourceId,
      requestId: id,
    });
    if (!result.ok) return result.response;
    return noStoreJson({ token: result.token, expiresInSeconds: 60 }, { headers: { "X-Request-Id": id } });
  } catch {
    return noStoreJson({ error: "Could not verify access to the incident register." }, { status: 503 });
  }
}
