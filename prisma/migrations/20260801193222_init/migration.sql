-- CreateTable
CREATE TABLE "SpeedTest" (
    "id" TEXT NOT NULL,
    "download" DOUBLE PRECISION NOT NULL,
    "upload" DOUBLE PRECISION NOT NULL,
    "ping" DOUBLE PRECISION NOT NULL,
    "jitter" DOUBLE PRECISION NOT NULL,
    "packetLoss" DOUBLE PRECISION DEFAULT 0,
    "isp" TEXT,
    "asn" INTEGER,
    "country" TEXT,
    "province" TEXT,
    "district" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "browser" TEXT,
    "operatingSystem" TEXT,
    "deviceType" TEXT,
    "networkType" TEXT,
    "server" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "locationId" TEXT,
    "ispId" TEXT,
    "serverId" TEXT,

    CONSTRAINT "SpeedTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ISP" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asn" INTEGER,
    "country" TEXT,

    CONSTRAINT "ISP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "country" TEXT,
    "province" TEXT,
    "district" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT,
    "location" TEXT,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpeedTest_timestamp_idx" ON "SpeedTest"("timestamp");

-- CreateIndex
CREATE INDEX "SpeedTest_download_idx" ON "SpeedTest"("download");

-- CreateIndex
CREATE INDEX "SpeedTest_upload_idx" ON "SpeedTest"("upload");

-- CreateIndex
CREATE INDEX "SpeedTest_ping_idx" ON "SpeedTest"("ping");

-- CreateIndex
CREATE INDEX "SpeedTest_country_idx" ON "SpeedTest"("country");

-- CreateIndex
CREATE INDEX "SpeedTest_city_idx" ON "SpeedTest"("city");

-- CreateIndex
CREATE INDEX "SpeedTest_isp_idx" ON "SpeedTest"("isp");

-- CreateIndex
CREATE INDEX "SpeedTest_server_idx" ON "SpeedTest"("server");

-- CreateIndex
CREATE INDEX "SpeedTest_networkType_idx" ON "SpeedTest"("networkType");

-- CreateIndex
CREATE UNIQUE INDEX "ISP_name_key" ON "ISP"("name");

-- CreateIndex
CREATE INDEX "ISP_name_idx" ON "ISP"("name");

-- CreateIndex
CREATE INDEX "Location_country_idx" ON "Location"("country");

-- CreateIndex
CREATE INDEX "Location_city_idx" ON "Location"("city");

-- CreateIndex
CREATE INDEX "Location_province_idx" ON "Location"("province");

-- CreateIndex
CREATE INDEX "Server_name_idx" ON "Server"("name");

-- CreateIndex
CREATE INDEX "Server_location_idx" ON "Server"("location");

-- AddForeignKey
ALTER TABLE "SpeedTest" ADD CONSTRAINT "SpeedTest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedTest" ADD CONSTRAINT "SpeedTest_ispId_fkey" FOREIGN KEY ("ispId") REFERENCES "ISP"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedTest" ADD CONSTRAINT "SpeedTest_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;
