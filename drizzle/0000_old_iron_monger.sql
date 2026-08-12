CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "admin_action" (
	"id" text PRIMARY KEY NOT NULL,
	"actorEmail" text NOT NULL,
	"action" text NOT NULL,
	"targetId" text,
	"detail" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiry" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"topic" text NOT NULL,
	"message" text NOT NULL,
	"contact" text,
	"locale" text DEFAULT 'ko' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"adminNote" text,
	"senderHash" text
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"key" text NOT NULL,
	"windowStart" timestamp NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"blockedAt" timestamp,
	"blockedReason" text,
	"botScore" integer DEFAULT 0 NOT NULL,
	"botSignals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "work_log" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" text NOT NULL,
	"payload" jsonb NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "workplace" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_log" ADD CONSTRAINT "work_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace" ADD CONSTRAINT "workplace_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiry_status_idx" ON "inquiry" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inquiry_created_idx" ON "inquiry" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_key_window_idx" ON "rate_limit" USING btree ("key","windowStart");--> statement-breakpoint
CREATE INDEX "work_log_user_idx" ON "work_log" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "work_log_user_date_idx" ON "work_log" USING btree ("userId","date");--> statement-breakpoint
CREATE INDEX "workplace_user_idx" ON "workplace" USING btree ("userId");