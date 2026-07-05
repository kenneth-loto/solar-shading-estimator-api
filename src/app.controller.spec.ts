import { jest } from "@jest/globals";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller.js";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("https://docs.example.com"),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe("root", () => {
    it("should return the welcome message and docs URL", () => {
      const result = appController.getRoot();
      expect(result).toHaveProperty("message", "Solar Shading Estimator API");
      expect(result).toHaveProperty("docs", "https://docs.example.com");
    });
  });
});
