// Hand-written row types for the tables the app touches.
// Regenerate richer types with: supabase gen types typescript

export interface Profile {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string | null;
  phone: string | null;
  role: "super_admin" | "admin" | "sales" | "designer" | "operator" | "customer";
  department_id: string | null;
  is_active: boolean;
}

export interface Organization {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  subscription_status: string;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  color_hex: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Customer {
  id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  total_spend_centavos: number;
  total_orders: number;
  loyalty_points: number;
  is_active: boolean;
  created_at: string;
}

export interface Quote {
  id: string;
  organization_id: string;
  quote_number: string;
  customer_id: string;
  job_type: string;
  department_id: string | null;
  qty: number;
  rush: boolean;
  due_date: string | null;
  notes: string | null;
  subtotal_centavos: number;
  discount_centavos: number;
  total_centavos: number;
  status: string;
  valid_until: string | null;
  converted_to_order_id: string | null;
  created_at: string;
  customers?: Pick<Customer, "id" | "full_name" | "phone"> | null;
}

export interface Order {
  id: string;
  organization_id: string;
  order_number: string;
  customer_id: string;
  quote_id: string | null;
  job_type: string;
  department_id: string | null;
  qty: number;
  rush: boolean;
  due_date: string | null;
  notes: string | null;
  internal_notes: string | null;
  delivery_type: "pickup" | "delivery";
  kanban_stage_id: string | null;
  subtotal_centavos: number;
  delivery_fee_centavos: number;
  discount_centavos: number;
  total_centavos: number;
  payment_status: "unpaid" | "partial" | "paid";
  status: string;
  created_at: string;
  customers?: Pick<Customer, "id" | "full_name" | "phone"> | null;
  departments?: Pick<Department, "id" | "name" | "color_hex"> | null;
}

export interface KanbanStage {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  color_hex: string | null;
  sort_order: number;
  is_terminal: boolean;
}

export interface Message {
  id: string;
  order_id: string;
  sent_by: string | null;
  sent_by_customer_id: string | null;
  content: string | null;
  is_internal: boolean;
  created_at: string;
  profiles?: Pick<Profile, "id" | "full_name"> | null;
}

export interface OrderFile {
  id: string;
  order_id: string;
  version_number: number;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  storage_path: string;
  status: string;
  created_at: string;
}

export interface SmsSetting {
  id: string;
  event_type: string;
  is_active: boolean;
}

export interface BrandSettings {
  id: string;
  organization_id: string;
  primary_color: string | null;
  secondary_color: string | null;
  sms_sender_name: string | null;
  portal_tagline: string | null;
  invoice_footer: string | null;
}
