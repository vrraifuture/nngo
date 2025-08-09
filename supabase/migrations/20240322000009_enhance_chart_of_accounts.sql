-- Enhance chart_of_accounts table structure
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code VARCHAR(20) UNIQUE NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);

-- Insert default chart of accounts if table is empty
INSERT INTO chart_of_accounts (account_code, account_name, account_type, normal_balance, description) 
SELECT * FROM (
  VALUES 
    -- Assets
    ('1000', 'Cash - General Fund', 'asset', 'debit', 'Primary cash account for unrestricted funds'),
    ('1010', 'Cash - Restricted Fund', 'asset', 'debit', 'Cash account for restricted funds'),
    ('1100', 'Accounts Receivable', 'asset', 'debit', 'Money owed to the organization'),
    ('1200', 'Grants Receivable', 'asset', 'debit', 'Grant funds committed but not yet received'),
    ('1500', 'Equipment', 'asset', 'debit', 'Office equipment and furniture'),
    ('1600', 'Accumulated Depreciation', 'asset', 'credit', 'Accumulated depreciation on equipment'),
    
    -- Liabilities
    ('2000', 'Accounts Payable', 'liability', 'credit', 'Money owed by the organization'),
    ('2100', 'Accrued Expenses', 'liability', 'credit', 'Expenses incurred but not yet paid'),
    ('2200', 'Deferred Revenue', 'liability', 'credit', 'Revenue received but not yet earned'),
    
    -- Net Assets/Equity
    ('3000', 'Net Assets - Unrestricted', 'equity', 'credit', 'Unrestricted net assets'),
    ('3100', 'Net Assets - Temporarily Restricted', 'equity', 'credit', 'Temporarily restricted net assets'),
    ('3200', 'Net Assets - Permanently Restricted', 'equity', 'credit', 'Permanently restricted net assets'),
    
    -- Revenue
    ('4000', 'Donations - Unrestricted', 'revenue', 'credit', 'Unrestricted donations'),
    ('4100', 'Donations - Restricted', 'revenue', 'credit', 'Restricted donations'),
    ('4200', 'Grant Revenue', 'revenue', 'credit', 'Revenue from grants'),
    ('4300', 'Program Service Revenue', 'revenue', 'credit', 'Revenue from program services'),
    ('4400', 'Investment Income', 'revenue', 'credit', 'Income from investments'),
    
    -- Expenses
    ('5000', 'Program Expenses', 'expense', 'debit', 'Direct program expenses'),
    ('5100', 'Personnel Expenses', 'expense', 'debit', 'Staff salaries and benefits'),
    ('5200', 'Administrative Expenses', 'expense', 'debit', 'General administrative expenses'),
    ('5300', 'Fundraising Expenses', 'expense', 'debit', 'Fundraising and development expenses'),
    ('5400', 'Travel & Transportation', 'expense', 'debit', 'Travel and transportation costs'),
    ('5500', 'Equipment & Supplies', 'expense', 'debit', 'Equipment and office supplies'),
    ('5600', 'Professional Services', 'expense', 'debit', 'Legal, accounting, and consulting fees')
) AS default_accounts(account_code, account_name, account_type, normal_balance, description)
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts LIMIT 1);

-- Enable realtime for chart_of_accounts
alter publication supabase_realtime add table chart_of_accounts;
