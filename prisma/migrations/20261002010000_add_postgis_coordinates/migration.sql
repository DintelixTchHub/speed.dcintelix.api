CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "SpeedTest"
ADD COLUMN "coordinates" geography(Point, 4326);

UPDATE "SpeedTest"
SET "coordinates" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
WHERE "latitude" BETWEEN -90 AND 90
  AND "longitude" BETWEEN -180 AND 180;

CREATE OR REPLACE FUNCTION public.set_speedtest_coordinates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."latitude" BETWEEN -90 AND 90
    AND NEW."longitude" BETWEEN -180 AND 180 THEN
    NEW."coordinates" := ST_SetSRID(
      ST_MakePoint(NEW."longitude", NEW."latitude"),
      4326
    )::geography;
  ELSE
    NEW."coordinates" := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "SpeedTest_set_coordinates"
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "SpeedTest"
FOR EACH ROW
EXECUTE FUNCTION public.set_speedtest_coordinates();

CREATE INDEX "SpeedTest_coordinates_gist_idx"
ON "SpeedTest"
USING GIST ("coordinates");
