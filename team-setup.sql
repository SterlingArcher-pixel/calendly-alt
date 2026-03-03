-- Team Invite Flow Schema
-- Run this in Supabase SQL Editor

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'recruiter' CHECK (role IN ('admin', 'recruiter', 'viewer')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES hosts(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Allow public read for invite acceptance (by token)
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read invitations by token"
  ON invitations FOR SELECT
  USING (true);

CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM org_members
      WHERE host_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Invitations can be updated on accept"
  ON invitations FOR UPDATE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);

-- Create the org for Charlie
INSERT INTO organizations (name, slug)
VALUES ('Apploi Demo', 'apploi-demo')
ON CONFLICT (slug) DO NOTHING;

-- Make Charlie an admin (get his host ID dynamically)
INSERT INTO org_members (organization_id, host_id, role)
SELECT o.id, h.id, 'admin'
FROM organizations o, hosts h
WHERE o.slug = 'apploi-demo'
AND h.email = 'charliefischer24@gmail.com'
ON CONFLICT (organization_id, host_id) DO NOTHING;

-- Update Charlie's default org
UPDATE hosts
SET default_organization_id = (SELECT id FROM organizations WHERE slug = 'apploi-demo')
WHERE email = 'charliefischer24@gmail.com';

SELECT 'Team invite schema + org created' AS result;
