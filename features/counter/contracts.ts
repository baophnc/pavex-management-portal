import type { GoodsCategory } from "@/features/shipments/contracts";

export type CounterAddress = {
  contactName: string;
  contactPhone: string;
  addressLine: string;
  provinceCode: string;
  wardCode: string;
};

export type CounterParcel = {
  description: string;
  quantity: number;
  category: GoodsCategory;
  isFragile: boolean;
};

export type ShippingFeePayer = "SENDER" | "RECIPIENT";

/** A walk-in shipment booked at a hub counter; the quote must start at that hub's ward. */
export type CreateCounterShipmentRequest = {
  hubId: string;
  quoteId: string;
  sender: CounterAddress;
  recipient: CounterAddress;
  shippingFeePayer: ShippingFeePayer;
  parcels: CounterParcel[];
  note: string | null;
  /** The cash taken now: the whole fee when the sender pays, otherwise 0. */
  cashReceived: number;
};

export type CounterShipmentCreated = {
  trackingCode: string;
  status: string;
};

/** A walk-in customer saved by phone in the counter address book. */
export type CounterContact = {
  id: string;
  phone: string;
  name: string;
  addressLine: string;
  provinceCode: string;
  provinceName: string | null;
  wardCode: string;
  wardName: string | null;
  useCount: number;
  lastUsedAt: string;
};

export type CounterSettlementKind = "PAYOUT_COD" | "COLLECT_RETURN_FEE";
export type CounterSettlementStatus = "PENDING" | "DONE";

/** Cash the counter owes a walk-in sender (their COD) or is owed by them (a return's fee). */
export type CounterSettlement = {
  id: string;
  shipmentId: string;
  trackingCode: string;
  hubId: string;
  kind: CounterSettlementKind;
  amount: number;
  senderName: string;
  senderPhone: string;
  status: CounterSettlementStatus;
  completedByUserId: string | null;
  completedAt: string | null;
  note: string | null;
  createdAt: string;
};

export type ParcelLabel = {
  parcelCode: string;
  sequence: number;
  serviceLevel: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  destinationHubCode: string;
  chargeableWeightKg: number;
  isFragile: boolean;
  amountToCollect: number;
  note: string | null;
  qrPayload: string;
};

export type ShipmentLabels = {
  trackingCode: string;
  parcelCount: number;
  amountToCollect: number;
  parcels: ParcelLabel[];
};
