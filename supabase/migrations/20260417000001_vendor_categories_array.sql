-- Migration: Add multi-category support to vendors
-- Adds a TEXT[] column and migrates the existing single category value into it.

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing single category into the array
UPDATE vendors
SET categories = ARRAY[category]
WHERE category IS NOT NULL AND category != '';
