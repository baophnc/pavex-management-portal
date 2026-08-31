import { apiRequest } from "@/lib/api/client";
import type {
  AssignWorkforceHubInput,
  CreateWorkforceMemberInput,
  SetWorkforceCapacityInput,
  SetWorkforceStatusInput,
  WorkforceAudit,
  WorkforceMember,
  WorkforcePage,
} from "@/features/operations/contracts";

function jsonBody(value: unknown) {
  return JSON.stringify(value);
}

export function getWorkforce(params: URLSearchParams) {
  const query = params.toString();
  return apiRequest<WorkforcePage>(
    `admin/operations/workforce${query ? `?${query}` : ""}`,
  );
}

export function getWorkforceMember(id: string) {
  return apiRequest<WorkforceMember>(
    `admin/operations/workforce/${encodeURIComponent(id)}`,
  );
}

export function createWorkforceMember(input: CreateWorkforceMemberInput) {
  return apiRequest<WorkforceMember>("admin/operations/workforce", {
    method: "POST",
    body: jsonBody(input),
  });
}

export function setWorkforceStatus(id: string, input: SetWorkforceStatusInput) {
  return apiRequest<WorkforceMember>(
    `admin/operations/workforce/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: jsonBody(input) },
  );
}

export function setWorkforceCapacity(
  id: string,
  input: SetWorkforceCapacityInput,
) {
  return apiRequest<WorkforceMember>(
    `admin/operations/workforce/${encodeURIComponent(id)}/capacity`,
    { method: "PATCH", body: jsonBody(input) },
  );
}

export function assignWorkforceHub(id: string, input: AssignWorkforceHubInput) {
  return apiRequest<WorkforceMember>(
    `admin/operations/workforce/${encodeURIComponent(id)}/hubs`,
    { method: "POST", body: jsonBody(input) },
  );
}

export function unassignWorkforceHub(
  id: string,
  hubId: string,
  reason?: string,
) {
  const query = new URLSearchParams();
  if (reason?.trim()) query.set("reason", reason.trim());
  return apiRequest<WorkforceMember>(
    `admin/operations/workforce/${encodeURIComponent(id)}/hubs/${encodeURIComponent(hubId)}${query.size ? `?${query}` : ""}`,
    { method: "DELETE" },
  );
}

export function getWorkforceAudit(id: string) {
  return apiRequest<WorkforceAudit[]>(
    `admin/operations/workforce/${encodeURIComponent(id)}/audit`,
  );
}
