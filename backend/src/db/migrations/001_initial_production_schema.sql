-- ==============================================================================
-- SiliconLabs Enterprise ID Card Platform — PostgreSQL Migration 001
-- Initial Production Relational Schema
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Organizations (Multi-Tenancy Foundation for Enterprise Scaling)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Directory (Phase 2 Auth structural foundation)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'designer', 'collector', 'guest')),
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Pending')),
    avatar VARCHAR(10),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Field Workers Directory (Collectors / Field Staff Telemetry)
CREATE TABLE IF NOT EXISTS workers (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    avatar VARCHAR(10) NOT NULL DEFAULT 'WK',
    status VARCHAR(50) NOT NULL DEFAULT 'Offline' CHECK (status IN ('Online', 'Offline', 'In Field')),
    location VARCHAR(255) NOT NULL DEFAULT 'District Hub',
    shift_start_time VARCHAR(50),
    last_active VARCHAR(50) DEFAULT 'Never',
    records_collected INTEGER NOT NULL DEFAULT 0,
    battery_level INTEGER NOT NULL DEFAULT 100,
    signal_strength VARCHAR(50) NOT NULL DEFAULT 'Good' CHECK (signal_strength IN ('Strong', 'Good', 'Fair')),
    assigned_district VARCHAR(255) NOT NULL DEFAULT 'Central District',
    phone VARCHAR(50) NOT NULL DEFAULT '+1 (555) 000-0000',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Batch Folders (Roster Intake & Classification)
CREATE TABLE IF NOT EXISTS batch_folders (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('Excel Import', 'Manual Intake', 'Archive Digitizer', 'Paper Document OCR')),
    status VARCHAR(50) NOT NULL DEFAULT 'Ready for Design' CHECK (status IN ('Ready for Design', 'In Design', 'Approved', 'Printed', 'Archived')),
    collector_name VARCHAR(255) NOT NULL DEFAULT 'System Admin',
    total_records INTEGER NOT NULL DEFAULT 0,
    assigned_designer VARCHAR(255),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Persons (Master Cardholder Directory)
CREATE TABLE IF NOT EXISTS persons (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    batch_folder_id BIGINT REFERENCES batch_folders(id) ON DELETE SET NULL,
    worker_id BIGINT REFERENCES workers(id) ON DELETE SET NULL,
    id_number VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    category VARCHAR(100) NOT NULL DEFAULT 'Employees',
    department VARCHAR(100) NOT NULL DEFAULT 'General Operations',
    role VARCHAR(100) NOT NULL DEFAULT 'Staff Member',
    phone VARCHAR(50) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    blood_group VARCHAR(10) NOT NULL DEFAULT 'O+',
    joined_date VARCHAR(50) NOT NULL DEFAULT '',
    gender VARCHAR(50),
    school_name VARCHAR(255),
    grade VARCHAR(50),
    section VARCHAR(50),
    roll_number VARCHAR(50),
    guardian_name VARCHAR(255),
    emergency_phone VARCHAR(50),
    photo_storage_path TEXT,
    photo_url TEXT,
    photo_data_url TEXT, -- Backward compatibility data URL
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Active', 'Pending', 'Printed', 'Processing')),
    fulfillment_status VARCHAR(50) DEFAULT 'Unfulfilled' CHECK (fulfillment_status IN ('Fulfilled', 'Unfulfilled', 'Processing', 'Refunded', 'On Hold')),
    payment_status VARCHAR(50) DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending', 'Refunded')),
    channel VARCHAR(100) DEFAULT 'Web Platform',
    total_amount VARCHAR(50),
    location VARCHAR(255),
    collected_by VARCHAR(255),
    folder_name VARCHAR(255),
    source_file_name VARCHAR(255),
    archive_meta JSONB,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_person_org_id_number UNIQUE (organization_id, id_number)
);

-- 6. Card Templates (Visual Design Master Metadata)
CREATE TABLE IF NOT EXISTS card_templates (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    orientation VARCHAR(20) NOT NULL DEFAULT 'horizontal' CHECK (orientation IN ('horizontal', 'vertical')),
    theme_id VARCHAR(50),
    width_px INTEGER NOT NULL DEFAULT 1012,
    height_px INTEGER NOT NULL DEFAULT 638,
    width_mm NUMERIC(6,2) NOT NULL DEFAULT 85.60,
    height_mm NUMERIC(6,2) NOT NULL DEFAULT 54.00,
    background_color VARCHAR(50) NOT NULL DEFAULT '#FFFFFF',
    back_background_color VARCHAR(50) NOT NULL DEFAULT '#F8FAFC',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    current_version_id UUID,
    front_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    back_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Template Versions (Immutable Snapshots for Historical Card Tracking)
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id BIGINT NOT NULL REFERENCES card_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    front_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    back_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    change_summary TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_template_version UNIQUE (template_id, version_number)
);

-- 8. Template Assets (Logos, Badges, Security Watermarks)
CREATE TABLE IF NOT EXISTS template_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    template_id BIGINT REFERENCES card_templates(id) ON DELETE SET NULL,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('logo', 'background', 'signature', 'badge', 'watermark', 'font')),
    filename VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    dimensions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Designer Projects (Free-form vector compositions)
CREATE TABLE IF NOT EXISTS designer_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id BIGINT REFERENCES card_templates(id) ON DELETE SET NULL,
    canvas_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    preview_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Generation Jobs (Asynchronous Job Queue for 100k+ Cards/Day)
CREATE TABLE IF NOT EXISTS generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    batch_folder_id BIGINT REFERENCES batch_folders(id) ON DELETE SET NULL,
    template_id BIGINT NOT NULL REFERENCES card_templates(id) ON DELETE CASCADE,
    template_version_id UUID REFERENCES template_versions(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    total_records INTEGER NOT NULL DEFAULT 0,
    processed_records INTEGER NOT NULL DEFAULT 0,
    progress_percent INTEGER NOT NULL DEFAULT 0,
    options JSONB NOT NULL DEFAULT '{"includeBack": true, "chunkSize": 250, "highResDpi": 300}'::jsonb,
    output_zip_path TEXT,
    output_pdf_path TEXT,
    error_details TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Generated Cards (Historical Rendering Ledger)
CREATE TABLE IF NOT EXISTS generated_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
    person_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    template_version_id UUID REFERENCES template_versions(id) ON DELETE SET NULL,
    front_image_path TEXT,
    back_image_path TEXT,
    rendered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Print Jobs (Print Studio Impositions)
CREATE TABLE IF NOT EXISTS print_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    batch_folder_id BIGINT REFERENCES batch_folders(id) ON DELETE SET NULL,
    layout_type VARCHAR(50) NOT NULL DEFAULT '8-up' CHECK (layout_type IN ('8-up', '10-up', '1-up', 'custom')),
    paper_size VARCHAR(50) NOT NULL DEFAULT 'A4' CHECK (paper_size IN ('A4', 'A3', 'Letter', 'Custom')),
    total_sheets INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'GENERATING', 'READY', 'FAILED')),
    pdf_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Archive Page Templates (Digitizer Grid Templates)
CREATE TABLE IF NOT EXISTS archive_page_templates (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slots_count INTEGER NOT NULL DEFAULT 5,
    slots JSONB NOT NULL DEFAULT '[]'::jsonb,
    sample_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Audit Logs (Phase 2 Observability & Tracking Preparation)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    changes JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- INDEXES FOR HIGH-THROUGHPUT PERFORMANCE & 100K+ RECORDS
-- ==============================================================================

-- Persons
CREATE INDEX IF NOT EXISTS idx_persons_batch_folder_id ON persons(batch_folder_id);
CREATE INDEX IF NOT EXISTS idx_persons_worker_id ON persons(worker_id);
CREATE INDEX IF NOT EXISTS idx_persons_category_status ON persons(category, status);
CREATE INDEX IF NOT EXISTS idx_persons_department ON persons(department);
CREATE INDEX IF NOT EXISTS idx_persons_created_at ON persons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_persons_search_name ON persons USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_persons_search_id ON persons USING gin(id_number gin_trgm_ops);

-- Batch Folders
CREATE INDEX IF NOT EXISTS idx_batch_folders_status ON batch_folders(status);
CREATE INDEX IF NOT EXISTS idx_batch_folders_source_type ON batch_folders(source_type);

-- Templates & Versions
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_card_templates_category ON card_templates(category);

-- Generation Jobs
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at ON generation_jobs(created_at DESC);

-- Print Jobs
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);

-- Migration Tracking Table
CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
