import Joi from "joi";

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  PORT: Joi.number().port().default(8080),
  NASA_POWER_API_URL: Joi.string().uri(),
  PVWATTS_API_KEY: Joi.string().required(),
  PVWATTS_API_URL: Joi.string().uri(),
  API_KEY: Joi.string().optional(),
  ALLOWED_ORIGINS: Joi.string(),
  DOCS_URL: Joi.string().uri(),
});
