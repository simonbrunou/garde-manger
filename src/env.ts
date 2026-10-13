import { defineEnvVars } from '@sveltejs/kit/env';

// Every variable is optional: the consumers apply their own defaults and the
// production guards (assertConfig, getVapid, ...) decide what is required.
const optional = (input: string | undefined) => input;

export const variables = defineEnvVars({
	CRON_SECRET: { schema: optional },
	ORIGIN: { schema: optional },
	DATABASE_PATH: { schema: optional },
	OFF_USER_AGENT: { schema: optional },
	OFF_HOST: { schema: optional },
	PRODUCT_IMAGE_DIR: { schema: optional },
	VAPID_PUBLIC_KEY: { schema: optional },
	VAPID_PRIVATE_KEY: { schema: optional },
	VAPID_SUBJECT: { schema: optional },
	RP_ID: { schema: optional },
	RP_NAME: { schema: optional }
});
