-- =====================================================================
-- Real estate platform — Version 1 database (Supabase / PostgreSQL)
-- Users: real estate agents, investors/flippers, and remodelers.
-- Every row belongs to the user who created it (owner_id), and
-- Row Level Security makes sure each user only sees their own data.
--
-- How to use: Supabase dashboard -> SQL Editor -> paste this file -> Run.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 0. PROFILES (one row per signed-up user, created automatically)
-- ---------------------------------------------------------------------
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150),
    company VARCHAR(150),
    -- Any mix of: agent, investor, remodeler
    roles TEXT[] NOT NULL DEFAULT ARRAY['investor']::TEXT[]
        CHECK (roles <@ ARRAY['agent', 'investor', 'remodeler']::TEXT[] AND cardinality(roles) > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create a profile automatically when someone signs up.
-- The app sends full_name and roles in the sign-up metadata.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_roles TEXT[];
BEGIN
    SELECT COALESCE(array_agg(r), ARRAY['investor']::TEXT[])
      INTO new_roles
      FROM jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data -> 'roles', '[]'::jsonb)) AS r
     WHERE r IN ('agent', 'investor', 'remodeler');

    INSERT INTO public.profiles (id, full_name, roles)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', new_roles);
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Keeps updated_at current whenever a row changes.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 1. PROPERTIES (physical real estate assets)
-- ---------------------------------------------------------------------
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    county VARCHAR(100),
    property_type VARCHAR(50), -- Single Family, Multi-Family, Condo, Townhouse, Commercial, Land
    bedrooms INT,
    bathrooms NUMERIC(3, 1),
    year_built INT,
    square_footage INT,
    lead_source VARCHAR(100), -- Driving for Dollars, Direct Mail, Referral, MLS, API Import
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ---------------------------------------------------------------------
-- 2. LEADS_MARKETING (deals moving through the pipeline)
-- ---------------------------------------------------------------------
CREATE TABLE leads_marketing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    motivation_type VARCHAR(100), -- Pre-foreclosure, Tax Lien, Absentee, Vacant, Probate, Listing, Buyer, Remodel
    pipeline_status VARCHAR(50) NOT NULL DEFAULT 'New Lead'
        CHECK (pipeline_status IN ('New Lead', 'Contacted', 'Warm', 'Appointment',
                                   'Offer Made', 'Under Contract', 'Closed', 'Dead')),
    estimated_value NUMERIC(12, 2),
    max_allowable_offer NUMERIC(12, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TRIGGER leads_marketing_set_updated_at
    BEFORE UPDATE ON leads_marketing
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 3. CONTACTS (owners, buyers, sellers, clients, partners)
-- ---------------------------------------------------------------------
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL, -- optional
    contact_type VARCHAR(50) DEFAULT 'Owner', -- Owner, Seller, Buyer, Client, Agent, Investor, Contractor, Lender
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_1 VARCHAR(20),
    phone_2 VARCHAR(20),
    email VARCHAR(150),
    mailing_address VARCHAR(255),
    is_skip_traced BOOLEAN DEFAULT FALSE,
    last_contacted TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ---------------------------------------------------------------------
-- 4. TASKS (follow-ups and reminders)
-- ---------------------------------------------------------------------
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    due_date DATE,
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ---------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_leads_marketing_owner_id ON leads_marketing(owner_id);
CREATE INDEX idx_leads_marketing_property_id ON leads_marketing(property_id);
CREATE INDEX idx_leads_marketing_pipeline_status ON leads_marketing(pipeline_status);
CREATE INDEX idx_contacts_owner_id ON contacts(owner_id);
CREATE INDEX idx_contacts_property_id ON contacts(property_id);
CREATE INDEX idx_tasks_owner_id ON tasks(owner_id);

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY: each user can only see and change their own rows
-- ---------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON profiles
    FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Owner full access" ON properties
    FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner full access" ON leads_marketing
    FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner full access" ON contacts
    FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner full access" ON tasks
    FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
