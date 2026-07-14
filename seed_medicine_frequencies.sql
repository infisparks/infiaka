-- Database update script to add custom medicine frequencies to category_id = 21
-- Inserts options case-insensitively only if they do not already exist in aka_master_dropdown_catalog.

INSERT INTO public.aka_master_dropdown_catalog (category_id, value, usage_count)
SELECT t.category_id, t.value, t.usage_count
FROM (
  VALUES
    (21, 'Stat', 1),
    (21, '0-0-1', 1),
    (21, '0-1-0', 1),
    (21, '1-0-0', 1),
    (21, '0-1-1', 1),
    (21, '1-0-1', 1),
    (21, '1-1-0', 1),
    (21, '1-1-1', 1),
    (21, '0-0-1/2', 1),
    (21, '0-1/2-0', 1),
    (21, '0-1/2-1/2', 1),
    (21, '1/2-0-1/2', 1),
    (21, '1/2-0-0', 1),
    (21, '1/2-1/2-0', 1),
    (21, '0-0-2', 1),
    (21, '0-2-0', 1),
    (21, '0-2-2', 1),
    (21, '2-0-0', 1),
    (21, '2-0-2', 1),
    (21, '2-2-0', 1),
    (21, '2-2-2', 1),
    (21, '0-0-3', 1),
    (21, '0-3-0', 1),
    (21, '0-3-3', 1),
    (21, '3-0-0', 1),
    (21, '3-0-3', 1),
    (21, '3-3-0', 1),
    (21, '3-3-3', 1),
    (21, 'Once Every 1 Hour', 1),
    (21, 'Once Every 1 Day', 1),
    (21, 'Once Every 1 Week', 1),
    (21, 'Once Every 1 Month', 1),
    (21, 'Once Every 1 Year', 1),
    (21, 'Once Every 2 Hours', 1),
    (21, 'Once Every 2 Days', 1),
    (21, 'Once Every 2 Weeks', 1),
    (21, 'Once Every 2 Months', 1),
    (21, 'Once Every 5 Hours', 1),
    (21, 'Once Every 5 Days', 1),
    (21, 'Once Every 5 Weeks', 1),
    (21, 'Once Every 5 Months', 1),
    (21, 'Once Every 6 Hours', 1),
    (21, 'Once Every 6 Days', 1),
    (21, 'Once Every 6 Weeks', 1),
    (21, 'Once Every 6 Months', 1)
) AS t(category_id, value, usage_count)
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.aka_master_dropdown_catalog m 
  WHERE m.category_id = t.category_id AND LOWER(TRIM(m.value)) = LOWER(TRIM(t.value))
);
