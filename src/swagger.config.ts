import { DocumentBuilder } from "@nestjs/swagger";

export function buildSwaggerConfig(port: number) {
  return new DocumentBuilder()
    .setTitle("Solar Shading Estimator API")
    .setDescription(
      "Estimate realistic solar energy production by combining NASA POWER irradiance data, PVWatts baseline estimates, and a simplified sun-position vs. obstruction shading model.\n\nWrite endpoints (`POST`, `PATCH`, `DELETE`) require an API key. Request one from the API administrator, then click the **Authorize** button below to set it.",
    )
    .setVersion("1.0")
    .addTag("App")
    .addTag("Sites")
    .addTag("Irradiance")
    .addTag("PvWatts")
    .addTag("Shading")
    .addTag("Analysis")
    .addServer(`http://localhost:${port}`, "Local development")
    .addServer("https://solar-shading-estimator-api.onrender.com", "Production")
    .addSecurity("api-key", {
      type: "apiKey",
      in: "header",
      name: "x-api-key",
      description:
        "API key for write access. Request one from the API administrator.",
    })
    .build();
}
