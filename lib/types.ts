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

export interface Service {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string | null;
  unit_price_centavos: number;
  is_active: boolean;
}

export interface DiscountRequest {
  id: string;
  organization_id: string;
  order_id: string | null;
  quote_id: string | null;
  customer_id: string | null;
  from_customer: boolean;
  amount_centavos: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  decision_note: string | null;
  created_at: string;
  orders?: { id: string; order_number: string; total_centavos: number } | null;
  customers?: Pick<Customer, "id" | "full_name"> | null;
}

export interface Delivery {
  id: string;
  organization_id: string;
  order_id: string;
  delivery_address: string | null;
  city: string | null;
  rider_name: string | null;
  tracking_number: string | null;
  notes: string | null;
  fee_centavos: number;
  dispatched_at: string | null;
  delivered_at: string | null;
  status: "pending" | "out_for_delivery" | "delivered" | "failed";
  orders?: {
    id: string;
    order_number: string;
    customers?: Pick<Customer, "id" | "full_name" | "phone"> | null;
  } | null;
}

export interface Feedback {
  id: string;
  order_id: string;
  customer_id: string;
  rating: number;
  comment: string | null;
  flagged_for_review: boolean;
  reviewed_at: string | null;
  submitted_at: string;
  orders?: { id: string; order_number: string } | null;
  customers?: Pick<Customer, "id" | "full_name"> | null;
}

export interface LoyaltySettings {
  id: string;
  organization_id: string;
  points_per_peso: number;
  redeem_rate: number;
  milestone_orders: number;
  milestone_reward_description: string | null;
  is_active: boolean;
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  transaction_type: "earned" | "redeemed" | "adjusted" | "expired";
  points: number;
  balance_after: number;
  notes: string | null;
  created_at: string;
  customers?: Pick<Customer, "id" | "full_name"> | null;
}

export interface IntegrationSetting {
  id: string;
  organization_id: string;
  integration: string;
  is_enabled: boolean;
  last_synced_at: string | null;
}

export interface QrCode {
  id: string;
  order_id: string;
  qr_data: string;
  public_url: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  order_id: string;
  invoice_number: string;
  subtotal_centavos: number;
  delivery_fee_centavos: number;
  discount_centavos: number;
  total_centavos: number;
  amount_paid_centavos: number;
  payment_status: "unpaid" | "partial" | "paid";
  due_date: string | null;
  created_at: string;
  orders?: {
    id: string;
    order_number: string;
    job_type: string;
    customer_id: string;
    customers?: Pick<Customer, "id" | "full_name" | "phone"> | null;
  } | null;
}

export interface Payment {
  id: string;
  invoice_id: string;
  customer_id: string;
  amount_centavos: number;
  method: "cash" | "gcash" | "bank_transfer" | "maya" | "other";
  reference_number: string | null;
  notes: string | null;
  paid_at: string;
}

export interface Material {
  id: string;
  organization_id: string;
  name: string;
  unit: string;
  current_stock: number;
  reorder_threshold: number;
  cost_per_unit_centavos: number;
  department_id: string | null;
  is_active: boolean;
  departments?: Pick<Department, "id" | "name"> | null;
}

export interface InventoryTransaction {
  id: string;
  material_id: string;
  transaction_type: "deduct" | "restock" | "adjustment" | "initial";
  quantity: number;
  notes: string | null;
  created_at: string;
  materials?: Pick<Material, "id" | "name" | "unit"> | null;
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  organization_id: string;
  branch_id: string | null;
  department_id: string | null;
  employee_code: string | null;
  full_name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  employment_type: "full_time" | "part_time" | "contract" | "seasonal";
  status: "active" | "on_leave" | "terminated";
  hire_date: string | null;
  salary_centavos: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  branches?: Pick<Branch, "id" | "name"> | null;
  departments?: Pick<Department, "id" | "name"> | null;
}

export interface BrandSettings {
  id: string;
  organization_id: string;
  logo_path: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  sms_sender_name: string | null;
  portal_tagline: string | null;
  invoice_footer: string | null;
}
