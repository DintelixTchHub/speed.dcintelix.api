DROP TRIGGER IF EXISTS "SpeedTest_set_coordinates" ON "SpeedTest";
DROP FUNCTION IF EXISTS public.set_speedtest_coordinates();
DROP INDEX IF EXISTS "SpeedTest_coordinates_gist_idx";
ALTER TABLE "SpeedTest" DROP COLUMN IF EXISTS "coordinates";
