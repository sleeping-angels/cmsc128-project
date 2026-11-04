CREATE TYPE "public"."broadcast_kind" AS ENUM('advisory', 'survey');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('queued', 'sent', 'failed', 'outside_window');--> statement-breakpoint
ALTER TYPE "public"."source_channel" ADD VALUE 'dashboard';--> statement-breakpoint
CREATE TABLE "agency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_number" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "agency_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "agency_referral" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"agency_id" uuid NOT NULL,
	"referred_at" timestamp DEFAULT now() NOT NULL,
	"referred_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" text NOT NULL,
	"kind" "broadcast_kind" NOT NULL,
	"message_body" text NOT NULL,
	"target_barangay_ids" uuid[] DEFAULT '{}' NOT NULL,
	"target_hazard" "hazard_type",
	"target_area" geometry(Polygon, 4326),
	"respond_by" timestamp,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broadcast_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"channel" "source_channel" NOT NULL,
	"status" "delivery_status" DEFAULT 'queued' NOT NULL,
	"sent_at" timestamp,
	CONSTRAINT "broadcast_delivery_broadcast_resident_channel_key" UNIQUE("broadcast_id","resident_id","channel")
);
--> statement-breakpoint
CREATE TABLE "broadcast_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broadcast_id" uuid NOT NULL,
	"label" text NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_response" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broadcast_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"selected_option_id" uuid NOT NULL,
	"responded_at" timestamp DEFAULT now() NOT NULL,
	"escalated_report_id" uuid,
	CONSTRAINT "broadcast_response_escalated_report_id_unique" UNIQUE("escalated_report_id"),
	CONSTRAINT "broadcast_response_broadcast_resident_key" UNIQUE("broadcast_id","resident_id")
);
--> statement-breakpoint
CREATE TABLE "invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	"accepted_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invite_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "knowledge_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"language" "language" DEFAULT 'tgl' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_edit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"responder_id" text NOT NULL,
	"field" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"edited_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report" ALTER COLUMN "resident_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "duplicate_of_id" uuid;--> statement-breakpoint
ALTER TABLE "agency_referral" ADD CONSTRAINT "agency_referral_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_referral" ADD CONSTRAINT "agency_referral_agency_id_agency_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agency"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_referral" ADD CONSTRAINT "agency_referral_referred_by_user_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast" ADD CONSTRAINT "broadcast_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_delivery" ADD CONSTRAINT "broadcast_delivery_broadcast_id_broadcast_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcast"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_delivery" ADD CONSTRAINT "broadcast_delivery_resident_id_resident_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."resident"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_option" ADD CONSTRAINT "broadcast_option_broadcast_id_broadcast_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcast"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_response" ADD CONSTRAINT "broadcast_response_broadcast_id_broadcast_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcast"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_response" ADD CONSTRAINT "broadcast_response_resident_id_resident_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."resident"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_response" ADD CONSTRAINT "broadcast_response_selected_option_id_broadcast_option_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."broadcast_option"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_response" ADD CONSTRAINT "broadcast_response_escalated_report_id_report_id_fk" FOREIGN KEY ("escalated_report_id") REFERENCES "public"."report"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_accepted_user_id_user_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_entry" ADD CONSTRAINT "knowledge_entry_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_edit" ADD CONSTRAINT "report_edit_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_edit" ADD CONSTRAINT "report_edit_responder_id_user_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_referral_report_id_idx" ON "agency_referral" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "agency_referral_agency_id_idx" ON "agency_referral" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "broadcast_created_by_idx" ON "broadcast" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "broadcast_target_area_idx" ON "broadcast" USING gist ("target_area");--> statement-breakpoint
CREATE INDEX "broadcast_delivery_resident_id_idx" ON "broadcast_delivery" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "broadcast_option_broadcast_id_idx" ON "broadcast_option" USING btree ("broadcast_id");--> statement-breakpoint
CREATE INDEX "broadcast_response_resident_id_idx" ON "broadcast_response" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "broadcast_response_selected_option_id_idx" ON "broadcast_response" USING btree ("selected_option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_pending_email_key" ON "invite" USING btree ("email") WHERE "invite"."accepted_at" is null and "invite"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "invite_invited_by_idx" ON "invite" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX "knowledge_entry_updated_by_idx" ON "knowledge_entry" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "report_edit_report_id_edited_at_idx" ON "report_edit" USING btree ("report_id","edited_at");--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_duplicate_of_id_report_id_fk" FOREIGN KEY ("duplicate_of_id") REFERENCES "public"."report"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_duplicate_of_id_idx" ON "report" USING btree ("duplicate_of_id");