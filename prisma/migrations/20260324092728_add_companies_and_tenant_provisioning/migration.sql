-- CreateEnum
CREATE TYPE "CompanyProvisioningStatus" AS ENUM ('pending', 'provisioning', 'ready', 'failed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionRequestStatus" ADD VALUE 'provisioning';
ALTER TYPE "SubscriptionRequestStatus" ADD VALUE 'failed';

-- AlterTable
ALTER TABLE "access_keys" ADD COLUMN     "company_id" UUID;

-- AlterTable
ALTER TABLE "access_plans" ADD COLUMN     "company_id" UUID;

-- AlterTable
ALTER TABLE "subscription_requests" ADD COLUMN     "approved_company_id" UUID;

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_databases" (
    "company_id" UUID NOT NULL,
    "database_name" TEXT NOT NULL,
    "connection_string" TEXT NOT NULL,
    "provisioning_status" "CompanyProvisioningStatus" NOT NULL DEFAULT 'pending',
    "provisioned_at" TIMESTAMP(3),
    "last_provisioning_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_databases_pkey" PRIMARY KEY ("company_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "company_databases_database_name_key" ON "company_databases"("database_name");

-- CreateIndex
CREATE INDEX "company_databases_provisioning_status_idx" ON "company_databases"("provisioning_status");

-- CreateIndex
CREATE INDEX "access_keys_company_id_idx" ON "access_keys"("company_id");

-- CreateIndex
CREATE INDEX "access_plans_company_id_idx" ON "access_plans"("company_id");

-- CreateIndex
CREATE INDEX "subscription_requests_approved_company_id_idx" ON "subscription_requests"("approved_company_id");

-- AddForeignKey
ALTER TABLE "company_databases" ADD CONSTRAINT "company_databases_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_plans" ADD CONSTRAINT "access_plans_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_keys" ADD CONSTRAINT "access_keys_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_approved_company_id_fkey" FOREIGN KEY ("approved_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
