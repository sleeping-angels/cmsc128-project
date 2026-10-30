CREATE TYPE "public"."direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."hazard_type" AS ENUM('flood', 'landslide', 'storm_surge', 'earthquake', 'fire');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('hil', 'krj', 'tgl', 'eng');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'validated', 'dispatched', 'resolved', 'closed', 'invalid');--> statement-breakpoint
CREATE TYPE "public"."severity_level" AS ENUM('low', 'moderate', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."source_channel" AS ENUM('messenger', 'web');--> statement-breakpoint
CREATE TABLE "barangay" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"centroid" geometry(Point, 4326) NOT NULL,
	"boundary" geometry(MultiPolygon, 4326),
	"is_coastal" boolean DEFAULT false NOT NULL,
	"is_upland" boolean DEFAULT false NOT NULL,
	"hazards" "hazard_type"[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "barangay_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"report_id" uuid,
	"channel" "source_channel" NOT NULL,
	"direction" "direction" NOT NULL,
	"sender_id" text,
	"body" text,
	"attachments" jsonb,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "incident_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracking_token" text NOT NULL,
	"resident_id" uuid NOT NULL,
	"is_proxy" boolean DEFAULT false NOT NULL,
	"reviewed_by" text,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"incident_type_id" uuid,
	"severity" "severity_level",
	"barangay_id" uuid,
	"location_text" text,
	"location" geometry(Point, 4326),
	"incident_at" timestamp,
	"source_channel" "source_channel" NOT NULL,
	"parsed_automatically" boolean DEFAULT false NOT NULL,
	"parse_confidence" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "report_tracking_token_unique" UNIQUE("tracking_token")
);
--> statement-breakpoint
CREATE TABLE "victim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"sex" "sex",
	"age" integer,
	"medical_condition" text,
	CONSTRAINT "victim_age_check" CHECK ("victim"."age" >= 0)
);
--> statement-breakpoint
CREATE TABLE "resident" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"contact_number" text,
	"age" integer,
	"sex" "sex",
	"barangay_id" uuid,
	"location_text" text,
	"location" geometry(Point, 4326),
	"language_preference" "language" DEFAULT 'tgl' NOT NULL,
	"broadcasts_opt_in" boolean DEFAULT true NOT NULL,
	"privacy_notice_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resident_age_check" CHECK ("resident"."age" >= 0)
);
--> statement-breakpoint
CREATE TABLE "resident_channel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"channel" "source_channel" NOT NULL,
	"external_id" text NOT NULL,
	"last_inbound_at" timestamp,
	"push_subscription" jsonb,
	CONSTRAINT "resident_channel_channel_external_id_key" UNIQUE("channel","external_id")
);
--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_resident_id_resident_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."resident"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_resident_id_resident_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."resident"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_incident_type_id_incident_type_id_fk" FOREIGN KEY ("incident_type_id") REFERENCES "public"."incident_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_barangay_id_barangay_id_fk" FOREIGN KEY ("barangay_id") REFERENCES "public"."barangay"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "victim" ADD CONSTRAINT "victim_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident" ADD CONSTRAINT "resident_barangay_id_barangay_id_fk" FOREIGN KEY ("barangay_id") REFERENCES "public"."barangay"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_channel" ADD CONSTRAINT "resident_channel_resident_id_resident_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."resident"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "barangay_centroid_idx" ON "barangay" USING gist ("centroid");--> statement-breakpoint
CREATE INDEX "barangay_boundary_idx" ON "barangay" USING gist ("boundary");--> statement-breakpoint
CREATE UNIQUE INDEX "message_channel_external_id_key" ON "message" USING btree ("channel","external_id") WHERE "message"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "message_resident_id_created_at_idx" ON "message" USING btree ("resident_id","created_at");--> statement-breakpoint
CREATE INDEX "message_report_id_idx" ON "message" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "report_resident_id_idx" ON "report" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "report_status_created_at_idx" ON "report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "report_incident_type_id_idx" ON "report" USING btree ("incident_type_id");--> statement-breakpoint
CREATE INDEX "report_barangay_id_idx" ON "report" USING btree ("barangay_id");--> statement-breakpoint
CREATE INDEX "report_location_idx" ON "report" USING gist ("location");--> statement-breakpoint
CREATE INDEX "victim_report_id_idx" ON "victim" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "resident_location_idx" ON "resident" USING gist ("location");--> statement-breakpoint
CREATE INDEX "resident_channel_resident_id_idx" ON "resident_channel" USING btree ("resident_id");