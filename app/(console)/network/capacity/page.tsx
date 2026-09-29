import { NetworkCapacity } from "@/features/network/capacity";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NetworkCapacityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <NetworkCapacity
      initialTrackingCode={first(params.trackingCode)?.trim() ?? ""}
      initialRouteRevision={first(params.routeRevision)?.trim() ?? ""}
    />
  );
}
