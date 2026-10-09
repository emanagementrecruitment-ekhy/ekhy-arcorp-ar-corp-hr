-- Tera (terapis) codes use the EQ prefix; staff keep AR. Same number, new prefix (AR-07 -> EQ-07),
-- skipping any row whose EQ twin already exists so the unique index on code can never be violated.
UPDATE "Employee"
SET "code" = 'EQ-' || SUBSTR("code", 4)
WHERE "role" = 'Tera'
  AND "code" LIKE 'AR-%'
  AND NOT EXISTS (SELECT 1 FROM "Employee" x WHERE x."code" = 'EQ-' || SUBSTR("Employee"."code", 4));
