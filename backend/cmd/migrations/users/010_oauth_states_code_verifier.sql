-- Add PKCE code-verifier support to OAuth state tokens.

ALTER TABLE oauth_states ADD COLUMN code_verifier TEXT NOT NULL DEFAULT '';
