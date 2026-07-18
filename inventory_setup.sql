-- Inventory Management Setup Script

-- 1. Create Vendors Table
CREATE TABLE IF NOT EXISTS public.aka_inventory_vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    address TEXT,
    phone_no VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Products Table
CREATE TABLE IF NOT EXISTS public.aka_inventory_products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    vendor_id INTEGER REFERENCES public.aka_inventory_vendors(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL DEFAULT 0, -- Current stock level
    selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Selling price (fee)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Purchases Table
CREATE TABLE IF NOT EXISTS public.aka_inventory_purchases (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES public.aka_inventory_products(id) ON DELETE CASCADE,
    vendor_id INTEGER REFERENCES public.aka_inventory_vendors(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL,
    purchase_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    slip_url TEXT,
    transaction_type VARCHAR(20) NOT NULL DEFAULT 'purchase',
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quick migration if table already exists
ALTER TABLE public.aka_inventory_purchases ADD COLUMN IF NOT EXISTS slip_url TEXT;
ALTER TABLE public.aka_inventory_purchases ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) NOT NULL DEFAULT 'purchase';

-- 4. Delete existing type='product' entries from aka_master_dropdown_catalog (Category 164)
DELETE FROM public.aka_master_dropdown_catalog 
WHERE category_id = 164 AND metadata->>'type' = 'product';

-- 5. Seed Vendors
INSERT INTO public.aka_inventory_vendors (name, address, phone_no) VALUES
('Shree Mangal Pharma', 'Gala No.112, Allied Industrial Premises, Ram Panjwani Road, Mahim (W), Mumbai-400016', '022-48252843, 9137966674'),
('Safe Life Enterprises Pvt. Ltd.', 'Gala No.8, Bishen Udyog Comp., Minerva Ind. Area, Opp. Raja Ind. Est., Mulund (W), Mumbai-400080', '8591543980, 9321562383'),
('Shri Arihant Distributors Pvt. Ltd.', 'Parekh Corporation, Unit No.1, Ground Floor, 46-74 Jerbai Wadia Road, Near Mahatma Phule Technical School, Bhoiwada, Parel (E), Mumbai-400012', '24100645, 24100646, 24100647, 24100658, 24111617, 24113045'),
('Crystal Medicines Pvt. Ltd.', '208, A/1, 1st Floor, Atlas Mill Compound, B.N. Pai Marg, Reay Road (W), Mumbai-400010', '23711818, 9833933199, 8104342004, 9870981238, 9870981231'),
('Just Meds', 'Shop No.5, Mehta Mansion, Shitaladevi Temple Road, Mahim (W), Mumbai-400016', '9920364060, 7045747072, 022-24440271'),
('Skincare and Surgicals', '2A, 2B, 822 Saiman House, Ground Floor, J.P. Raul Marg, Off S.V. Road, Prabhadevi, Mumbai', '24222666, 24361103, 7208499299'),
('Parshvanath Distributor', 'Gala No.30, 1st Floor, Survey Ind. Estate, Sonawala Cross Road No.1, Goregaon (E), Mumbai-400063', 'fhffgf'),
('Vicris Enterprise', 'Wing E1, Flat No.8, 2nd Floor, New Chandra Building, Off Veera Desai Road, Andheri (W), Mumbai-400058', '9820337686'),
('Shree United Pharma Agencies', '1-B Malhotra House, Opp. GPO, Walchand Hirachand Marg, Fort, Mumbai-400001', '49704233, 49713260, 49713250, 9920848622'),
('Health Connect', 'Office No 103,1st floor Guruprerna Building Goandevi rd,opp TMT Nus depot Thane West-400602', '9136237970, 9321380430'),
('Bay View Chemist', 'Flat no 5B 3rd Floor, room no 5 Back bay Viw BLGD, Parmanand marg, Opera house, Girgoan Mumbai-400004', ''),
('(Vendor not mentioned)', '—', '—')
ON CONFLICT (name) DO UPDATE SET 
    address = EXCLUDED.address,
    phone_no = EXCLUDED.phone_no;

-- 6. Seed Products
INSERT INTO public.aka_inventory_products (name, vendor_id, qty, selling_price) VALUES
('Sucrafil Ano Cream', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Shree Mangal Pharma'), 1, 250.00),
('Mortega Tab', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Safe Life Enterprises Pvt. Ltd.'), 3, 120.00),
('SR Fil Enema', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Shri Arihant Distributors Pvt. Ltd.'), 11, 80.00),
('P.I.O. AF', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Crystal Medicines Pvt. Ltd.'), 20, 300.00),
('P.I.O. Ointment', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Crystal Medicines Pvt. Ltd.'), 5, 150.00),
('Trucumin Capsules', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Crystal Medicines Pvt. Ltd.'), 7, 450.00),
('Fidonal Cream', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Just Meds'), 10, 180.00),
('50fit', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Just Meds'), 6, 90.00),
('Milsept 100 ml Spray', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Skincare and Surgicals'), 6, 220.00),
('Milsept Gel', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Skincare and Surgicals'), 8, 140.00),
('Ctruz tab', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Parshvanath Distributor'), 43, 80.00),
('INS-TACTIV Patch', (SELECT id FROM public.aka_inventory_vendors WHERE name = '(Vendor not mentioned)'), 3, 50.00),
('Augboon 625', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Just Meds'), 21, 190.00),
('Disposable Sitz Bath Bidet', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Vicris Enterprise'), 1, 350.00),
('Anyday Tab', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Shree United Pharma Agencies'), 17, 95.00),
('Silno Scar Gel', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Health Connect'), 2, 280.00),
('Gloves Nulife 7', (SELECT id FROM public.aka_inventory_vendors WHERE name = 'Bay View Chemist'), 10, 15.00)
ON CONFLICT (name) DO UPDATE SET 
    vendor_id = EXCLUDED.vendor_id,
    qty = EXCLUDED.qty,
    selling_price = EXCLUDED.selling_price;

-- 7. PostgreSQL Trigger for Booking/OPD Registration Inventory Auto-Deduct
CREATE OR REPLACE FUNCTION handle_opd_registration_services_inventory()
RETURNS TRIGGER AS $$
DECLARE
    service_record RECORD;
BEGIN
    -- A. Revert/Add back product quantities from OLD registration (on update or delete)
    IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.services IS NOT NULL AND jsonb_typeof(OLD.services::jsonb) = 'array' THEN
        FOR service_record IN 
            SELECT * FROM jsonb_to_recordset(OLD.services::jsonb) 
            AS x(id text, name text, fee numeric, qty integer, type text)
        -- Only process items typed as 'product'
        LOOP
            IF service_record.type = 'product' AND service_record.name IS NOT NULL AND service_record.qty IS NOT NULL THEN
                UPDATE public.aka_inventory_products 
                SET qty = qty + service_record.qty 
                WHERE LOWER(TRIM(name)) = LOWER(TRIM(service_record.name));
            END IF;
        END LOOP;
    END IF;

    -- B. Deduct product quantities for NEW registration (on insert or update)
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.services IS NOT NULL AND jsonb_typeof(NEW.services::jsonb) = 'array' THEN
        FOR service_record IN 
            SELECT * FROM jsonb_to_recordset(NEW.services::jsonb) 
            AS x(id text, name text, fee numeric, qty integer, type text)
        -- Only process items typed as 'product'
        LOOP
            IF service_record.type = 'product' AND service_record.name IS NOT NULL AND service_record.qty IS NOT NULL THEN
                UPDATE public.aka_inventory_products 
                SET qty = qty - service_record.qty 
                WHERE LOWER(TRIM(name)) = LOWER(TRIM(service_record.name));
            END IF;
        END LOOP;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_opd_registration_services_inventory ON public.aka_opd_registration;

CREATE TRIGGER trg_opd_registration_services_inventory
AFTER INSERT OR UPDATE OR DELETE ON public.aka_opd_registration
FOR EACH ROW
EXECUTE FUNCTION handle_opd_registration_services_inventory();


-- 8. PostgreSQL Trigger for Purchase/Return updates
CREATE OR REPLACE FUNCTION handle_inventory_purchase_change()
RETURNS TRIGGER AS $$
DECLARE
    old_factor INTEGER := 1;
    new_factor INTEGER := 1;
BEGIN
    -- For 'return', stock moves in the opposite direction
    IF TG_OP = 'DELETE' THEN
        old_factor := CASE WHEN OLD.transaction_type = 'return' THEN -1 ELSE 1 END;
        UPDATE public.aka_inventory_products
        SET qty = qty - (OLD.qty * old_factor)
        WHERE id = OLD.product_id;
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        new_factor := CASE WHEN NEW.transaction_type = 'return' THEN -1 ELSE 1 END;
        UPDATE public.aka_inventory_products
        SET qty = qty + (NEW.qty * new_factor)
        WHERE id = NEW.product_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Revert OLD quantity adjustment
        old_factor := CASE WHEN OLD.transaction_type = 'return' THEN -1 ELSE 1 END;
        UPDATE public.aka_inventory_products
        SET qty = qty - (OLD.qty * old_factor)
        WHERE id = OLD.product_id;
        -- Apply NEW quantity adjustment
        new_factor := CASE WHEN NEW.transaction_type = 'return' THEN -1 ELSE 1 END;
        UPDATE public.aka_inventory_products
        SET qty = qty + (NEW.qty * new_factor)
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_purchase_change ON public.aka_inventory_purchases;

CREATE TRIGGER trg_inventory_purchase_change
AFTER INSERT OR UPDATE OR DELETE ON public.aka_inventory_purchases
FOR EACH ROW
EXECUTE FUNCTION handle_inventory_purchase_change();


-- 9. Setup Supabase Storage Bucket for Purchase Slips
INSERT INTO storage.buckets (id, name, public) 
VALUES ('purchase-slips', 'purchase-slips', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies to allow uploads, downloads, and deletes from the bucket
DROP POLICY IF EXISTS "Allow Public Uploads" ON storage.objects;
CREATE POLICY "Allow Public Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'purchase-slips');

DROP POLICY IF EXISTS "Allow Public Read Access" ON storage.objects;
CREATE POLICY "Allow Public Read Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'purchase-slips');

DROP POLICY IF EXISTS "Allow Public Delete Access" ON storage.objects;
CREATE POLICY "Allow Public Delete Access" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'purchase-slips');


-- 10. Performance Indexes for Scalable 7-Day Range Queries
CREATE INDEX IF NOT EXISTS idx_aka_opd_reg_date ON public.aka_opd_registration (appointment_date_time);
CREATE INDEX IF NOT EXISTS idx_aka_inv_purchases_date ON public.aka_inventory_purchases (purchase_date);
CREATE INDEX IF NOT EXISTS idx_aka_inv_purchases_prod ON public.aka_inventory_purchases (product_id);
