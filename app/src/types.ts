export type Role = 'agent' | 'investor' | 'remodeler';

export const ROLE_LABELS: Record<Role, string> = {
  agent: 'Real Estate Agent',
  investor: 'Investor / Flipper',
  remodeler: 'Remodeler',
};

export const PIPELINE_STATUSES = [
  'New Lead',
  'Contacted',
  'Warm',
  'Appointment',
  'Offer Made',
  'Under Contract',
  'Closed',
  'Dead',
] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export const PROPERTY_TYPES = [
  'Single Family',
  'Multi-Family',
  'Condo',
  'Townhouse',
  'Commercial',
  'Land',
];

export const LEAD_SOURCES = [
  'Driving for Dollars',
  'Direct Mail',
  'Cold Calling',
  'Referral',
  'MLS',
  'Website',
  'Open House',
  'API Import',
  'Other',
];

export const MOTIVATION_TYPES = [
  'Pre-foreclosure',
  'Tax Lien',
  'Absentee Owner',
  'Vacant',
  'Probate',
  'Divorce',
  'Tired Landlord',
  'Listing',
  'Buyer',
  'Remodel Project',
  'Other',
];

export const CONTACT_TYPES = [
  'Owner',
  'Seller',
  'Buyer',
  'Client',
  'Agent',
  'Investor',
  'Contractor',
  'Lender',
  'Other',
];

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  county: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  year_built: number | null;
  square_footage: number | null;
  lead_source: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  property_id: string;
  motivation_type: string | null;
  pipeline_status: PipelineStatus;
  estimated_value: number | null;
  max_allowable_offer: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  property_id: string | null;
  contact_type: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_1: string | null;
  phone_2: string | null;
  email: string | null;
  mailing_address: string | null;
  is_skip_traced: boolean;
  last_contacted: string | null;
  notes: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  due_date: string | null;
  is_done: boolean;
  property_id: string | null;
  contact_id: string | null;
  created_at: string;
}

export interface TableRows {
  properties: Property;
  leads_marketing: Lead;
  contacts: Contact;
  tasks: Task;
}
export type TableName = keyof TableRows;
