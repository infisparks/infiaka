-- Database update script to add custom medicine timings to category_id = 22
-- Inserts options case-insensitively only if they do not already exist in aka_master_dropdown_catalog.

INSERT INTO public.aka_master_dropdown_catalog (category_id, value, usage_count)
SELECT t.category_id, t.value, t.usage_count
FROM (
  VALUES
    (22, 'After Meal', 1),
    (22, 'Before Meal', 1),
    (22, 'With Meal', 1),
    (22, 'Empty Stomach', 1),
    (22, 'Before Breakfast', 1),
    (22, 'After Breakfast', 1),
    (22, 'Before Lunch', 1),
    (22, 'After Lunch', 1),
    (22, 'Before Dinner', 1),
    (22, 'After Dinner', 1),
    (22, 'Along With Food', 1),
    (22, 'At Bed Time', 1),
    (22, 'On Waking Up', 1),
    (22, '30 Mins Before Food', 1),
    (22, 'Not Related To Food Intake', 1),
    (22, 'Before Bath', 1),
    (22, 'After Bath', 1),
    (22, 'Before Sun Exposure', 1),
    (22, 'After Sun Exposure', 1),
    (22, 'Before Breakfast, Lunch And Dinner', 1),
    (22, 'After Breakfast, Lunch And Dinner', 1),
    (22, 'Before Breakfast And Dinner', 1),
    (22, 'After Breakfast And Dinner', 1),
    (22, 'Before Breakfast And Lunch', 1),
    (22, 'After Breakfast And Lunch', 1),
    (22, 'Before Lunch And Dinner', 1),
    (22, 'After Lunch And Dinner', 1)
) AS t(category_id, value, usage_count)
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.aka_master_dropdown_catalog m 
  WHERE m.category_id = t.category_id AND LOWER(TRIM(m.value)) = LOWER(TRIM(t.value))
);
