/*
  Warnings:

  - A unique constraint covering the columns `[country,province,district,city,latitude,longitude]` on the table `Location` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,host]` on the table `Server` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Location_country_province_district_city_latitude_longitude_key" ON "Location"("country", "province", "district", "city", "latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "Server_name_host_key" ON "Server"("name", "host");
