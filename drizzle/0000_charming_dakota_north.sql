CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" varchar NOT NULL,
	"projectName" varchar NOT NULL,
	"userEmail" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_projectId_unique" UNIQUE("projectId"),
	CONSTRAINT "projects_projectName_unique" UNIQUE("projectName")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"credits" integer DEFAULT 3,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "whiteboard" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" varchar NOT NULL,
	"elements" jsonb,
	"appState" jsonb,
	"files" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whiteboard_projectId_unique" UNIQUE("projectId")
);
--> statement-breakpoint
ALTER TABLE "whiteboard" ADD CONSTRAINT "whiteboard_projectId_projects_projectId_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("projectId") ON DELETE no action ON UPDATE no action;