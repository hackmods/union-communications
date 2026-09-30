-- Ensure unionops_app can use MFA durable tables created after 0008.
-- DEFAULT PRIVILEGES cover most hosts; explicit grants close CapRover gaps where
-- pending enrollment INSERT failed closed and blocked "Generate setup code".
GRANT SELECT, INSERT, UPDATE ON mfa_pending_enrollments TO unionops_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON mfa_totp_counters TO unionops_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON mfa_session_grants TO unionops_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON mfa_verification_attempts TO unionops_app;
--> statement-breakpoint
REVOKE DELETE ON mfa_pending_enrollments FROM unionops_app;
--> statement-breakpoint
REVOKE DELETE ON mfa_totp_counters FROM unionops_app;
--> statement-breakpoint
REVOKE DELETE ON mfa_session_grants FROM unionops_app;
--> statement-breakpoint
REVOKE DELETE ON mfa_verification_attempts FROM unionops_app;
