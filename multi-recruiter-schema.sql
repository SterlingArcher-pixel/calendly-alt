-- Multi-Recruiter Schema for CalendlyAlt
-- Run this in Supabase SQL Editor

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members (links hosts to orgs with roles)
CREATE TABLE IF NOT EXISTS org_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'recruiter' CHECK (role IN ('admin', 'recruiter', 'viewer')),
  invited_by UUID REFERENCES hosts(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, host_id)
);

-- Add org reference to meeting_types (optional, for shared meeting types)
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Add org reference to hosts
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS default_organization_id UUID REFERENCES organizations(id);

-- RLS Policies for organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Members can view their own org
CREATE POLICY "Members can view own org"
  ON organizations FOR SELECT
  TO authenticated
  USING (id IN (SELECT organization_id FROM org_members WHERE host_id = auth.uid()));

-- Members can view fellow org members
CREATE POLICY "Members can view org members"
  ON org_members FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM org_members WHERE host_id = auth.uid()));

-- Only admins can insert org members
CREATE POLICY "Admins can add org members"
  ON org_members FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM org_members
      WHERE host_id = auth.uid() AND role = 'admin'
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_host ON org_members(host_id);
CREATE INDEX IF NOT EXISTS idx_meeting_types_org ON meeting_types(organization_id);

SELECT 'Multi-recruiter schema created successfully' AS result;
