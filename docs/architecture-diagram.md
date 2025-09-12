# Playwright CLI - Architecture Diagrams

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Entry Point                         │
│                         src/index.ts                          │
│              ┌──────────────────────────────┐                  │
│              │     Commander.js Program     │                  │
│              │   (Command Registration)     │                  │
│              └──────────────────────────────┘                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   Command Layer                               │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Legacy Commands │  │  CommandBase    │  │ Modern Commands │ │
│  │                 │  │ (Template       │  │ (Extends Base)  │ │
│  │ • click.ts      │  │  Method Pattern)│  │ • click-v2.ts   │ │
│  │ • navigate.ts   │  │                 │  │ • navigate-v2.ts│ │
│  │ • type.ts       │  │ Error Handling  │  │                 │ │
│  │                 │  │ Spinner Mgmt    │  │ + Validation    │ │
│  │ Direct Browser  │  │ Performance     │  │ + DI Support    │ │
│  │ Calls           │  │ Hooks           │  │ + Retry Logic   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                  Service Layer                                │
│                                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │             Dependency Injection Container                  │ │
│ │                                                             │ │
│ │  ┌─────────────────────┐    ┌─────────────────────────────┐ │ │
│ │  │   IBrowserService   │    │     RetryStrategy          │ │ │
│ │  │   (Interface)       │    │     (Strategy Pattern)     │ │ │
│ │  │                     │    │                             │ │ │
│ │  │ • getBrowser()      │    │ • ExponentialRetry         │ │ │
│ │  │ • withActivePage()  │    │ • LinearRetry              │ │ │
│ │  │ • launchChrome()    │    │ • FixedRetry               │ │ │
│ │  │                     │    │                             │ │ │
│ │  │ Implementations:    │    │ + Circuit Breaker          │ │ │
│ │  │ • BrowserHelper     │    │ + Performance Metrics      │ │ │
│ │  │ • MockBrowserSvc    │    └─────────────────────────────┘ │ │
│ │  └─────────────────────┘                                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │             Validation & Decorators                        │ │
│ │                                                             │ │
│ │  ┌─────────────────────┐    ┌─────────────────────────────┐ │ │
│ │  │   @ValidateUrl      │    │      Validation Chain      │ │ │
│ │  │   @ValidatePort     │    │      (Chain of Resp.)      │ │ │
│ │  │   @ValidateSelector │    │                             │ │ │
│ │  │                     │    │ Validators.url() →          │ │ │
│ │  │ Decorators          │    │ Validators.port() →         │ │ │
│ │  │ (Decorator Pattern) │    │ Validators.selector()       │ │ │
│ │  └─────────────────────┘    └─────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                Infrastructure Layer                           │
│                                                               │
│ ┌──────────────┐ ┌──────────────┐ ┌─────────────────────────┐  │
│ │ BrowserHelper│ │    Logger    │ │   Performance Monitor  │  │
│ │              │ │   (Winston)  │ │                         │  │
│ │ • getBrowser │ │              │ │ • Command Tracking      │  │
│ │ • getPage    │ │ • Console    │ │ • Execution Times       │  │
│ │ • launchChrome│ │ • File       │ │ • Success/Failure Rate  │  │
│ │ • withBrowser│ │ • Levels     │ │ • Retry Metrics         │  │
│ │              │ │ • Colors     │ │                         │  │
│ └──────────────┘ └──────────────┘ └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Command Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Input                                │
│              $ playwright click "#button"                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│              1. Commander.js Routing                           │
│         Finds matching command and extracts args               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│               2. CommandBase.getCommand()                      │
│         Wraps execute() with error handling                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│          3. executeWithErrorHandling() Template                │
│                                                               │
│  ┌─ Performance Tracking Start ─┐                             │
│  │                               │                             │
│  │  ┌─────────────────────────┐  │                             │
│  │  │   preExecute() Hook     │  │ (Override in subclass)      │
│  │  └─────────────────────────┘  │                             │
│  │             │                  │                             │
│  │  ┌─────────────────────────┐  │                             │
│  │  │   execute() Abstract    │  │ (Implement in subclass)     │
│  │  │                         │  │                             │
│  │  │  ┌─ Validation ────────┐ │  │                             │
│  │  │  │ @ValidateSelector   │ │  │                             │
│  │  │  │ @ValidatePort       │ │  │                             │
│  │  │  └─────────────────────┘ │  │                             │
│  │  │             │             │  │                             │
│  │  │  ┌─ Browser Operations ─┐ │  │                             │
│  │  │  │ withActivePage()    │ │  │                             │
│  │  │  │   │                 │ │  │                             │
│  │  │  │   └─ page.click()   │ │  │                             │
│  │  │  └─────────────────────┘ │  │                             │
│  │  └─────────────────────────┘  │                             │
│  │             │                  │                             │
│  │  ┌─────────────────────────┐  │                             │
│  │  │  postExecute() Hook     │  │ (Override in subclass)      │
│  │  └─────────────────────────┘  │                             │
│  │                               │                             │
│  └─ Performance Tracking End ───┘                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                4. Success/Error Response                       │
│           ✅ Operation completed successfully                   │
│           ❌ Error: Command failed: [detailed message]         │
└─────────────────────────────────────────────────────────────────┘
```

## Dependency Injection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 Command Instantiation                          │
│           new ClickValidatedCommand()                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│              CommandBase Constructor                           │
│                                                               │
│  this.browserService = browserService ||                     │
│    container.resolve<IBrowserService>(                       │
│      SERVICE_TYPES.BrowserService                            │
│    );                                                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                DI Container Lookup                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Production:                                            │  │
│  │  SERVICE_TYPES.BrowserService → BrowserHelperAdapter   │  │
│  │                                                         │  │
│  │  Testing:                                               │  │
│  │  SERVICE_TYPES.BrowserService → MockBrowserService     │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│               Service Implementation                           │
│                                                               │
│  Production Flow:                    Testing Flow:            │
│  ┌─────────────────────────────┐    ┌────────────────────────┐ │
│  │  BrowserHelperAdapter       │    │   MockBrowserService   │ │
│  │    │                        │    │     │                  │ │
│  │    └─> BrowserHelper        │    │     └─> Mock Objects   │ │
│  │         │                   │    │                        │ │
│  │         └─> Chrome CDP      │    │        (No real        │ │
│  │                             │    │         browser)       │ │
│  └─────────────────────────────┘    └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Validation Decorator Flow

```
┌─────────────────────────────────────────────────────────────────┐
│           Method Call with Decorated Parameters                │
│     execute(@ValidateSelector() selector: string)              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│            @validateParams Decorator Intercepts                │
│                                                               │
│  1. Extract parameter metadata from decorators                │
│  2. Build validation schema from metadata                     │
│  3. Apply validation chain to parameters                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│              Validation Chain Execution                       │
│                                                               │
│  For selector parameter:                                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Validators.selector({ required: true })                │  │
│  │    │                                                    │  │
│  │    ├─ Check if empty/null ─────────────────┐            │  │
│  │    │                                       ▼            │  │
│  │    ├─ Check if valid CSS selector ────────┐ ▼           │  │
│  │    │                                      ▼ ▼           │  │
│  │    └─ Check if not dangerous input ──────┐ ▼ ▼          │  │
│  │                                          ▼ ▼ ▼          │  │
│  │                               Pass ────────┘ │ │          │  │
│  │                               Fail ──────────┘ │          │  │
│  │                               Fail ────────────┘          │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                 Validation Result                              │
│                                                               │
│  Success:                           Failure:                  │
│  ┌─ Sanitized parameters ─────┐    ┌─ ValidationError ────────┐ │
│  │  Continue to method body   │    │   • Parameter: selector  │ │
│  │  with clean data           │    │   • Error: cannot be     │ │
│  └────────────────────────────┘    │     empty               │ │
│                                    │   • Error: invalid CSS  │ │
│                                    │     format              │ │
│                                    └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Retry Strategy with Circuit Breaker

```
┌─────────────────────────────────────────────────────────────────┐
│            Browser Operation Initiated                         │
│        await this.withActivePageRetry(port, callback)          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│              Retry Strategy Selection                          │
│                                                               │
│  Operation Type → Strategy:                                   │
│  • browser      → ExponentialRetryStrategy                    │
│  • interaction  → LinearRetryStrategy                         │
│  • network      → ExponentialRetryStrategy (longer delays)    │
│  • file         → FixedRetryStrategy                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                Circuit Breaker Check                          │
│                                                               │
│  Circuit State:                                               │
│  ┌─ CLOSED ──────┐  ┌─ HALF-OPEN ───┐  ┌─ OPEN ─────────────┐ │
│  │ Normal        │  │ Testing       │  │ Blocking all       │ │
│  │ operation     │  │ operation     │  │ operations         │ │
│  │               │  │               │  │                    │ │
│  │ Proceed ──────┼─►│ Proceed ──────┼─►│ Throw error        │ │
│  │               │  │               │  │ immediately        │ │
│  └───────────────┘  └───────────────┘  └────────────────────┘ │
└─────────────────────┬───────────────────────────────────────────┘
                      │ (if CLOSED or HALF-OPEN)
┌─────────────────────▼───────────────────────────────────────────┐
│               Retry Loop (Max Attempts)                       │
│                                                               │
│  Attempt 1: ┌─ Execute Operation ─┐                          │
│             │                     │                          │
│             │ Success ──── Return Result                     │
│             │                                               │ │
│             │ Failure ──── Check if Retryable               │ │
│                                │                            │ │
│                                ▼                            │ │
│  Attempt 2: ┌─ Calculate Delay ──┐                          │ │
│             │ (Exponential: 2^n) │                          │ │
│             │ (Linear: base*n)   │                          │ │
│             │ (Fixed: constant)  │                          │ │
│             └─ Wait ─────────────┘                          │ │
│                        │                                    │ │
│                        ▼                                    │ │
│             ┌─ Execute Operation ─┐                          │ │
│             │                     │                          │ │
│             │ Success ──── Return Result                     │ │
│             │                     │                          │ │
│             │ Failure ──── Continue/Fail                     │ │
│                                                               │
│  After Max Attempts: Throw final error                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│            Circuit Breaker State Update                       │
│                                                               │
│  On Success (HALF-OPEN → CLOSED):                            │
│  • Reset failure count                                       │
│  • Resume normal operation                                   │
│                                                               │
│  On Failure (3+ failures → OPEN):                            │
│  • Block future operations                                   │
│  • Schedule reset to HALF-OPEN (30s)                         │
│                                                               │
│  Performance Metrics Updated:                                │
│  • Total attempts, failures, success rate                    │
│  • Average retry time                                        │
│  • Circuit breaker state changes                             │
└─────────────────────────────────────────────────────────────────┘
```

This visual representation helps understand how the different patterns work together to create a robust, maintainable CLI architecture.