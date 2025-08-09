-- Create permission system tables

-- Table to define all available permissions
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  permission_id VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to define role permissions (which permissions each role has)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'accountant', 'project_manager', 'donor')),
  permission_id VARCHAR(100) REFERENCES public.permissions(permission_id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, role, permission_id)
);

-- Insert all available permissions
INSERT INTO public.permissions (permission_id, name, description, category) VALUES
-- Financial Management
('view_finances', 'View Finances', 'View financial data and reports', 'finances'),
('manage_expenses', 'Manage Expenses', 'Create and manage expense records', 'finances'),
('edit_expenses', 'Edit Expenses', 'Edit existing expense records', 'finances'),
('delete_expenses', 'Delete Expenses', 'Delete expense records', 'finances'),

-- Budget Management
('manage_budgets', 'Manage Budgets', 'Create and manage budgets', 'budgets'),
('edit_budgets', 'Edit Budgets', 'Edit existing budgets', 'budgets'),
('delete_budgets', 'Delete Budgets', 'Delete budget records', 'budgets'),

-- General Ledger
('view_ledger', 'View Ledger', 'View general ledger entries', 'ledger'),
('manage_ledger', 'Manage Ledger', 'Create and manage ledger entries', 'ledger'),
('edit_ledger', 'Edit Ledger', 'Edit ledger entries', 'ledger'),
('delete_ledger', 'Delete Ledger', 'Delete ledger entries', 'ledger'),

-- Project Management
('view_projects', 'View Projects', 'View project information', 'projects'),
('manage_projects', 'Manage Projects', 'Create and manage projects', 'projects'),
('edit_projects', 'Edit Projects', 'Edit existing projects', 'projects'),
('delete_projects', 'Delete Projects', 'Delete project records', 'projects'),

-- Donor Management
('view_donors', 'View Donors', 'View donor information', 'donors'),
('manage_donors', 'Manage Donors', 'Create and manage donor records', 'donors'),
('edit_donors', 'Edit Donors', 'Edit existing donor records', 'donors'),
('delete_donors', 'Delete Donors', 'Delete donor records', 'donors'),

-- Report Management
('view_reports', 'View Reports', 'View generated reports', 'reports'),
('generate_reports', 'Generate Reports', 'Generate new reports', 'reports'),
('edit_reports', 'Edit Reports', 'Edit report configurations', 'reports'),
('delete_reports', 'Delete Reports', 'Delete report records', 'reports'),

-- User Management
('view_users', 'View Users', 'View user information', 'users'),
('manage_users', 'Manage Users', 'Create and manage user accounts', 'users'),
('edit_users', 'Edit Users', 'Edit existing user accounts', 'users'),
('delete_users', 'Delete Users', 'Delete user accounts', 'users'),

-- System Settings
('manage_settings', 'Manage Settings', 'Manage system settings and configuration', 'settings'),
('edit_settings', 'Edit Settings', 'Edit system settings', 'settings')
ON CONFLICT (permission_id) DO NOTHING;

-- Insert default role permissions for the sample organization
INSERT INTO public.role_permissions (organization_id, role, permission_id, granted)
SELECT 
  org.id as organization_id,
  role_perms.role,
  role_perms.permission_id,
  role_perms.granted
FROM public.organizations org
CROSS JOIN (
  -- Admin permissions (all permissions)
  SELECT 'admin' as role, permission_id, true as granted FROM public.permissions
  
  UNION ALL
  
  -- Accountant permissions
  SELECT 'accountant' as role, permission_id, true as granted 
  FROM public.permissions 
  WHERE permission_id IN (
    'view_finances', 'manage_expenses', 'edit_expenses', 'delete_expenses',
    'manage_budgets', 'edit_budgets', 'delete_budgets',
    'view_ledger', 'manage_ledger', 'edit_ledger', 'delete_ledger',
    'view_projects', 'view_donors',
    'view_reports', 'generate_reports', 'edit_reports', 'delete_reports'
  )
  
  UNION ALL
  
  -- Project Manager permissions
  SELECT 'project_manager' as role, permission_id, true as granted 
  FROM public.permissions 
  WHERE permission_id IN (
    'view_finances', 'view_projects', 'manage_projects', 'edit_projects', 'delete_projects',
    'view_donors', 'view_reports', 'generate_reports', 'edit_reports'
  )
  
  UNION ALL
  
  -- Donor permissions (very limited)
  SELECT 'donor' as role, permission_id, true as granted 
  FROM public.permissions 
  WHERE permission_id IN ('view_reports', 'view_projects')
) role_perms
WHERE org.name = 'Sample NGO'
ON CONFLICT (organization_id, role, permission_id) DO NOTHING;

-- Enable realtime for permission tables
alter publication supabase_realtime add table permissions;
alter publication supabase_realtime add table role_permissions;
