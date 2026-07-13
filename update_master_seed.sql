-- Database update script generated on 2026-07-13T15:38:37.332Z

-- 1. Update Category 163 from Referring Doctor to Reference
UPDATE public.aka_dropdown_categories 
SET code = 'reference', display_name = 'Reference' 
WHERE id = 163;

-- 2. Clear existing entries for Treating Doctor (160), Clinic Name (162), and Reference (163)
DELETE FROM public.aka_master_dropdown_catalog WHERE category_id IN (160, 162, 163);

-- 3. Insert Treating Doctors (Category 160) without fees/amounts
INSERT INTO public.aka_master_dropdown_catalog (category_id, value, usage_count)
VALUES
  (160, 'Dr Laxman Salve', 1),
  (160, 'Dr Kavita Salve', 1),
  (160, 'Dr Pratap Desai', 1),
  (160, 'Dt Janki Rana Dietitian', 1);

-- 4. Insert Clinic Names (Category 162)
INSERT INTO public.aka_master_dropdown_catalog (category_id, value, usage_count)
VALUES
  (162, 'Dlpc - Dadar', 1),
  (162, 'Dlpc Bandra', 1),
  (162, 'Dlpc - Tardeo (Apollo Spectra Hospital)', 1),
  (162, 'Dlpc - Chembur (Apollo Spectra Hospital)', 1);

-- 5. Insert References (Category 163)
INSERT INTO public.aka_master_dropdown_catalog (category_id, value, usage_count)
VALUES
  (163, 'Gogle', 1),
  (163, 'Old Pt Amit Teli', 1),
  (163, 'Relative', 1),
  (163, 'Dr Niranjan Nene', 1),
  (163, 'Old Pt', 1),
  (163, 'Dr Jitesh Mehta', 1),
  (163, 'Old Pt Dipti Salunkhe', 1),
  (163, 'Old Pt Rinkle Thakkar', 1),
  (163, 'Google', 1),
  (163, 'Dadar East', 1),
  (163, 'Dr Neha Jadhav', 1),
  (163, 'Online', 1),
  (163, 'Parel Hospital', 1),
  (163, 'Self', 1),
  (163, 'Dr Devend Naik', 1),
  (163, 'Dr Parel Hospital', 1),
  (163, 'Dr Pravin Damre', 1),
  (163, 'Dr Kavita Salve', 1),
  (163, 'Old Pt Frenisha', 1),
  (163, 'Mr Tushar Vira', 1),
  (163, 'Dr Rajkumar Patil', 1),
  (163, 'Dr Ganesh Dhangar', 1),
  (163, 'Subham', 1),
  (163, 'Justdial', 1),
  (163, 'Old Pt Vasant Kothari', 1),
  (163, 'Dr Naved Pathan', 1),
  (163, 'Dr Iravati Purandhare', 1),
  (163, 'Naved Pathan', 1),
  (163, 'Apollo', 1),
  (163, 'Dr Sachin Sawant', 1),
  (163, 'Dr Manoaj Jain', 1),
  (163, 'Dr Prakash Jain', 1),
  (163, 'Dr Bhansude', 1),
  (163, 'Dr Harish Sablani', 1),
  (163, 'Dr Shailendra Bansode', 1),
  (163, 'Old Pt Dayanand', 1),
  (163, 'Dr Sunny Agrawal', 1),
  (163, 'Old Pt Om Kamble', 1),
  (163, 'Old Pt Drishti', 1),
  (163, 'Mr Ashfaque', 1),
  (163, 'Old Pt Palavi Bandekar', 1),
  (163, 'Dr Rachana Naik', 1),
  (163, 'Dr Bipin Jain', 1),
  (163, 'Dr Vikram Ghanekar', 1),
  (163, 'Dr Deven Naik', 1),
  (163, 'Dr Thomre', 1),
  (163, 'Ved Hospital', 1),
  (163, 'Old Pt Megha Thakur', 1),
  (163, 'Dr Bandarkar', 1);
