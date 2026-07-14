-- Optimization Script for medicine table (250k rows)
-- Enables pg_trgm and builds GIN trigram indexes to make case-insensitive substring searches (ILIKE '%query%') run under 10ms.

-- 1. Enable the PostgreSQL Trigram Extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create a GIN Trigram Index on the name column (essential for name containing searches)
CREATE INDEX IF NOT EXISTS idx_medicine_name_trgm 
ON public.medicine 
USING gin (name gin_trgm_ops);

-- 3. Create a GIN Trigram Index on the salt_composition column (essential for active salt ingredient searches)
CREATE INDEX IF NOT EXISTS idx_medicine_salt_composition_trgm 
ON public.medicine 
USING gin (salt_composition gin_trgm_ops);

-- 4. Create a GIN Trigram Index on the short_composition1 column
CREATE INDEX IF NOT EXISTS idx_medicine_short_composition1_trgm 
ON public.medicine 
USING gin (short_composition1 gin_trgm_ops);

-- Optional: Analyze the table to update PG query planner statistics
ANALYZE public.medicine;
