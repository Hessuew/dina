CREATE INDEX "enrollments_created_at_idx" ON "enrollments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "enrollments_full_legal_name_trgm_idx" ON "enrollments" USING gin ("full_legal_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "enrollments_email_trgm_idx" ON "enrollments" USING gin ("email" gin_trgm_ops);