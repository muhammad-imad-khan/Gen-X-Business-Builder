-- CreateTable
CREATE TABLE "revision_messages" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "target" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "revision_messages_lead_id_idx" ON "revision_messages"("lead_id");

-- CreateIndex
CREATE INDEX "revision_messages_created_at_idx" ON "revision_messages"("created_at");

-- AddForeignKey
ALTER TABLE "revision_messages" ADD CONSTRAINT "revision_messages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
