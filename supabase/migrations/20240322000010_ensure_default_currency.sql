-- Ensure there's at least one default currency in the system

-- First, check if we have any currencies at all
DO $$
BEGIN
  -- If no currencies exist, create USD as default
  IF NOT EXISTS (SELECT 1 FROM currencies LIMIT 1) THEN
    INSERT INTO currencies (code, name, symbol, exchange_rate, is_default, created_at, updated_at)
    VALUES ('USD', 'US Dollar', '$', 1.0000, true, NOW(), NOW());
    
    RAISE NOTICE 'Created default USD currency';
  ELSE
    -- If currencies exist but none are marked as default, make the first one default
    IF NOT EXISTS (SELECT 1 FROM currencies WHERE is_default = true LIMIT 1) THEN
      UPDATE currencies 
      SET is_default = true, updated_at = NOW()
      WHERE id = (SELECT id FROM currencies ORDER BY created_at ASC LIMIT 1);
      
      RAISE NOTICE 'Set first currency as default';
    END IF;
  END IF;
END $$;

-- Ensure only one currency is marked as default
DO $$
DECLARE
  default_currency_id UUID;
BEGIN
  -- Get the first default currency
  SELECT id INTO default_currency_id 
  FROM currencies 
  WHERE is_default = true 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- If we found a default currency, make sure it's the only one
  IF default_currency_id IS NOT NULL THEN
    -- Set all currencies to not default
    UPDATE currencies SET is_default = false, updated_at = NOW();
    
    -- Set only the selected one as default
    UPDATE currencies 
    SET is_default = true, updated_at = NOW() 
    WHERE id = default_currency_id;
    
    RAISE NOTICE 'Ensured only one default currency exists';
  END IF;
END $$;
