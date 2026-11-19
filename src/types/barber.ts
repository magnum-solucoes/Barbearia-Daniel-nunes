export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  active: boolean;
  sort_order: number;
  image_url: string | null;
  /** Promo pricing for specific weekdays (0=Sun..6=Sat). */
  promo_enabled: boolean;
  promo_price: number | null;
  promo_weekdays: number[] | null;
  /** When true the service is bookable ONLY on its promo weekdays. */
  promo_only: boolean;
  /** Number of people served in a single appointment (2 for family packages). */
  participants_count: number;
  /** Field labels for each participant when participants_count > 1. */
  participant_labels: string[] | null;
}

/** Optional upsell offered during online booking (product or additional service). */
export interface BookingProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  max_quantity: number;
  active: boolean;
  sort_order: number;
  image_url: string | null;
  /** 'product' is a physical item (no time). 'service' is an add-on that adds time. */
  kind: 'product' | 'service';
  /** Extra minutes this add-on adds to the appointment (0 for products). */
  duration_minutes: number;
  created_at?: string;
  updated_at?: string;
}

/** Product actually reserved on an appointment, with price snapshot at booking time. */
export interface AppointmentProduct {
  id: string;
  appointment_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  product_price_snapshot: number;
  /** Extra minutes this add-on added to the appointment at booking time. */
  duration_minutes_snapshot: number;
  quantity: number;
  status: 'reserved' | 'removed';
  created_at: string;
  updated_at: string;
}

export interface BusinessHour {
  id: string;
  weekday: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
}

export interface Settings {
  id: number;
  business_name: string | null;
  owner_name: string | null;
  about: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  address: string | null;
  maps_url: string | null;
  timezone: string;
  booking_enabled: boolean;
  buffer_minutes: number;
  min_advance_minutes: number;
  late_tolerance_minutes: number;
}

export interface Appointment {
  id: string;
  service_id: string | null;
  service_name_snapshot: string | null;
  service_price_snapshot: number | null;
  service_duration_snapshot: number | null;
  client_name: string;
  client_phone: string;
  start_at: string;
  end_at: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  /** Participant names for two-person packages (empty for individual services). */
  participant_names: string[] | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentEvent {
  id: string;
  appointment_id: string | null;
  event_type: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  actor: string | null;
  idempotency_key: string | null;
  created_at: string;
}

export type CashMethod = 'pix' | 'cash' | 'debit' | 'credit' | 'other';

export interface CashEntry {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  method: CashMethod | null;
  appointment_id: string | null;
  description: string | null;
  entry_date: string;
  created_at: string;
}

export interface BlockedSlot {
  id: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
}