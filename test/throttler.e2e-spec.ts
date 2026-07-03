import {
  type ArgumentsHost,
  Catch,
  Controller,
  type ExceptionFilter,
  Get,
  HttpException,
  INestApplication,
  Module,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { Throttle, ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import request from "supertest";

@Catch()
class TestExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "object" && res !== null && "errors" in res) {
        const { message, errors } = res as {
          message: string;
          errors: unknown;
        };
        response.status(status).json({ statusCode: status, message, errors });
        return;
      }
      response
        .status(status)
        .json({ statusCode: status, message: exception.message, data: null });
      return;
    }
    response
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", data: null });
  }
}

@Controller()
class UnrestrictedController {
  @Get("unrestricted")
  get() {
    return { message: "ok" };
  }
}

@Throttle({ default: { limit: 3 } })
@Controller()
class RestrictedController {
  @Get("restricted")
  get() {
    return { message: "ok" };
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "default",
          limit: 5,
          ttl: 60_000,
        },
      ],
      errorMessage: "Too Many Requests",
    }),
  ],
  controllers: [UnrestrictedController, RestrictedController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class TestModule {}

describe("Throttler (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new TestExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("allows requests within the global limit", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .get("/unrestricted")
        .expect(200)
        .expect((res) => {
          expect(res.headers["x-ratelimit-limit"]).toBe("5");
        });
    }
  });

  it("blocks requests that exceed the global limit", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).get("/unrestricted");
    }

    await request(app.getHttpServer())
      .get("/unrestricted")
      .expect(429)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 429,
          message: "Too Many Requests",
        });
        expect(res.headers["retry-after"]).toBeDefined();
      });
  });

  it("respects @Throttle decorator with lower limit", async () => {
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).get("/restricted").expect(200);
    }

    await request(app.getHttpServer())
      .get("/restricted")
      .expect(429)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 429,
          message: "Too Many Requests",
        });
      });
  });

  it("still allows unrestricted routes after restricted route is blocked", async () => {
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).get("/restricted").expect(200);
    }

    await request(app.getHttpServer()).get("/restricted").expect(429);

    await request(app.getHttpServer()).get("/unrestricted").expect(200);
  });
});
