# Database Architecture Diagram

```mermaid
erDiagram
    "auth.users" ||--o{ profiles : has
    profiles ||--o{ member_addresses : owns
    member_addresses ||--o{ allowed_visitors : has
    profiles ||--o{ visitor_check_ins : logs
    allowed_visitors ||--o{ visitor_check_ins : records
    member_addresses ||--o{ visitor_check_ins : tracks
    auth_mappings ||--|| profiles : maps

    "auth.users" {
        uuid id PK
        text email
        text encrypted_password
        timestamp created_at
        timestamp updated_at
    }

    profiles {
        uuid id PK
        text name
        text email
        text role
        text status
        timestamp created_at
        timestamp updated_at
    }

    member_addresses {
        uuid id PK
        uuid member_id FK
        text address
        text owner_name
        text status
        boolean is_primary
        boolean is_active
        text apartment_number
        text verification_status
        text verification_notes
        timestamp verification_date
        uuid verified_by FK
        timestamp created_at
        timestamp updated_at
    }

    allowed_visitors {
        uuid id PK
        text first_name
        text last_name
        text access_code
        boolean is_active
        timestamp expires_at
        timestamp last_used
        uuid address_id FK
        timestamp created_at
        timestamp updated_at
    }

    visitor_check_ins {
        uuid id PK
        uuid visitor_id FK
        uuid address_id FK
        uuid checked_in_by FK
        timestamp check_in_time
        text entry_method
        text notes
        text first_name
        text last_name
        text unregistered_address
        jsonb address_details
        boolean is_registered_address
        text address_source
        text street_number
        text street_name
        jsonb original_suggestion
        boolean modified_address
        timestamp created_at
    }

    auth_mappings {
        uuid id PK
        text provider_id
        uuid supabase_id FK
        text provider
        text email
        timestamp created_at
        timestamp updated_at
    }
```

## Table Relationships

1. **auth.users** → **profiles**
   - One-to-many relationship
   - Each user can have one profile
   - Profile ID references user ID

2. **profiles** → **member_addresses**
   - One-to-many relationship
   - Each profile can have multiple addresses
   - Member ID references profile ID

3. **member_addresses** → **allowed_visitors**
   - One-to-many relationship
   - Each address can have multiple visitors
   - Address ID references member_addresses ID

4. **profiles** → **visitor_check_ins**
   - One-to-many relationship
   - Guards can log multiple check-ins
   - Checked_in_by references profile ID

5. **allowed_visitors** → **visitor_check_ins**
   - One-to-many relationship
   - Each visitor can have multiple check-ins
   - Visitor ID references allowed_visitors ID

6. **member_addresses** → **visitor_check_ins**
   - One-to-many relationship
   - Each address can have multiple check-ins
   - Address ID references member_addresses ID

7. **auth_mappings** → **profiles**
   - One-to-one relationship
   - Maps OAuth provider IDs to Supabase user IDs
   - Supabase ID references profile ID

## Key Features

1. **Row Level Security (RLS)**
   - All tables have RLS enabled
   - Policies control access based on user roles
   - Guards can only view approved addresses
   - Admins have full access
   - Members can only access their own data

2. **Audit Trail**
   - All tables include created_at/updated_at timestamps
   - Visitor check-ins track all access attempts
   - Verification status tracking for addresses
   - Access logs with detailed information

3. **Data Integrity**
   - Foreign key constraints ensure referential integrity
   - Check constraints on status fields
   - Unique constraints on provider mappings
   - Validation for address and visitor data

4. **Performance**
   - Indexes on frequently queried fields
   - Views for common report queries
   - Optimized for common access patterns
   - Efficient visitor lookup by access code

5. **Security Features**
   - Role-based access control
   - Address verification system
   - Visitor expiration management
   - Access code validation
   - OAuth provider integration

6. **Flexibility**
   - Support for multiple addresses per member
   - Primary address designation
   - Apartment number support
   - Unregistered address handling
   - Multiple entry methods 