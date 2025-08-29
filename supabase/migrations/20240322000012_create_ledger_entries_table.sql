-- Create ledger_entries table for General Ledger functionality
-- This table stores all financial transactions in double-entry bookkeeping format

-- Create the ledger_entries table
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
    credit DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
    reference_number VARCHAR(100),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints to ensure data integrity
    CONSTRAINT ledger_entries_amounts_check CHECK (
        (debit >= 0 AND credit >= 0) AND 
        NOT (debit > 0 AND credit > 0)
    ),
    CONSTRAINT ledger_entries_non_zero_check CHECK (
        debit > 0 OR credit > 0
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_code ON public.ledger_entries(account_code);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON public.ledger_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON public.ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON public.ledger_entries(reference_number) WHERE reference_number IS NOT NULL;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_ledger_entries_updated_at ON public.ledger_entries;
CREATE TRIGGER update_ledger_entries_updated_at
    BEFORE UPDATE ON public.ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for authenticated users to view all ledger entries
CREATE POLICY "Users can view ledger entries" ON public.ledger_entries
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for authenticated users to insert ledger entries
CREATE POLICY "Users can insert ledger entries" ON public.ledger_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for authenticated users to update their own ledger entries
CREATE POLICY "Users can update ledger entries" ON public.ledger_entries
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for authenticated users to delete ledger entries (admin only in app logic)
CREATE POLICY "Users can delete ledger entries" ON public.ledger_entries
    FOR DELETE
    TO authenticated
    USING (true);

-- Grant permissions to authenticated users
GRANT ALL ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;

-- Insert some sample data for testing (optional)
INSERT INTO public.ledger_entries (
    account_code, 
    account_name, 
    date, 
    description, 
    debit, 
    credit, 
    reference_number
) VALUES 
(
    '1000',
    'Cash - General Fund',
    '2024-01-15',
    'Initial donation received',
    10000.00,
    0.00,
    'DON-001'
),
(
    '4000',
    'Donations - Unrestricted',
    '2024-01-15',
    'Initial donation received',
    0.00,
    10000.00,
    'DON-001'
),
(
    '5000',
    'Program Expenses',
    '2024-01-20',
    'Educational materials purchase',
    2500.00,
    0.00,
    'EXP-001'
),
(
    '1000',
    'Cash - General Fund',
    '2024-01-20',
    'Educational materials purchase',
    0.00,
    2500.00,
    'EXP-001'
)
ON CONFLICT DO NOTHING;

-- Add comment to the table
COMMENT ON TABLE public.ledger_entries IS 'General ledger entries for double-entry bookkeeping system';
COMMENT ON COLUMN public.ledger_entries.account_code IS 'Account code from chart of accounts';
COMMENT ON COLUMN public.ledger_entries.account_name IS 'Account name for display purposes';
COMMENT ON COLUMN public.ledger_entries.debit IS 'Debit amount (increases assets/expenses, decreases liabilities/equity/revenue)';
COMMENT ON COLUMN public.ledger_entries.credit IS 'Credit amount (decreases assets/expenses, increases liabilities/equity/revenue)';
COMMENT ON COLUMN public.ledger_entries.reference_number IS 'Optional reference number for transaction tracking';
