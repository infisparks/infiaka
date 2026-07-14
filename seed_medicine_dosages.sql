-- Database update script to add custom medicine dosages to category_id = 20
-- Inserts options case-insensitively only if they do not already exist in aka_master_dropdown_catalog.

INSERT INTO public.aka_master_dropdown_catalog (category_id, value, usage_count)
SELECT t.category_id, t.value, t.usage_count
FROM (
  VALUES
    (20, '1/4 Tablet', 1),
    (20, '1/2 Tablet', 1),
    (20, '3/4 Tablet', 1),
    (20, '1 Tablet', 1),
    (20, '1½ Tablets', 1),
    (20, '2 Tablets', 1),
    (20, '2½ Tablets', 1),
    (20, '3 Tablets', 1),
    (20, '4 Tablets', 1),
    (20, '1 Capsule', 1),
    (20, '2 Capsules', 1),
    (20, '3 Capsules', 1),
    (20, '1 Sachet', 1),
    (20, '2 Sachets', 1),
    (20, '1 Packet', 1),
    (20, '2 Packets', 1),
    (20, '1 Spoon', 1),
    (20, '1/2 Spoon', 1),
    (20, '2 Spoons', 1),
    (20, '1 Teaspoon (5 ml)', 1),
    (20, '2 Teaspoons (10 ml)', 1),
    (20, '2.5 ml', 1),
    (20, '5 ml', 1),
    (20, '7.5 ml', 1),
    (20, '10 ml', 1),
    (20, '15 ml', 1),
    (20, '20 ml', 1),
    (20, '25 ml', 1),
    (20, '30 ml', 1),
    (20, '1 Drop', 1),
    (20, '2 Drops', 1),
    (20, '3 Drops', 1),
    (20, '4 Drops', 1),
    (20, '5 Drops', 1),
    (20, '10 Drops', 1),
    (20, '1 Puff', 1),
    (20, '2 Puffs', 1),
    (20, '3 Puffs', 1),
    (20, '1 Spray', 1),
    (20, '2 Sprays', 1),
    (20, '3 Sprays', 1),
    (20, 'Apply Thin Layer', 1),
    (20, 'Apply Generously', 1),
    (20, 'Apply Locally', 1),
    (20, '1 Patch', 1),
    (20, '2 Patches', 1),
    (20, '1 Unit', 1),
    (20, '2 Units', 1),
    (20, '5 Units', 1),
    (20, '10 Units', 1),
    (20, '20 Units', 1),
    (20, '30 Units', 1),
    (20, '40 Units', 1),
    (20, '50 Units', 1),
    (20, '1 Injection', 1),
    (20, '2 Injections', 1),
    (20, 'As Directed', 1),
    (20, 'SOS', 1),
    (20, 'Stat', 1)
) AS t(category_id, value, usage_count)
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.aka_master_dropdown_catalog m 
  WHERE m.category_id = t.category_id AND LOWER(TRIM(m.value)) = LOWER(TRIM(t.value))
);
