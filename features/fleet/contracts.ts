export type FleetTripStatus = "IN_PROGRESS" | "ARRIVED";

export type FleetHubRef = {
  id: string;
  code: string;
  name: string;
  /** Where the hub is on the map, when its coordinates are set. */
  lat: number | null;
  lng: number | null;
};

export type FleetPosition = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  speedMps: number | null;
  headingDeg: number | null;
  batteryPct: number | null;
  mocked: boolean;
  recordedAt: string;
  receivedAt: string | null;
};

export type FleetTrip = {
  id: string;
  status: FleetTripStatus;
  driverUserId: string;
  driverEmail: string | null;
  vehiclePlate: string | null;
  laneCode: string;
  fromHub: FleetHubRef;
  toHub: FleetHubRef;
  plannedDepartureAt: string;
  plannedArrivalAt: string;
  startedAt: string;
  startSource: "DRIVER" | "DEPART_SCAN";
  arrivedAt: string | null;
  endSource: "DRIVER" | "ALL_RECEIVED" | null;
  distanceKm: number | null;
  travelledKm: number;
  pointCount: number;
  position: FleetPosition | null;
  late: boolean;
  minutesLate: number | null;
  signalLost: boolean;
};

export type FleetTrackPoint = {
  lat: number;
  lng: number;
  recordedAt: string;
  speedMps: number | null;
  accuracyM: number;
  mocked: boolean;
};

export type FleetTrack = {
  tripId: string;
  points: FleetTrackPoint[];
  thinned: boolean;
};

export const fleetStartSourceLabels: Record<FleetTrip["startSource"], string> = {
  DRIVER: "Tài xế bấm bắt đầu",
  DEPART_SCAN: "Tự bắt đầu khi quét lên xe",
};

export const fleetEndSourceLabels: Record<NonNullable<FleetTrip["endSource"]>, string> = {
  DRIVER: "Tài xế bấm đã tới",
  ALL_RECEIVED: "Bưu cục đến đã nhập đủ kiện",
};
