---
name: nestjs-jest-testing
description: Write strictly-typed Jest tests for NestJS using the repository pattern — no `any`, ORM-agnostic mocking via injected interfaces.
---

This skill assumes your NestJS services depend on injected repository interfaces, not a database client directly — `UserRepository`, not `PrismaService` or `Repository<User>`. That architectural choice is what this skill builds on top of; it doesn't teach you how to set the pattern up, only how to test cleanly once it's in place.

The payoff for testing specifically: instead of fighting a third-party ORM's large generated types, you mock a small interface you designed yourself. The same discipline applies either way — no `any`, full-shape fixtures, correct typing — but the mocking itself is simpler because there's nothing to fight.

## The Four Rules

**1. Type the mock against the real class, not method by method.**
Register the mock through `Test.createTestingModule`'s `useValue`, then retrieve it typed as `jest.Mocked<ServiceName>`. The type comes from retrieval, not from typing each `jest.fn()` individually — that approach is fragile and commonly collapses to `never`.

**2. Mock data must match your full domain model shape.**
A repository method like `findById` returns your whole domain entity, not just the fields a given test cares about. `{ id: "user-1" }` won't satisfy a return type that expects the complete `User` shape. Build full fixtures once and reuse them everywhere that model appears.

**3. Enum and literal fields need `as const`.**
Any field backed by a domain enum or literal union (`role`, `status`, etc.) gets widened to plain `string` by TypeScript unless pinned with `as const`. A value like `"ADMIN"` needs to stay the literal `"ADMIN"`, not collapse to `string`, or it won't satisfy a strictly-typed return value.

**4. `as unknown as T` is the only acceptable cast — and only when nothing else works.**
You'll need this far less than in ORM-coupled testing, since your own interfaces are small and a mock object can usually satisfy them directly. When you do need a partial object to stand in for something larger (a `Request` object, for instance), route through `unknown` first rather than reaching for `any`.

## Injection Tokens

TypeScript interfaces disappear at runtime, so NestJS can't resolve `UserRepository` as a dependency by type alone — you need an explicit token (a string or a `Symbol`):

```typescript
export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
}
```

```typescript
@Injectable()
export class UserService {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}
}
```

In tests, provide the mock against the same token:

```typescript
{ provide: USER_REPOSITORY, useValue: { findById: jest.fn(), create: jest.fn() } }
```

## Mocking a Repository Interface

```typescript
const mockUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  role: "MEMBER" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("UserService", () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: USER_REPOSITORY,
          useValue: { findById: jest.fn(), create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<jest.Mocked<UserRepository>>(USER_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the user when found", async () => {
    userRepository.findById.mockResolvedValue(mockUser);

    const result = await service.findById("user-1");

    expect(result).toEqual(mockUser);
  });
});
```

No `as unknown as` needed here — the mock object's shape genuinely satisfies `UserRepository` directly, since the interface only has the methods you defined. This is the concrete benefit of the pattern: testing stays this simple permanently, even as the underlying persistence layer changes.

## Controller Unit Tests

Identical regardless of what's behind the service — controllers never know whether a service is backed by a repository or a raw ORM client:

```typescript
import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import type { Request } from "express";
import { UserController } from "./user.controller.js";
import { UserService } from "./user.service.js";

describe("UserController", () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: { findById: jest.fn() } }],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService) as jest.Mocked<UserService>;
  });

  it("returns a user for an authorized request", async () => {
    const req = {
      user: { id: "user-1", email: "test@example.com", role: "MEMBER" },
    } as unknown as Request;

    service.findById.mockResolvedValue(mockUser);

    await controller.findById("user-1", req);

    expect(service.findById).toHaveBeenCalledWith("user-1");
  });
});
```

If your project augments Express's `Request` type with a `user` field, `as unknown as Request` is the correct cast for a partial request object — `Request`'s real shape has far more required properties than any test object provides.

## E2E Tests

The repository pattern gives you a real choice that ORM-coupled testing doesn't: a real database-backed repository implementation, or a fast in-memory fake.

**Real implementation** — closer to production, slower, needed when you actually want to verify persistence behavior end to end.

**In-memory fake** — an array-backed class implementing the same interface (`UserRepository`), swapped in via `overrideProvider`. Validates the entire NestJS request lifecycle — routing, guards, DI, controller logic — without a database at all:

```typescript
class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];

  async findById(id: string) {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async create(data: CreateUserData) {
    const user = { id: crypto.randomUUID(), ...data };
    this.users.push(user);
    return user;
  }
}

const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(USER_REPOSITORY)
  .useClass(InMemoryUserRepository)
  .compile();
```

Use the in-memory fake for most E2E coverage — it's fast and still exercises the real request lifecycle. Reserve real-database E2E tests for the specific cases where persistence behavior itself is what's under test.

- Bootstrap with `createNestApplication()` + `app.init()` in `beforeAll`, `app.close()` in `afterAll` — skipping the close leaks open handles and hangs the test runner.
- If using a real database, clean up between tests with transaction rollback or truncation. Don't rely on test order for isolation.

### The `useClass` vs `useExisting` guard gotcha

This applies regardless of persistence strategy. A globally-registered guard set up like this:

```typescript
providers: [{ provide: APP_GUARD, useClass: SomeGuard }],
```

**cannot be overridden in tests** — `useClass` lets Nest instantiate it privately, invisible to `overrideProvider`. Fix the registration:

```typescript
providers: [
  { provide: APP_GUARD, useExisting: SomeGuard },
  SomeGuard,
],
```

Then disable it cleanly in E2E setup:

```typescript
const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(SomeGuard)
  .useValue({ canActivate: jest.fn(() => true) })
  .compile();
```

## Anti-Patterns

- `as any` anywhere in a test file. Reach for `as unknown as T` instead, if a cast is genuinely unavoidable.
- Letting a service import the ORM/DB client directly "just this once." A single direct Prisma/TypeORM import inside a service that's supposed to depend only on a repository interface quietly invalidates the entire pattern — and the test isolation benefit goes with it.
- Partial mock objects standing in for full domain models.
- Retyping the same model's mock object inline at multiple call sites instead of extracting a shared fixture.
- Testing private methods directly. Test through the public API.
- Leaving `app.close()` out of an E2E suite's `afterAll`.
- Assuming a `useClass`-registered global guard can be overridden without changing its registration first.
