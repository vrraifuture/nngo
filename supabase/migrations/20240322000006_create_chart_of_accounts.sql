-- Create chart_of_accounts table
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_code VARCHAR(20) NOT NULL UNIQUE,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on account_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(account_code);

-- Create index on account_type for filtering
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);

-- Create index on is_active for filtering active accounts
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_active ON chart_of_accounts(is_active);

-- Enable realtime for chart_of_accounts
ALTER PUBLICATION supabase_realtime ADD TABLE chart_of_accounts;

-- Insert default chart of accounts if table is empty
INSERT INTO chart_of_accounts (account_code, account_name, account_type, normal_balance, description, is_active)
SELECT * FROM (
    VALUES 
        ('1000', 'Cash', 'asset', 'debit', 'Cash on hand and in bank', true),
        ('1200', 'Accounts Receivable', 'asset', 'debit', 'Money owed to organization', true),
        ('2000', 'Accounts Payable', 'liability', 'credit', 'Money owed by organization', true),
        ('3000', 'Net Assets', 'equity', 'credit', 'Organization''s net worth', true),
        ('4000', 'Donations Revenue', 'revenue', 'credit', 'Income from donations', true),
        ('5000', 'Program Expenses', 'expense', 'debit', 'Direct program costs', true),
        ('5100', 'Administrative Expenses', 'expense', 'debit', 'Administrative costs', true)
) AS default_accounts(account_code, account_name, account_type, normal_balance, description, is_active)
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts);
