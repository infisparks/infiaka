-- Master Categories Setup for OPD Booking Panel
-- Run this in your Supabase SQL Editor to seed the master data categories

-- 1. Ensure metadata column exists on aka_master_dropdown_catalog
ALTER TABLE public.aka_master_dropdown_catalog ADD COLUMN IF NOT EXISTS metadata jsonb null;

-- 2. Insert Category definitions if they don't already exist
INSERT INTO public.aka_dropdown_categories (id, code, display_name, allow_custom)
VALUES 
  (160, 'treating_doctor', 'Treating Doctor', true),
  (161, 'patient_address', 'Patient Address', true),
  (162, 'clinic_name', 'Clinic Name', false), -- ONLY selection from dropdown, no custom input addition allowed
  (163, 'referring_doctor', 'Referring Doctor', true),
  (164, 'services_and_products', 'Services and Products', true),
  (165, 'country_list', 'Country List', true),
  (166, 'state_list', 'State List', true)
ON CONFLICT (id) DO UPDATE 
SET code = EXCLUDED.code, display_name = EXCLUDED.display_name, allow_custom = EXCLUDED.allow_custom;

-- 3. Delete old entries for these categories to prevent duplicates
DELETE FROM public.aka_master_dropdown_catalog WHERE category_id IN (160, 161, 162, 163, 164, 165, 166);

-- 4. Seed treating doctors
INSERT INTO public.aka_master_dropdown_catalog (category_id, value, usage_count)
VALUES
  (160, 'DR. LAXMAN SALVE', 10),
  (160, 'DR. KABIR SHAH', 5),
  (160, 'DR. POOJA SHARMA', 3);

-- 5. Seed patient address suggestions
INSERT INTO public.aka_master_dropdown_catalog (category_id, value, usage_count)
VALUES
  (161, 'mumbra', 10),
  (161, 'thane', 8),
  (161, 'dadar', 5),
  (161, 'mumbai', 4),
  (161, 'bandra', 3),
  (161, 'kalyan', 2);

-- 6. Seed clinic names (allow_custom is false, only these will be selectable)
INSERT INTO public.aka_master_dropdown_catalog (category_id, value, usage_count)
VALUES
  (162, 'DLPC - Dadar', 10),
  (162, 'DLPC - East', 5),
  (162, 'DLPC - West', 3);

-- 7. Seed referring doctors
INSERT INTO public.aka_master_dropdown_catalog (category_id, value, usage_count)
VALUES
  (163, 'Dadar East', 10),
  (163, 'Dadar West', 5),
  (163, 'Kalyan Clinic', 2);

-- 8. Seed services and products (Category 164) with type and fee metadata
INSERT INTO public.aka_master_dropdown_catalog (category_id, value, usage_count, metadata)
VALUES
  (164, 'First consultation', 15, '{"type": "service", "price": 2000}'),
  (164, 'Follow-up consultation', 10, '{"type": "service", "price": 1000}'),
  (164, 'Injection', 8, '{"type": "product", "price": 100}'),
  (164, 'Dressing', 5, '{"type": "service", "price": 500}'),
  (164, 'ECG Test', 4, '{"type": "service", "price": 600}'),
  (164, 'Syringe 5ml', 3, '{"type": "product", "price": 10}'),
  (164, 'Bandage', 2, '{"type": "product", "price": 25}');

-- 9. Seed countries (Category 165)
INSERT INTO public.aka_master_dropdown_catalog (category_id, value, usage_count)
VALUES
  (165, 'India', 50),
  (165, 'United States', 5),
  (165, 'United Kingdom', 4),
  (165, 'Canada', 3),
  (165, 'Australia', 2),
  (165, 'Saudi Arabia', 1),
  (165, 'Singapore', 1);

-- 10. Seed India States & UTs (Category 166)
INSERT INTO public.aka_master_dropdown_catalog (category_id, value, usage_count)
VALUES
  (166, 'Maharashtra', 30),
  (166, 'Delhi', 15),
  (166, 'Karnataka', 12),
  (166, 'Gujarat', 10),
  (166, 'Tamil Nadu', 8),
  (166, 'Uttar Pradesh', 7),
  (166, 'West Bengal', 6),
  (166, 'Kerala', 5),
  (166, 'Andhra Pradesh', 4),
  (166, 'Telangana', 4),
  (166, 'Rajasthan', 3),
  (166, 'Punjab', 3),
  (166, 'Haryana', 2),
  (166, 'Madhya Pradesh', 2),
  (166, 'Bihar', 2),
  (166, 'Goa', 1),
  (166, 'Assam', 1),
  (166, 'Himachal Pradesh', 1),
  (166, 'Jharkhand', 1),
  (166, 'Chhattisgarh', 1),
  (166, 'Uttarakhand', 1),
  (166, 'Odisha', 1),
  (166, 'Jammu and Kashmir', 1),
  (166, 'Ladakh', 1),
  (166, 'Chandigarh', 1),
  (166, 'Puducherry', 1);
