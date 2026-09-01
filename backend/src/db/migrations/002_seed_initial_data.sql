-- ==============================================================================
-- SiliconLabs Enterprise ID Card Platform — PostgreSQL Migration 002
-- Seed Initial Production Data
-- ==============================================================================

-- 1. Default Organization
INSERT INTO organizations (id, name, slug, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'SiliconLabs Enterprise Global',
    'siliconlabs-global',
    '{"country": "United States", "timezone": "America/New_York", "defaultDpi": 300}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 2. System Users
INSERT INTO users (id, organization_id, name, email, role, status, avatar)
VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'System Administrator', 'admin@idplatform.internal', 'admin', 'Active', 'AK'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Selamawit Bekele', 'designer@idplatform.internal', 'designer', 'Active', 'SB'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Hanna Mengistu', 'registrar@idplatform.internal', 'collector', 'Active', 'HM'),
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Guest Evaluator', 'evaluator@idplatform.internal', 'guest', 'Active', 'GU')
ON CONFLICT (id) DO NOTHING;

-- 3. Field Workers
INSERT INTO workers (id, organization_id, name, email, role, avatar, status, location, shift_start_time, last_active, records_collected, battery_level, signal_strength, assigned_district, phone)
VALUES
    (1, '00000000-0000-0000-0000-000000000001', 'Abebe Bikila', 'abebe.b@field.idplatform.com', 'Senior Registrar', 'AB', 'In Field', 'District 3 - Bole Sub-City', '08:00 AM', '3 mins ago', 28, 87, 'Strong', 'Bole Sub-City (Zones 1-4)', '+251 91 123 4567'),
    (2, '00000000-0000-0000-0000-000000000001', 'Tigist Assefa', 'tigist.a@field.idplatform.com', 'Mobile Field Agent', 'TA', 'In Field', 'District 5 - Yeka Hub', '08:30 AM', '12 mins ago', 22, 64, 'Good', 'Yeka Sub-City (North)', '+251 92 234 5678'),
    (3, '00000000-0000-0000-0000-000000000001', 'Dawit Kebede', 'dawit.k@field.idplatform.com', 'Biometrics Tech', 'DK', 'In Field', 'District 1 - Kirkos Center', '07:45 AM', '1 min ago', 18, 92, 'Strong', 'Kirkos Sub-City (Commercial)', '+251 93 345 6789'),
    (4, '00000000-0000-0000-0000-000000000001', 'Marta Hailu', 'marta.h@field.idplatform.com', 'Field Registrar', 'MH', 'Offline', 'District 8 - Akaki Base', '09:00 AM', '2 hours ago', 8, 45, 'Fair', 'Akaki-Kality Industrial Zone', '+251 94 456 7890'),
    (5, '00000000-0000-0000-0000-000000000001', 'Yonas Tadesse', 'yonas.t@field.idplatform.com', 'Data Collector', 'YT', 'Offline', 'HQ Office', '09:00 AM', 'Yesterday', 5, 100, 'Strong', 'HQ Operations Pool', '+251 95 567 8901')
ON CONFLICT (id) DO NOTHING;

-- 4. Initial Batch Folders
INSERT INTO batch_folders (id, organization_id, name, source_type, status, collector_name, total_records, notes)
VALUES
    (1, '00000000-0000-0000-0000-000000000001', 'Engineering & Cloud Staff Batch 01', 'Excel Import', 'Ready for Design', 'Abebe Bikila', 20, 'Imported from Q1 HR Roster'),
    (2, '00000000-0000-0000-0000-000000000001', 'Hardware & IoT Enclave', 'Manual Intake', 'In Design', 'Tigist Assefa', 18, 'Laboratory and engineering security badges'),
    (3, '00000000-0000-0000-0000-000000000001', 'Security & Operations Grid', 'Field Station', 'Approved', 'Dawit Kebede', 16, 'High-security zone credentials'),
    (4, '00000000-0000-0000-0000-000000000001', 'Grade 10 STEM Academy 2026', 'Archive Digitizer', 'Ready for Design', 'Marta Hailu', 15, 'Digitized from Historical Registry Book A'),
    (5, '00000000-0000-0000-0000-000000000001', 'Executive Leadership Council', 'Manual Intake', 'Printed', 'System Admin', 12, 'Gold-tier executive access passes')
ON CONFLICT (id) DO NOTHING;

-- 5. Default Card Templates
INSERT INTO card_templates (id, organization_id, name, category, orientation, width_px, height_px, width_mm, height_mm, background_color, back_background_color, is_default, front_elements, back_elements)
VALUES
    (1, '00000000-0000-0000-0000-000000000001', 'Corporate Enterprise Modern', 'Corporate', 'horizontal', 1012, 638, 85.60, 54.00, '#0F172A', '#1E293B', TRUE, '[]'::jsonb, '[]'::jsonb),
    (2, '00000000-0000-0000-0000-000000000001', 'Student Identity Matrix', 'Education', 'vertical', 638, 1012, 54.00, 85.60, '#FFFFFF', '#F8FAFC', FALSE, '[]'::jsonb, '[]'::jsonb),
    (3, '00000000-0000-0000-0000-000000000001', 'Security High-Access Hologram Badge', 'Security', 'horizontal', 1012, 638, 85.60, 54.00, '#020617', '#0F172A', FALSE, '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 6. Default Archive Ledger Templates
INSERT INTO archive_page_templates (id, organization_id, name, description, slots_count, slots)
VALUES
    (1, '00000000-0000-0000-0000-000000000001', 'Standard 5-Slot Vertical Ledger', '5 stacked portrait slots for historical student registry books', 5, '[
        {"id": "slot-1", "slotIndex": 0, "label": "Slot 1 (Top)", "xPercent": 8, "yPercent": 5, "widthPercent": 84, "heightPercent": 16},
        {"id": "slot-2", "slotIndex": 1, "label": "Slot 2", "xPercent": 8, "yPercent": 24, "widthPercent": 84, "heightPercent": 16},
        {"id": "slot-3", "slotIndex": 2, "label": "Slot 3 (Middle)", "xPercent": 8, "yPercent": 43, "widthPercent": 84, "heightPercent": 16},
        {"id": "slot-4", "slotIndex": 3, "label": "Slot 4", "xPercent": 8, "yPercent": 62, "widthPercent": 84, "heightPercent": 16},
        {"id": "slot-5", "slotIndex": 4, "label": "Slot 5 (Bottom)", "xPercent": 8, "yPercent": 81, "widthPercent": 84, "heightPercent": 16}
    ]'::jsonb),
    (2, '00000000-0000-0000-0000-000000000001', 'Dual-Column 8-Grid Registry', '8 photos organized in 4 rows x 2 columns', 8, '[
        {"id": "slot-1", "slotIndex": 0, "label": "Slot 1 (Top Left)", "xPercent": 5, "yPercent": 5, "widthPercent": 42, "heightPercent": 20},
        {"id": "slot-2", "slotIndex": 1, "label": "Slot 2 (Top Right)", "xPercent": 53, "yPercent": 5, "widthPercent": 42, "heightPercent": 20},
        {"id": "slot-3", "slotIndex": 2, "label": "Slot 3 (Row 2 Left)", "xPercent": 5, "yPercent": 28, "widthPercent": 42, "heightPercent": 20},
        {"id": "slot-4", "slotIndex": 3, "label": "Slot 4 (Row 2 Right)", "xPercent": 53, "yPercent": 28, "widthPercent": 42, "heightPercent": 20},
        {"id": "slot-5", "slotIndex": 4, "label": "Slot 5 (Row 3 Left)", "xPercent": 5, "yPercent": 51, "widthPercent": 42, "heightPercent": 20},
        {"id": "slot-6", "slotIndex": 5, "label": "Slot 6 (Row 3 Right)", "xPercent": 53, "yPercent": 51, "widthPercent": 42, "heightPercent": 20},
        {"id": "slot-7", "slotIndex": 6, "label": "Slot 7 (Row 4 Left)", "xPercent": 5, "yPercent": 74, "widthPercent": 42, "heightPercent": 20},
        {"id": "slot-8", "slotIndex": 7, "label": "Slot 8 (Row 4 Right)", "xPercent": 53, "yPercent": 74, "widthPercent": 42, "heightPercent": 20}
    ]'::jsonb)
ON CONFLICT (id) DO NOTHING;
