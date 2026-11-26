<!--
Sync Impact Report
Version change: 2.0.1 to 2.1.0
Modified sections: Architecture and Technology (the Favorites backend is .NET
today; a time-boxed, scoped exception allows its migration to Python with
FastAPI, see specs/001-favorites-python-api); Development Workflow and Quality
Gates (the backend CI gate is described by what it checks, not by a toolchain).
Principles I to V are unchanged.
Added sections: None.
Removed sections: None.
Follow-up TODOs: Confirm the original ratification date; configure CI to enforce
the coverage threshold; implement Blue/Green in deployment workflows; after the
.NET service is removed, drop the exception and state the Python backend as the
rule; name the tool that owns the database schema once EF Core migrations are
gone.
-->

# Multiverse Explorer Constitution

## Core Principles

### I. Preserve Layered Boundaries
The frontend owns presentation and client-side view state; typed service modules
own communication with external APIs and the Favorites API. The backend MUST keep
domain rules independent of HTTP, persistence, and framework concerns. Application
use cases depend on domain abstractions; infrastructure implements persistence and
other adapters; the API is the composition and transport boundary. Dependencies
MUST point inward, and new layers or services require a demonstrated need. These
boundaries keep business behavior testable without making a small application
unnecessarily distributed.

### II. Make Contracts and User States Explicit
Frontend and backend integrations MUST use explicit, typed contracts and handle
loading, empty, and failure outcomes rather than presenting failures as success.
Changes to API payloads, persisted data, or external-service mappings MUST update
their consumers and relevant tests together. Configuration and feature-flag
behavior MUST be explicit; contributors MUST NOT assume build-time frontend
settings can be changed by modifying the running container. This prevents
integration drift and makes user-visible behavior predictable.

### III. Verify Behavior at the Right Boundary
Changes MUST include or update automated tests for affected behavior at the
appropriate unit, component, or integration boundary. Backend persistence,
authentication, and API integration changes require integration coverage where
the behavior crosses those boundaries. Reported code coverage MUST be at least
80% for the frontend test suite and at least 80% for the backend test suite,
measured separately. Before merge, the repository CI checks MUST pass: frontend
lint, tests, and production build; backend build, unit tests, and integration
tests. Test-first development is encouraged, but the required invariant is
verified behavior, not a prescribed authoring sequence.

### IV. Secure Defaults and Configuration
Secrets MUST NOT be committed or exposed in frontend assets, logs, or generated
artifacts. Environment-specific credentials belong in approved secret stores or
deployment configuration, and service identities and permissions MUST be limited
to what the application requires. Authentication, antiforgery protections, and
input validation MUST be preserved when changing API behavior. Missing or invalid
required configuration MUST produce a visible diagnostic or deployment failure,
not a success-shaped fallback.

### V. Deliver Reproducibly and Promote Deliberately
Builds and deployments MUST be attributable to an immutable source revision.
Production releases MUST use a Blue/Green deployment model: keep the current
production environment (Blue) serving traffic while deploying the candidate
(Green) separately, validate Green with health checks and smoke tests, and shift
production traffic only after validation succeeds. The previous Blue environment
MUST remain available for rollback until Green is verified in production. A
release MUST NOT depend on gradually ramping traffic through a canary stage.
This provides a clear, reversible release boundary and limits user impact.

## Architecture and Technology

- The project is a single repository with a React and TypeScript frontend built
  with Vite and npm. The frontend is served as a containerized static application.
- The backend targets .NET and ASP.NET Core and is organized into API, Application,
  Domain, and Infrastructure projects. Entity Framework Core and SQL Server
  provide persistence for Favorites.
- **Exception: migration of the Favorites backend to Python.** The Favorites
  backend is being migrated to Python with FastAPI (specification
  `specs/001-favorites-python-api`). Scope: the whole Favorites API, including
  external sign-in, the session cookie, and CSRF protection. Owner: the
  repository owner. Until the cutover is verified in production, the .NET service
  stays the production backend and the Python service runs beside it without
  production traffic. The cutover MUST follow Principle V: the Python service is
  Green and the .NET service stays Blue as the rollback target. The migration
  keeps the layered boundaries of Principle I, keeps SQL Server for persistence,
  and does not change the database schema. The exception ends when the .NET
  service is removed (issue #142); the backend then targets Python with FastAPI.
- Frontend tests use Vitest and Testing Library. Backend tests are separated into
  unit and integration suites.
- GitHub Actions provides CI and deployment workflows. Container images are
  revision-tagged, and the adopted deployment model is Blue/Green using isolated
  candidate and production environments with an explicit traffic switch. Azure
  Container Apps and Bicep are the current deployment platform and infrastructure
  tooling, not permanent requirements. The deployment platform may change; any
  replacement MUST support the Blue/Green release and rollback guarantees in
  Principle V.
- The monorepo and layered backend favor coordinated changes and a clear domain
  boundary over independently operated microservices. New services or layers
  require evidence that their operational cost is justified.
- Vite `VITE_*` values are embedded into the frontend at build time. A different
  value requires a frontend rebuild; runtime environment changes alone do not
  update already-built assets. Feature flags MUST respect this constraint.
- Dependency changes MUST preserve the relevant lockfiles and project manifests.
  Framework and tool versions may evolve, but upgrades MUST be validated by the
  applicable CI gates.

## Development Workflow and Quality Gates

- Keep changes focused on the affected user behavior or system boundary. For
  cross-layer changes, update the API or data contract, its consumers, and tests
  in the same change unless a documented migration requires staged compatibility.
- Run the relevant checks locally before proposing a change. CI is the merge
  gate and MUST continue to exercise frontend lint, test, and build steps and
  backend build, unit-test, and integration-test steps. For a Python service, the
  build step is the container image build together with lint and type checks. CI
  MUST report at least 80% code coverage for each of the frontend and backend test
  suites separately, and every backend service in the repository MUST have such a
  CI check before it carries production traffic.
- Database schema changes MUST include the corresponding migration and tests or
  validation for affected persisted behavior.
- Pull requests MUST describe behavior changes, verification performed, and any
  known limitations or intentional deviations from this constitution.
- Deployment changes MUST preserve revision traceability, validate the Green
  environment before directing production traffic to it, and retain Blue as the
  rollback target until production verification succeeds.

## Governance

This constitution governs project architecture and engineering practice.
Amendments MUST be proposed in a pull request that explains the rationale,
affected principles, compatibility or migration impact, and required follow-up.
Project maintainers MUST review amendments and verify that related templates,
tests, and workflows remain consistent; this command changes only the
constitution.

Constitution versions follow semantic versioning. A MAJOR increment denotes a
backward-incompatible removal or redefinition of a principle. A MINOR increment
adds a principle or materially expands governance. A PATCH increment clarifies
wording without changing obligations.

For each pull request, authors and reviewers MUST check applicable principles
against the changed code and CI results. A deviation requires explicit
justification and maintainer approval; exceptions MUST identify their scope,
owner, and expiry or removal condition. Reviewers MUST request changes when a
required quality gate fails or an unapproved deviation remains.

**Version**: 2.1.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm original adoption date | **Last Amended**: 2026-11-26
