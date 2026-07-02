---
name: nestjs-jest-prisma-testing
description: Write strictly-typed Jest tests for NestJS services and controllers that use Prisma directly — no `any`, correctly mocked Prisma delegates, real model shapes.
---

NestJS, Prisma, and Jest are a common stack — but the combination has a sharp edge. Prisma's generated client types are large and strict, and the moment a test reaches for a shortcut (`as any`, a partial mock object, an untyped `jest.fn()`), TypeScript either stops catching real bugs or starts throwing confusing `never` errors that look unrelated to the actual mistake.

This skill exists because both problems are avoidable with a small, consistent set of rules. Apply them and Prisma-backed NestJS tests stay fully typed, fully readable, and free of escape hatches.

## The Four Rules

**1. Type the mock against the real class, not method by method.**
Don't try to type each `jest.fn()` individually with generics — it's fragile and commonly collapses to `never`. Instead, register the mock through `Test.createTestingModule`'s `useValue`, then retrieve it typed as `jest.Mocked<ServiceName>`. The type comes from the retrieval, not from the mock declaration.

**2. Mock data must match the full Prisma model shape.**
`findUnique`'s real return type is the entire model — every field, not just the ones you care about. `{ id: "task-1" }` will fail to typecheck against Prisma's generated `Task` type. Build full fixtures once and reuse them.

**3. Enum and literal fields need `as const`.**
Any field backed by a Prisma enum (`role`, `status`, `priority`, etc.) gets widened to plain `string` by TypeScript unless pinned with `as const`. Without it, a perfectly valid value like `"TODO"` fails to satisfy a Prisma-generated return type that expects the literal union.

**4. `as unknown as T` is the only acceptable cast — and only when nothing else works.**
A handwritten mock of a Prisma delegate (`prisma.task`) will never structurally satisfy the real type, which has 15+ methods (`aggregate`, `groupBy`, `findFirst`, and more) beyond the few you're using. TypeScript correctly refuses a direct cast here because there's too little overlap. Going through `unknown` first is the deliberate, narrow way to say "trust me, this is enough for what I'm testing" — without reaching for `any`, which throws away type checking everywhere, not just on this one object.

## Mocking a Prisma Delegate

```typescript
import type { PrismaClient } from "../generated/prisma/client.js";

const mockPrisma = {
  task: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<PrismaClient["task"]>,
};
```

Only declare the methods your service actually calls. The `as unknown as` cast is expected and correct here — it's not a sign something is wrong.

## Mocking `$transaction`

This is the part of Prisma mocking that trips people up most, because `$transaction` with a callback doesn't return a value directly — it receives a transaction client and expects your code to run queries against *that* client:

```typescript
const mockPrisma = {
  $transaction: jest.fn((callback) => callback(mockPrisma)),
  task: { /* ... */ } as unknown as jest.Mocked<PrismaClient["task"]>,
  user: { /* ... */ } as unknown as jest.Mocked<PrismaClient["user"]>,
};
```

The mock simply invokes the callback immediately with the same mock object. Since `task`/`user` are already mocked on that object, any "inside the transaction" queries your service runs hit the exact same mocked methods you've already configured — no real transactional behavior needed for a unit test.

Stop here. If a test needs to verify actual rollback or isolation behavior, that's not a unit test's job — write an E2E test against a real test database instead. Trying to simulate rollback semantics inside a mock is a sign you're testing the wrong layer.

## Service Unit Tests

Build fixtures once, reuse everywhere a model is mocked more than once in a file — a common bug is one inline mock missing fields while four others have them right, simply because retyping the same object by hand at five call sites is easy to get inconsistent.

```typescript
import { jest } from "@jest/globals";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { PrismaClient } from "../generated/prisma/client.js";
import { PrismaService } from "../lib/database/prisma.service.js";
import { TaskService } from "./task.service.js";

const mockTask = {
  id: "task-1",
  title: "Test Task",
  description: "A test task",
  status: "TODO" as const,
  priority: "LOW" as const,
  projectId: "proj-1",
  assigneeId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  task: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<PrismaClient["task"]>,
};

describe("TaskService", () => {
  let service: TaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<TaskService>(TaskService) as jest.Mocked<TaskService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findById", () => {
    it("returns the task when found", async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);

      const result = await service.findById("task-1");

      expect(result).toEqual(mockTask);
    });

    it("throws NotFoundException when not found", async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(service.findById("nonexistent")).rejects.toThrow(NotFoundException);
    });
  });
});
```

## Controller Unit Tests

Controllers don't touch Prisma directly — they depend on services. Mock the service the same way, via DI retrieval typed as `jest.Mocked<T>`:

```typescript
import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import type { Request } from "express";
import { TaskController } from "./task.controller.js";
import { TaskService } from "./task.service.js";

describe("TaskController", () => {
  let controller: TaskController;
  let service: jest.Mocked<TaskService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        {
          provide: TaskService,
          useValue: { findById: jest.fn(), create: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
    service = module.get<TaskService>(TaskService) as jest.Mocked<TaskService>;
  });

  it("returns a task for an authorized user", async () => {
    const req = {
      user: { id: "user-1", email: "test@example.com", role: "MEMBER" },
    } as unknown as Request;

    service.findById.mockResolvedValue(mockTask);

    await controller.findById("task-1", req);

    expect(service.findById).toHaveBeenCalledWith("task-1");
  });
});
```

If your project augments Express's `Request` type with a `user` field (common with custom auth), `as unknown as Request` is the correct cast for a partial request object — `Request`'s real shape has dozens of required properties no test object will ever fully provide.

## E2E Tests

- Use a **real test database**. Never mock Prisma in E2E — that turns an E2E test into a slower, more complicated unit test and defeats its actual purpose: verifying the HTTP layer, the DI container, and the database integration together.
- Bootstrap with `createNestApplication()` + `app.init()` in `beforeAll`, and always `app.close()` in `afterAll` — skipping this leaks open handles and hangs the test runner.
- Clean up between tests with transaction rollback or table truncation in `afterEach`. Don't rely on test execution order for isolation.

### The `useClass` vs `useExisting` guard gotcha

If your app registers a global guard like this:

```typescript
providers: [{ provide: APP_GUARD, useClass: SomeGuard }],
```

**you cannot override it in tests.** `useClass` lets Nest instantiate the guard privately and internally — it's invisible to `overrideProvider`. To make a globally-registered guard overridable, register it with `useExisting` instead, and also list it as its own provider:

```typescript
providers: [
  { provide: APP_GUARD, useExisting: SomeGuard },
  SomeGuard,
],
```

Now it's visible to Nest as a regular provider, and your E2E setup can disable it cleanly:

```typescript
const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(SomeGuard)
  .useValue({ canActivate: jest.fn(() => true) })
  .compile();
```

This is an easy thing to miss, since the app runs fine in production either way — the difference only shows up the moment you try to test around the guard.

## Anti-Patterns

- `as any` anywhere in a test file. If a cast feels unavoidable, it's almost always `as unknown as T` you actually need.
- Partial mock objects (`{ id: "x" }`) standing in for full Prisma models. Build the full fixture once.
- Retyping the same model's mock object inline at multiple call sites instead of extracting a shared fixture.
- Mocking the database in E2E tests.
- Testing private methods directly (`service["privateMethod"]()`). Test through the public API.
- Leaving `app.close()` out of an E2E suite's `afterAll`.
- Assuming a `useClass`-registered global guard can be overridden in tests without changing its registration first.
