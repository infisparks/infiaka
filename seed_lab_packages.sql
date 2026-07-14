-- Database update script to create lab packages tables and seed default DLPC packages

-- 1. Create public.aka_lab_packages table
CREATE TABLE IF NOT EXISTS public.aka_lab_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create public.aka_lab_package_items table
CREATE TABLE IF NOT EXISTS public.aka_lab_package_items (
    id SERIAL PRIMARY KEY,
    package_id INTEGER REFERENCES public.aka_lab_packages(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(package_id, test_name)
);

-- 3. Insert default package headers
INSERT INTO public.aka_lab_packages (id, name) VALUES
  (1, 'DLPC 1 (11 Items)'),
  (2, 'DLPC 2 (13 Items)'),
  (3, 'DLPC 3 (3 Items)')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 4. Clear existing items to avoid constraint conflict on inserts
DELETE FROM public.aka_lab_package_items WHERE package_id IN (1, 2, 3);

-- 5. Seed items for DLPC 1 (11 Items)
INSERT INTO public.aka_lab_package_items (package_id, test_name) VALUES
  (1, 'Serum Creatinine'),
  (1, 'Hepatitis B Surface Antigen HBsAg (ECLIA)'),
  (1, 'Human Anti HIV Antibodies (ECLIA)'),
  (1, 'CBC'),
  (1, 'ECG'),
  (1, 'Hepatitis C (HCV) Virus Total (ECLIA)'),
  (1, 'PT/INR'),
  (1, 'Random Blood Sugar (RBS)'),
  (1, 'Total Bilirubin'),
  (1, 'Urine Routine and Microscopy'),
  (1, 'X-Ray Chest - PA View');

-- 6. Seed items for DLPC 2 (13 Items)
INSERT INTO public.aka_lab_package_items (package_id, test_name) VALUES
  (2, 'Serum Creatinine'),
  (2, 'HbA1c'),
  (2, 'Hepatitis B Surface Antigen HBsAg (ECLIA)'),
  (2, 'Human Anti HIV Antibodies (ECLIA)'),
  (2, 'CBC'),
  (2, 'ECG'),
  (2, 'Fasting Blood Sugar'),
  (2, 'Hepatitis C (HCV) Virus Total (ECLIA)'),
  (2, 'PT/INR'),
  (2, 'Post Prandial Blood Sugar'),
  (2, 'Total Bilirubin'),
  (2, 'Urine Routine and Microscopy'),
  (2, 'X-Ray Chest - PA View');

-- 7. Seed items for DLPC 3 (3 Items)
INSERT INTO public.aka_lab_package_items (package_id, test_name) VALUES
  (3, 'Hepatitis B Surface Antigen HBsAg (ECLIA)'),
  (3, 'Human Anti HIV Antibodies (ECLIA)'),
  (3, 'Hepatitis C (HCV) Virus Total (ECLIA)');
