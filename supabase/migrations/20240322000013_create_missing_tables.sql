-- Create missing tables for report generation
-- This migration ensures all required tables exist for proper report functionality

-- Create ledger_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_code TEXT NOT NULL,
    account_name TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    reference_number TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON public.ledger_entries(date);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_code ON public.ledger_entries(account_code);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON public.ledger_entries(created_at);

-- Create custom_account_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.custom_account_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    description TEXT,
    is_custom BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure reports table has all required columns
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_size TEXT;

-- Insert sample data for testing if tables are empty
INSERT INTO public.ledger_entries (account_code, account_name, date, description, debit, credit, reference_number, created_by)
SELECT '1000', 'Cash - General Fund', '2024-01-15', 'Initial donation received', 10000, 0, 'DON-001', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_entries LIMIT 1);

INSERT INTO public.ledger_entries (account_code, account_name, date, description, debit, credit, reference_number, created_by)
SELECT '4000', 'Donations - Unrestricted', '2024-01-15', 'Initial donation received', 0, 10000, 'DON-001', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_entries WHERE account_code = '4000');

INSERT INTO public.ledger_entries (account_code, account_name, date, description, debit, credit, reference_number, created_by)
SELECT '5000', 'Program Expenses', '2024-01-20', 'Educational materials purchase', 2500, 0, 'EXP-001', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_entries WHERE account_code = '5000');

INSERT INTO public.ledger_entries (account_code, account_name, date, description, debit, credit, reference_number, created_by)
SELECT '1000', 'Cash - General Fund', '2024-01-20', 'Educational materials purchase', 0, 2500, 'EXP-001', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_entries WHERE reference_number = 'EXP-001' AND credit > 0);

-- Enable RLS (Row Level Security)
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_account_types ENABLE ROW LEVEL SECURITY;

-- Create policies for ledger_entries
CREATE POLICY "Enable read access for all users" ON public.ledger_entries
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.ledger_entries
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.ledger_entries
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.ledger_entries
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for custom_account_types
CREATE POLICY "Enable read access for all users" ON public.custom_account_types
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.custom_account_types
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.custom_account_types
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.custom_account_types
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON public.ledger_entries TO authenticated;
GRANT ALL ON public.custom_account_types TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_ledger_entries_updated_at BEFORE UPDATE ON public.ledger_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_account_types_updated_at BEFORE UPDATE ON public.custom_account_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
