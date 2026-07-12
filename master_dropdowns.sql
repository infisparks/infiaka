-- Master Categories Setup for OPD Booking Panel
-- Run this in your Supabase SQL Editor to seed the master data categories

-- 1. Ensure metadata column exists on aka_master_dropdown_catalog
ALTER TABLE public.aka_master_dropdown_catalog ADD COLUMN IF NOT EXISTS metadata jsonb null;

-- 2. Insert Category definitions dynamically based on column schema ('name' or 'category_name')
DO $$
DECLARE
    col_name text;
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'aka_dropdown_categories' 
          AND column_name = 'name'
    ) THEN
        col_name := 'name';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'aka_dropdown_categories' 
          AND column_name = 'category_name'
    ) THEN
        col_name := 'category_name';
    ELSE
        RAISE EXCEPTION 'Neither column "name" nor "category_name" exists on public.aka_dropdown_categories.';
    END IF;

    EXECUTE format('
        INSERT INTO public.aka_dropdown_categories (id, %I, allow_custom)
        VALUES 
          (160, $1, true),
          (161, $2, true),
          (162, $3, false),
          (163, $4, true),
          (164, $5, true),
          (165, $6, true),
          (166, $7, true)
        ON CONFLICT (id) DO UPDATE 
        SET %I = EXCLUDED.%I, allow_custom = EXCLUDED.allow_custom;
    ', col_name, col_name, col_name)
    USING 
      'treating_doctor', 
      'patient_address', 
      'clinic_name', 
      'referring_doctor', 
      'services_and_products', 
      'country_list', 
      'state_list';
END $$;

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
