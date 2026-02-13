-- CreateEnum
CREATE TYPE "ApiScope" AS ENUM ('INGEST_READINGS', 'INGEST_INPUTS', 'READ_REPORTS');

-- CreateEnum
CREATE TYPE "PointType" AS ENUM ('SCADA', 'CEMS');

-- CreateEnum
CREATE TYPE "ReadingQuality" AS ENUM ('GOOD', 'BAD', 'UNCERTAIN');
