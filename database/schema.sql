
-- Real estate lead tracking schema (PostgreSQL / Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. PROPERTIES TABLE (Tracks physical real estate assets)
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    county VARCHAR(100),
    property_type VARCHAR(50), -- Single Family, Multi-Family, Commercial
    year_built INT,
    square_footage INT,
    lead_source VARCHAR(100), -- Driving for Dollars, Direct Mail, API Import
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. LEADS_MARKETING TABLE (Tracks motivated seller indicators and pipeline)
CREATE TABLE leads_marketing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    motivation_type VARCHAR(100), -- Pre-foreclosure, Tax Lien, Absentee, Vacant
    pipeline_status VARCHAR(50) DEFAULT 'New Lead', -- New Lead, Cold, Warm, Under Contract, Dead
    estimated_value NUMERIC(12, 2),
    max_allowable_offer NUMERIC(12, 2),
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. CONTACTS TABLE (Stores skip-traced property owner information)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_1 VARCHAR(20),
    phone_2 VARCHAR(20),
    email VARCHAR(150),
    mailing_address VARCHAR(255),
    is_skip_traced BOOLEAN DEFAULT FALSE,
    last_contacted TIMESTAMP WITH TIME ZONE
);

-- INDEXES (speed up lookups by property and pipeline status)
CREATE INDEX idx_leads_marketing_property_id ON leads_marketing(property_id);
CREATE INDEX idx_leads_marketing_pipeline_status ON leads_marketing(pipeline_status);
CREATE INDEX idx_contacts_property_id ON contacts(property_id);
```

5. Scroll down and tap **Commit changes**.

I've left out one comment line from the saved file; the SQL commands are exactly the same. Let me know which option you choose, or if you get stuck on any step.
