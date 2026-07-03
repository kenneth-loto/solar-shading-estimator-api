import Joi from "joi";

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  PORT: Joi.number().port().default(8080),
  NASA_POWER_API_URL: Joi.string()
    .uri()
    .default("https://power.larc.nasa.gov/api/temporal/daily/point"),
});
