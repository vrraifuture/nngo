CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  registration_number VARCHAR(100),
  address TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'accountant', 'project_manager', 'donor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.donors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('individual', 'foundation', 'government', 'corporate')),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
  project_manager_id UUID REFERENCES auth.users(id),
  total_budget DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fund_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES public.donors(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  is_restricted BOOLEAN DEFAULT false,
  restrictions TEXT,
  received_date DATE,
  status VARCHAR(50) DEFAULT 'received' CHECK (status IN ('pledged', 'received', 'partially_used', 'fully_used')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES public.budget_categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  planned_amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  period_start DATE,
  period_end DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budgets(id),
  category_id UUID REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  fund_source_id UUID REFERENCES public.fund_sources(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  vendor_name VARCHAR(255),
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  submitted_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('financial_summary', 'donor_report', 'project_report', 'expense_report', 'budget_variance')),
  parameters JSONB,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_url TEXT,
  status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed'))
);

INSERT INTO public.organizations (name, description, contact_email) VALUES 
('Sample NGO', 'A sample organization for demonstration', 'contact@samplengo.org');

INSERT INTO public.budget_categories (organization_id, name, description) 
SELECT id, 'Program Expenses', 'Direct program implementation costs' FROM public.organizations WHERE name = 'Sample NGO'
UNION ALL
SELECT id, 'Administrative Expenses', 'General administrative and overhead costs' FROM public.organizations WHERE name = 'Sample NGO'
UNION ALL
SELECT id, 'Fundraising Expenses', 'Costs related to fundraising activities' FROM public.organizations WHERE name = 'Sample NGO'
UNION ALL
SELECT id, 'Personnel', 'Staff salaries and benefits' FROM public.organizations WHERE name = 'Sample NGO'
UNION ALL
SELECT id, 'Travel & Transportation', 'Travel and transportation costs' FROM public.organizations WHERE name = 'Sample NGO'
UNION ALL
SELECT id, 'Equipment & Supplies', 'Equipment purchases and supplies' FROM public.organizations WHERE name = 'Sample NGO';

alter publication supabase_realtime add table organizations;
alter publication supabase_realtime add table user_roles;
alter publication supabase_realtime add table donors;
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table fund_sources;
alter publication supabase_realtime add table budget_categories;
alter publication supabase_realtime add table budgets;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table reports;