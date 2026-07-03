---
name: nestjs-patterns
description: Build production NestJS applications correctly — modules, DI, controllers, services, DTOs, guards, filters, and interceptors following framework-native patterns.
---

NestJS hands you an architecture. The mistake most teams make is ignoring it — reaching for generic Node.js patterns, instantiating services directly, or putting business logic in controllers. This skill is about using what NestJS gives you, not working around it.

Every pattern here is framework-native. None of them require a specific ORM, auth library, or third-party package. They work regardless of what you plug in underneath.

## Project Structure

Group by feature, not by technical layer. A folder called `controllers/` that holds every controller in the app is a maintenance problem at 10 endpoints and a disaster at 50. A folder called `users/` that holds the controller, service, DTOs, and tests for the users feature stays navigable as the app grows.

```
src/
├── app.module.ts
├── main.ts
├── common/                # Cross-cutting concerns shared across features
│   ├── decorators/        # @SetMetadata-based custom decorators
│   ├── filters/           # Exception filters
│   ├── guards/            # Auth, roles, rate-limit guards
│   ├── interceptors/      # Response transformation, logging
│   └── pipes/             # Custom validation pipes
├── lib/                   # Infrastructure modules (database, mail, cache, etc.)
│   └── database/          # e.g. prisma.module.ts + prisma.service.ts
├── utils/                 # Framework-agnostic pure utility functions
│   ├── math.ts            # e.g. rounding helpers
│   ├── date.ts            # date formatting helpers
│   └── string.ts          # string manipulation
└── module/                # Feature modules
    ├── users/
    │   ├── dto/           # classes with class-validator decorators
    │   ├── interfaces/    # TypeScript interfaces and types
    │   ├── users.controller.ts
    │   ├── users.service.ts
    │   ├── users.module.ts
    │   └── users.service.spec.ts
    └── posts/
```

**Rule:** Feature modules go in `src/module/<name>/`. Infrastructure (database, mail, cache) goes in `src/lib/<name>/`. Shared guards, interceptors, decorators, and filters go in `src/common/<category>/`. Pure utility functions with no NestJS dependency go in `src/utils/`.

## Module Patterns

### Feature module

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // only if another module needs to inject this service
})
export class UsersModule {}
```

Only export what other modules actually need to inject. Exporting everything by default creates accidental coupling and makes boundaries meaningless.

### Infrastructure module — global, imported once

```typescript
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
```

`@Global()` makes the module's exports available everywhere without re-importing. Use it only for infrastructure that genuinely belongs everywhere (database, logger, config). Import it once in `AppModule` — never in feature modules.

### Feature module importing another feature

```typescript
@Module({
  imports: [TasksModule],   // import when you need to inject TasksService
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
```

Import the module, not the service directly. NestJS resolves providers through module boundaries — if `CommentsService` needs `TasksService`, import `TasksModule` (and ensure `TasksModule` exports `TasksService`).

### AppModule — root composition

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema }),
    DatabaseModule, // @Global infrastructure, imported once
    UsersModule,
    PostsModule,
    CommentsModule,
  ],
  providers: [
    // Global enhancers with DI live here — see Bootstrap section
  ],
  controllers: [AppController],
})
export class AppModule {}
```

`AppModule` composes the application. It doesn't own business logic.

## Dependency Injection Rules

**Never instantiate services directly.** `new UsersService()` bypasses NestJS's DI container entirely — the instance has no injected dependencies, no lifecycle hooks, and can't be mocked in tests.

```typescript
// Wrong
const service = new UsersService(new DatabaseService());

// Correct
@Injectable()
export class PostsService {
  constructor(private readonly usersService: UsersService) {}
}
```

**Use `@Inject()` for custom tokens.** When a dependency is bound to a string or Symbol token (common with repository interfaces or third-party modules), `@Inject()` is required:

```typescript
constructor(@Inject(DATABASE_TOKEN) private readonly db: DatabaseClient) {}
```

**Use `forRootAsync()` for runtime config.** When a module needs injected services to initialize, `forRootAsync` with `useFactory` is the correct pattern — it defers initialization until the DI container is ready:

```typescript
SomeModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    apiKey: configService.getOrThrow("SOME_API_KEY"),
  }),
  inject: [ConfigService],
});
```

## Controllers

Controllers are thin. They receive a request, call a service, and return the result. Business logic — validation beyond DTO constraints, access control decisions, data transformation — belongs in services.

### Standard controller shape

```typescript
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(":id")
  findById(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ResponseMessage("User created successfully")
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ResponseMessage("User updated successfully")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ResponseMessage("User deleted successfully")
  delete(@Param("id") id: string) {
    return this.usersService.delete(id);
  }
}
```

### Route ordering — static before dynamic

NestJS evaluates route handlers top-to-bottom in the order they are defined. Always put static routes before parameterized dynamic routes — otherwise a request to `/users/all` matches `:id` with the value `"all"` before it reaches the `findAll` handler.

```typescript
@Controller("users")
export class UsersController {
  // 1. Static routes first
  @Get("all")
  findAll() {
    return this.usersService.findAll();
  }

  // 2. Dynamic/parameterized routes last
  @Get(":id")
  findById(@Param("id") id: string) {
    return this.usersService.findById(id);
  }
}
```

### Scoped access — the `@CurrentUser()` decorator

When handlers need the authenticated user, don't read `req.user` directly. `req.user` is typed as `Express.User | undefined` — accessing it with `!` is a non-null assertion that strict TypeScript and Biome reject. Repeating `if (!user) throw new UnauthorizedException()` across every handler is boilerplate that belongs in one place.

The correct pattern is a `@CurrentUser()` param decorator:

```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) throw new UnauthorizedException();
    return request.user;
  },
);
```

Use it in controllers — fully typed, no assertion, no repeated null check:

```typescript
@Get()
findAll(
  @Param("projectId") projectId: string,
  @CurrentUser() user: Express.User,
) {
  return this.tasksService.findByProject(projectId, user.id, user.role);
}
```

TypeScript knows `user` is `Express.User` — not `Express.User | undefined`. The decorator handles the unauthorized case in one place. If a `@Public()` route accidentally uses `@CurrentUser()`, it throws a clean 401 instead of crashing on an undefined access.

### Nested route params

```typescript
@Controller("projects/:projectId/tasks")
export class TasksController {
  @Get()
  findAll(@Param("projectId") projectId: string) {
    return this.tasksService.findByProject(projectId);
  }

  @Get(":id")
  findById(
    @Param("projectId") _projectId: string, // prefix unused params with _
    @Param("id") id: string,
  ) {
    return this.tasksService.findById(id);
  }
}
```

Unused route params that are structurally required by the path get prefixed with `_` to signal intent without triggering lint warnings.

## Services

Services own business logic. They validate references, enforce access rules, and throw NestJS exception classes — never raw `Error` or HTTP status codes.

### Consistent method shape

```typescript
@Injectable()
export class TasksService {
  async findAll(): Promise<Task[]>               // public list, no auth filter
  async findById(id: string): Promise<Task>      // throws NotFoundException if missing
  async findByIdScoped(id, userId, role)         // ownership check before returning
  async create(dto, ...context): Promise<Task>   // validates refs, returns created
  async update(id, dto): Promise<Task>           // validates existence first
  async delete(id): Promise<void>                // validates existence first
```

`findById` always throws `NotFoundException` when not found — never returns `null`. Callers that need to handle the missing case differently call it inside a try/catch; callers that just need the entity call it directly and trust it throws.

### Reusable query objects

```typescript
@Injectable()
export class TasksService {
  private include = {
    project: { select: { id: true, name: true } },
    assignee: { select: { id: true, name: true, email: true } },
  } as const;

  async findById(id: string) {
    const task = await this.db.task.findUnique({ where: { id }, include: this.include });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }
}
```

Define `include`, `select`, or `where` fragments as class properties with `as const`. Reuse them across methods to keep the returned shape consistent and prevent drift between read paths.

### Throw NestJS exceptions, never raw errors

```typescript
// Wrong
throw new Error("Not found");
throw { statusCode: 404, message: "Not found" };

// Correct
throw new NotFoundException("Task not found");
throw new ForbiddenException("You do not have access to this resource");
throw new ConflictException("Email already in use");
```

NestJS's `HttpException` subclasses carry the status code, integrate with exception filters, and produce consistent error shapes. Raw errors bypass all of this.

## DTOs and Interfaces

### The distinction

```
module/<name>/
├── dto/          # classes with class-validator decorators — request/response contracts
├── interfaces/   # TypeScript interfaces and types — internal contracts, API shapes
```

DTOs are **classes** — they survive TypeScript compilation and carry runtime decorator metadata used by `ValidationPipe`. Interfaces are **compile-time only** — they exist for type safety but have no runtime presence. Never use an interface where a DTO is needed, and never clutter a DTO file with interface definitions.

Don't define interfaces inline in service files — they get buried, can't be imported cleanly by other modules, and blur the line between runtime and compile-time concerns.

```typescript
// interfaces/nasa.interface.ts — compile-time types for an external API shape
export interface NasaPowerResponse {
  properties: {
    parameter: { ALLSKY_SFC_SW_DWN: Record<string, number | null> };
    latitude: number;
    longitude: number;
  };
}

export interface IrradianceResult {
  latitude: number;
  longitude: number;
  data: Record<string, number | null>;
}
```

```typescript
// irradiance.service.ts — clean import, no inline type noise
import type { IrradianceResult, NasaPowerResponse } from "./interfaces/nasa.interface.js";
```

Name interface files `<name>.interface.ts` and type alias files `<name>.types.ts` — the suffix makes the file's role immediately clear when scanning a directory.

### Create DTO

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @IsOptional()
  assigneeId?: string;
}
```

Every field gets a `class-validator` decorator. Required fields get `@IsNotEmpty()`. Optional fields get `@IsOptional()` — without it, `undefined` fields fail validation even when absent.

### Update DTO — always extend, never recreate

```typescript
// Use @nestjs/swagger's PartialType — it preserves Swagger metadata automatically.
// @nestjs/mapped-types works but strips it.
import { PartialType } from "@nestjs/swagger";
import { CreateTaskDto } from "./create-task.dto.js";

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
```

`PartialType` makes every field optional and keeps validation decorators in sync automatically. Never create update DTOs from scratch — you'll inevitably diverge from the create DTO and introduce inconsistencies that are hard to track down.

If the update DTO needs additional fields not present in the create DTO:

```typescript
export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsString()
  @IsOptional()
  projectId?: string;
}
```

### ValidationPipe — always these settings

```typescript
new ValidationPipe({
  whitelist: true, // strip properties not in the DTO
  forbidNonWhitelisted: true, // throw on unknown properties instead of stripping silently
  transform: true, // auto-transform payloads to DTO class instances
});
```

`whitelist` alone strips unknown properties silently — callers sending garbage fields get no feedback. `forbidNonWhitelisted` turns that into an error. Both together enforce the contract strictly.

## Utility Functions

Pure functions with no NestJS dependency — math helpers, date formatters, string utilities — belong in `src/utils/`, not in `src/common/`.

`src/common/` is for NestJS constructs that plug into the framework (guards, pipes, interceptors, decorators). Putting a plain function there pollutes that namespace and makes `common/` mean "everything that isn't a module."

```
src/utils/
├── math.ts      # roundToHalf, clamp, normalize, etc.
├── date.ts      # date formatting, range helpers
└── string.ts    # slugify, truncate, etc.
```

```typescript
// utils/math.ts
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}
```

```typescript
// irradiance.service.ts
import { roundToHalf } from "../../utils/math.js";
```

If a helper is only used in one service and has no obvious reuse case, keeping it as a private method on that class is fine. Move it to `src/utils/` when it's used in more than one place or could be.

## Custom Decorators

The `SetMetadata` factory pattern: a function that wraps `SetMetadata` with a fixed key, read later by a guard or interceptor via `Reflector`.

```typescript
// Define
export const Roles = (...roles: string[]) => SetMetadata("roles", roles);
export const ResponseMessage = (message: string) => SetMetadata("response-message", message);

// Use on a handler
@Roles("ADMIN")
@ResponseMessage("Created successfully")
create(@Body() dto: CreateDto) { ... }

// Read in a guard or interceptor
const roles = this.reflector.getAllAndOverride<string[]>("roles", [
  context.getHandler(),
  context.getClass(),
]);
```

`getAllAndOverride` checks handler metadata first, then class metadata — handler wins. This lets you set a default at the controller level and override per-method.

## Guards

### Role guard shape

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>("roles", [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true; // no roles required — allow through

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role) throw new ForbiddenException("No role assigned");

    return requiredRoles.includes(user.role);
  }
}
```

Return `true` to allow. Return `false` or throw to deny. Throwing a specific `ForbiddenException`/`UnauthorizedException` gives callers a meaningful error — returning `false` produces a generic 403.

### Extending a third-party guard

```typescript
@Injectable()
export class ExtendedGuard extends ThirdPartyGuard {
  constructor(
    @Inject(THIRD_PARTY_TOKEN) client: ThirdPartyClient,
    private readonly reflector: Reflector,
  ) {
    super(client);
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>("skip-guard", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    return super.canActivate(context);
  }
}
```

Pattern: extend to add skip/bypass metadata logic, delegate to `super.canActivate()` for the real check.

### Global guard registration — the `useExisting` gotcha

```typescript
// Wrong — guard instantiated privately, cannot be overridden in tests
providers: [{ provide: APP_GUARD, useClass: SomeGuard }];

// Correct — guard visible as a regular provider, overridable in tests
providers: [
  { provide: APP_GUARD, useExisting: SomeGuard },
  SomeGuard,
];
```

`useClass` lets Nest instantiate the guard privately — it becomes invisible to `overrideProvider` in tests, so you can never disable it in your test suite. `useExisting` references the separately-registered provider instead, keeping it visible and overridable. This difference only shows up in tests — the app behaves identically in production either way.

When a global guard needs injected dependencies, use `useFactory`:

```typescript
{
  provide: APP_GUARD,
  useFactory: (client: SomeClient, reflector: Reflector) =>
    new ExtendedGuard(client, reflector),
  inject: [SOME_CLIENT_TOKEN, Reflector],
}
```

## Exception Filters

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 1. NestJS HTTP exceptions (NotFoundException, ForbiddenException, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      response.status(status).json(
        typeof body === "object"
          ? { statusCode: status, ...body }
          : { statusCode: status, message: body }
      );
      return;
    }

    // 2. Known ORM / infrastructure errors — map to HTTP responses here
    // e.g. unique constraint violations → 409, foreign key errors → 400

    // 3. Fallback — unexpected errors
    response.status(500).json({
      statusCode: 500,
      message: "Internal server error",
    });
  }
}
```

Order matters: check the most specific exception types first, fall through to the generic handler last. `@Catch()` with no arguments catches everything — use this for your global filter, not `@Catch(HttpException)`, which silently swallows non-HTTP errors and returns a blank 500.

## Interceptors

### Response envelope interceptor

```typescript
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    const statusCode = response.statusCode ?? 200;
    const message =
      this.reflector.get<string>("response-message", context.getHandler()) ??
      "Success";

    return next.handle().pipe(
      map((data) => ({ statusCode, message, data })),
    );
  }
}
```

Wraps every successful response in a consistent `{ statusCode, message, data }` shape. Per-endpoint messages come from the `@ResponseMessage()` decorator via `Reflector`. Register globally so the shape is enforced everywhere without per-controller setup.

## Bootstrap Order

Order matters. Each global enhancement applies to everything registered after it — getting this wrong means pipes don't run, filters miss errors, or interceptors don't wrap responses.

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Swagger (optional — before globals so it can inspect the full app)
  const config = new DocumentBuilder().setTitle("API").setVersion("1.0").build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));

  // 2. Pipes — ValidationPipe has no injected deps, fine to instantiate here
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // 3. Shutdown hooks — graceful termination
  app.enableShutdownHooks();

  // 4. Listen
  await app.listen(process.env.PORT ?? 3000);
}
```

### Global enhancers with dependency injection

`app.useGlobalFilters(new MyFilter())` and `app.useGlobalInterceptors(new MyInterceptor())` work for simple enhancers with no injected dependencies. The moment a filter or interceptor needs a `LoggerService`, `ConfigService`, or anything else injected, **they must be registered in `AppModule` instead** — not instantiated with `new` in `main.ts`, which places them outside the DI container entirely.

Use `APP_FILTER`, `APP_INTERCEPTOR`, and `APP_PIPE` tokens from `@nestjs/core`:

```typescript
// app.module.ts
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter, // can now inject LoggerService, ConfigService, etc.
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor, // Reflector injected automatically by NestJS
    },
  ],
})
export class AppModule {}
```

**Default to the `APP_*` token approach for filters and interceptors** — even if they don't need injected deps today, they almost always will when the codebase matures. `ValidationPipe` is the exception: it rarely needs injected services and `useGlobalPipes(new ValidationPipe({...}))` in `main.ts` is idiomatic and widely used.

## Env Validation

Validate environment variables at boot — before any module initializes — so the app refuses to start with missing or malformed config rather than failing at runtime when the first request hits a missing value.

```typescript
// With any schema validator (Joi, Zod, class-validator — pick one)
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: yourSchemaHere,
  // or: validate: yourValidateFunctionHere
});
```

Every required env var should be explicitly named in the schema. Optional vars should have `.optional()` or a `.default()`. The goal: a fresh checkout with a missing `.env` fails loudly at startup, not silently at the first database call three seconds into a request.

## Anti-Patterns

- **`new Service()` direct instantiation.** Bypasses DI, breaks injection, breaks tests. Always use constructor injection.
- **`new Filter()` or `new Interceptor()` in `main.ts` when they have injected deps.** Places the enhancer outside the DI container. Use `APP_FILTER`/`APP_INTERCEPTOR` tokens in `AppModule` instead.
- **Business logic in controllers.** Controllers receive requests and call services. Access checks, data transformation, and validation beyond DTO constraints belong in services.
- **`req.user!` non-null assertions in controllers.** TypeScript and Biome reject this. Use a `@CurrentUser()` param decorator that throws `UnauthorizedException` in one place instead.
- **`@Catch(HttpException)` as your global filter.** This silently swallows non-HTTP errors and returns a blank 500 with no logging. Use `@Catch()` — no arguments.
- **Update DTOs recreated from scratch.** They drift from the create DTO immediately. Use `PartialType` from `@nestjs/swagger`.
- **`useClass` for global guards registered via `APP_GUARD`.** The guard becomes invisible to `overrideProvider` — you can never bypass it in tests. Use `useExisting` + a separately-registered provider.
- **Interfaces defined inline in service files.** They get buried and can't be cleanly imported. Put them in `interfaces/<name>.interface.ts` inside the feature folder.
- **Pure utility functions in `src/common/`.** `common/` is for NestJS constructs. Framework-agnostic helpers go in `src/utils/`.
- **Exporting every provider from every module by default.** Only export what other modules actually inject. Over-exporting creates invisible coupling that breaks encapsulation.
- **Throwing raw `Error` or plain objects from services.** Throw NestJS `HttpException` subclasses. Raw errors bypass filters and produce inconsistent responses.
- **Skipping `forbidNonWhitelisted: true` on ValidationPipe.** `whitelist: true` alone strips unknown fields silently. Callers sending invalid payloads get no feedback and no error. Use both.
- **Dynamic routes defined before static routes.** NestJS matches top-to-bottom — `/users/:id` defined before `/users/all` will match `"all"` as an id. Static routes always go first.
