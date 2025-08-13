-- Grant admin access to abdousentore@gmail.com
-- This migration ensures the user has admin access across all organizations

-- First, get the user ID for abdousentore@gmail.com
DO $$
DECLARE
    target_user_id UUID;
    org_record RECORD;
BEGIN
    -- Get the user ID for abdousentore@gmail.com
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'abdousentore@gmail.com';
    
    -- Only proceed if user exists
    IF target_user_id IS NOT NULL THEN
        -- Loop through all organizations and grant admin access
        FOR org_record IN SELECT id FROM organizations LOOP
            -- Delete any existing role for this user in this organization
            DELETE FROM user_roles 
            WHERE user_id = target_user_id 
            AND organization_id = org_record.id;
            
            -- Insert admin role
            INSERT INTO user_roles (user_id, organization_id, role, created_at, updated_at)
            VALUES (
                target_user_id,
                org_record.id,
                'admin',
                NOW(),
                NOW()
            )
            ON CONFLICT (user_id, organization_id) 
            DO UPDATE SET 
                role = 'admin',
                updated_at = NOW();
        END LOOP;
        
        RAISE NOTICE 'Admin access granted to abdousentore@gmail.com for all organizations';
    ELSE
        RAISE NOTICE 'User abdousentore@gmail.com not found in auth.users table';
    END IF;
END $$;

-- Also ensure that if no organizations exist, we create a default one
INSERT INTO organizations (name, description, created_at, updated_at)
SELECT 
    'Default Organization',
    'Default organization for NGO management',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations);

-- Grant admin access to the default organization if it was just created
DO $$
DECLARE
    target_user_id UUID;
    default_org_id UUID;
BEGIN
    -- Get the user ID for abdousentore@gmail.com
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'abdousentore@gmail.com';
    
    -- Get the default organization ID
    SELECT id INTO default_org_id 
    FROM organizations 
    WHERE name = 'Default Organization'
    LIMIT 1;
    
    -- Grant admin access if both user and organization exist
    IF target_user_id IS NOT NULL AND default_org_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, organization_id, role, created_at, updated_at)
        VALUES (
            target_user_id,
            default_org_id,
            'admin',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id, organization_id) 
        DO UPDATE SET 
            role = 'admin',
            updated_at = NOW();
            
        RAISE NOTICE 'Admin access granted to abdousentore@gmail.com for default organization';
    END IF;
END $$;
