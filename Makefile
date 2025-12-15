encrypt:
	openssl aes-256-cbc -md sha512 -salt -pass pass:"$(ENCRYPTION_KEY)" -in .env.production -out .env.encrypted

decrypt:
	openssl aes-256-cbc -md sha512 -salt -pass pass:"$(ENCRYPTION_KEY)" -in .env.encrypted -out .env.production -d

encrypt-dev:
	openssl aes-256-cbc -md sha512 -salt -pass pass:"$(ENCRYPTION_KEY)" -in .env.development -out .env.dev.encrypted

decrypt-dev:
	openssl aes-256-cbc -md sha512 -salt -pass pass:"$(ENCRYPTION_KEY)" -in .env.dev.encrypted -out .env.development -d

encrypt-stage:
	openssl aes-256-cbc -md sha512 -salt -pass pass:"$(ENCRYPTION_KEY)" -in .env.stage -out .env.stage.encrypted

decrypt-stage:
	openssl aes-256-cbc -md sha512 -salt -pass pass:"$(ENCRYPTION_KEY)" -in .env.stage.encrypted -out .env.stage -d
