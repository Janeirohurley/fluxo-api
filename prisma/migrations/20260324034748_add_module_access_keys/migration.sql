-- CreateTable
CREATE TABLE "access_plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_plan_modules" (
    "plan_id" UUID NOT NULL,
    "module_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_plan_modules_pkey" PRIMARY KEY ("plan_id","module_name")
);

-- CreateTable
CREATE TABLE "access_keys" (
    "id" UUID NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "label" TEXT,
    "plan_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "access_plans_code_key" ON "access_plans"("code");

-- CreateIndex
CREATE INDEX "access_plan_modules_module_name_idx" ON "access_plan_modules"("module_name");

-- CreateIndex
CREATE UNIQUE INDEX "access_keys_key_hash_key" ON "access_keys"("key_hash");

-- CreateIndex
CREATE INDEX "access_keys_plan_id_idx" ON "access_keys"("plan_id");

-- CreateIndex
CREATE INDEX "access_keys_is_active_idx" ON "access_keys"("is_active");

-- AddForeignKey
ALTER TABLE "access_plan_modules" ADD CONSTRAINT "access_plan_modules_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "access_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_keys" ADD CONSTRAINT "access_keys_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "access_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
