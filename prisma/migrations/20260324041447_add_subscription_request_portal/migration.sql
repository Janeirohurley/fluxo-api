-- CreateEnum
CREATE TYPE "SubscriptionRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "subscription_requests" (
    "id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notes" TEXT,
    "status" "SubscriptionRequestStatus" NOT NULL DEFAULT 'pending',
    "approved_plan_id" UUID,
    "approved_access_key_id" UUID,
    "admin_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "email_sent_at" TIMESTAMP(3),
    "email_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_request_modules" (
    "request_id" UUID NOT NULL,
    "module_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_request_modules_pkey" PRIMARY KEY ("request_id","module_name")
);

-- CreateIndex
CREATE INDEX "subscription_requests_status_idx" ON "subscription_requests"("status");

-- CreateIndex
CREATE INDEX "subscription_requests_email_idx" ON "subscription_requests"("email");

-- CreateIndex
CREATE INDEX "subscription_request_modules_module_name_idx" ON "subscription_request_modules"("module_name");

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_approved_plan_id_fkey" FOREIGN KEY ("approved_plan_id") REFERENCES "access_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_approved_access_key_id_fkey" FOREIGN KEY ("approved_access_key_id") REFERENCES "access_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_request_modules" ADD CONSTRAINT "subscription_request_modules_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "subscription_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
