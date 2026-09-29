-- Messagerie et infolettre sur Resend.
--
-- Purement additive : des types, des tables et trois colonnes nullables. Rien
-- n'est renomme ni supprime. Les deux reprises de donnees sont en fin de
-- fichier.

-- CreateEnum
CREATE TYPE "MailboxKind" AS ENUM ('SHARED', 'PERSONAL');

-- CreateEnum
CREATE TYPE "MailFolder" AS ENUM ('INBOX', 'ARCHIVE', 'SPAM', 'TRASH');

-- CreateEnum
CREATE TYPE "MailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MailStatus" AS ENUM ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'DELAYED', 'BOUNCED', 'COMPLAINED', 'FAILED');

-- CreateEnum
CREATE TYPE "NewsletterCampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT');

-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "confirmationSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmationTokenHash" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Mailbox" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "kind" "MailboxKind" NOT NULL DEFAULT 'SHARED',
    "ownerId" TEXT,
    "isCatchAll" BOOLEAN NOT NULL DEFAULT false,
    "signature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mailbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailboxMember" (
    "mailboxId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailboxMember_pkey" PRIMARY KEY ("mailboxId","userId")
);

-- CreateTable
CREATE TABLE "MailThread" (
    "id" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "baseSubject" TEXT NOT NULL,
    "folder" "MailFolder" NOT NULL DEFAULT 'INBOX',
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "snippet" TEXT NOT NULL DEFAULT '',
    "participants" TEXT[],
    "hasOutbound" BOOLEAN NOT NULL DEFAULT false,
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "direction" "MailDirection" NOT NULL,
    "status" "MailStatus" NOT NULL,
    "statusDetail" TEXT,
    "resendId" TEXT,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "references" TEXT,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "to" TEXT[],
    "cc" TEXT[],
    "bcc" TEXT[],
    "replyTo" TEXT[],
    "subject" TEXT NOT NULL,
    "text" TEXT,
    "html" TEXT,
    "authentication" JSONB,
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "contentId" TEXT,
    "inline" BOOLEAN NOT NULL DEFAULT false,
    "storageKey" TEXT NOT NULL,

    CONSTRAINT "MailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterCampaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preheader" TEXT,
    "markdown" TEXT NOT NULL DEFAULT '',
    "status" "NewsletterCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "bouncedCount" INTEGER NOT NULL DEFAULT 0,
    "complainedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterDelivery" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "resendId" TEXT,
    "status" "MailStatus" NOT NULL DEFAULT 'QUEUED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mailbox_address_key" ON "Mailbox"("address");

-- CreateIndex
CREATE INDEX "Mailbox_ownerId_idx" ON "Mailbox"("ownerId");

-- CreateIndex
CREATE INDEX "MailboxMember_userId_idx" ON "MailboxMember"("userId");

-- CreateIndex
CREATE INDEX "MailThread_mailboxId_folder_lastMessageAt_idx" ON "MailThread"("mailboxId", "folder", "lastMessageAt");

-- CreateIndex
CREATE INDEX "MailThread_mailboxId_baseSubject_idx" ON "MailThread"("mailboxId", "baseSubject");

-- CreateIndex
CREATE INDEX "MailMessage_threadId_sentAt_idx" ON "MailMessage"("threadId", "sentAt");

-- CreateIndex
CREATE INDEX "MailMessage_mailboxId_messageId_idx" ON "MailMessage"("mailboxId", "messageId");

-- CreateIndex
CREATE INDEX "MailMessage_resendId_idx" ON "MailMessage"("resendId");

-- CreateIndex
CREATE UNIQUE INDEX "MailMessage_mailboxId_resendId_key" ON "MailMessage"("mailboxId", "resendId");

-- CreateIndex
CREATE INDEX "MailAttachment_messageId_idx" ON "MailAttachment"("messageId");

-- CreateIndex
CREATE INDEX "NewsletterCampaign_createdAt_idx" ON "NewsletterCampaign"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterDelivery_resendId_key" ON "NewsletterDelivery"("resendId");

-- CreateIndex
CREATE INDEX "NewsletterDelivery_campaignId_status_idx" ON "NewsletterDelivery"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterDelivery_campaignId_subscriberId_key" ON "NewsletterDelivery"("campaignId", "subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmationTokenHash_key" ON "NewsletterSubscriber"("confirmationTokenHash");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_confirmedAt_idx" ON "NewsletterSubscriber"("confirmedAt");

-- AddForeignKey
ALTER TABLE "Mailbox" ADD CONSTRAINT "Mailbox_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxMember" ADD CONSTRAINT "MailboxMember_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxMember" ADD CONSTRAINT "MailboxMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailThread" ADD CONSTRAINT "MailThread_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailAttachment" ADD CONSTRAINT "MailAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "MailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterCampaign" ADD CONSTRAINT "NewsletterCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterCampaign" ADD CONSTRAINT "NewsletterCampaign_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterDelivery" ADD CONSTRAINT "NewsletterDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NewsletterCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterDelivery" ADD CONSTRAINT "NewsletterDelivery_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise 1 : les abonnes deja en base sont confirmes d'office. Ils se sont
-- inscrits avant qu'aucun courriel ne puisse partir ; leur redemander une
-- confirmation reviendrait a ecrire a toute la liste pour lui demander si
-- elle veut recevoir des courriels.
UPDATE "NewsletterSubscriber" SET "confirmedAt" = "createdAt" WHERE "confirmedAt" IS NULL;

-- Reprise 2 : la boite partagee de contact, qui recoit aussi le courrier
-- adresse a toute adresse du domaine sans boite. Sans elle, le premier
-- courriel recu n'aurait nulle part ou aller. Ses membres se choisissent au
-- back-office ; l'adresse suit `SITE.email` (src/lib/shared/site.ts).
INSERT INTO "Mailbox" ("id", "address", "displayName", "kind", "isCatchAll", "createdAt", "updatedAt")
VALUES ('mailbox_contact', 'contact@humanitour.fr', 'Humanitour', 'SHARED', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("address") DO NOTHING;
