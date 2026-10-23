# Multiverse Explorer Constitution

## Core Principles

### I. Deliver User Value with Focus
Changes MUST address a documented user or maintenance need and MUST avoid unrelated scope.
Choose the simplest implementation that meets the requirement; add abstractions only when
they improve a concrete capability or reduce repeated complexity. This keeps the demo
approachable and its purpose clear.

### II. Secure Inputs and Protect Data
All data crossing a trust boundary MUST be validated before use. Secrets MUST be supplied
through approved local or deployment configuration and MUST NOT be committed, logged, or
returned to clients. Authentication and authorization MUST be enforced by the relevant
backend endpoints when those capabilities are used. These rules reduce avoidable exposure
as the demo evolves.

### III. Verify Behavior with Automated Tests
Behavioral changes MUST include or update automated tests at the appropriate level.
Tests MUST cover important success paths and relevant failure or boundary conditions.
The frontend test suite and production build MUST pass before a change is considered
complete; backend changes MUST pass their relevant test suites and build. Tests make
regressions visible and provide repeatable evidence of correctness.

### IV. Keep Contracts and Boundaries Explicit
Frontend, API, application, domain, and infrastructure responsibilities MUST remain
separated according to the existing project structure. API and shared data contract
changes MUST update affected consumers and tests together. Breaking contract changes
MUST be documented with their migration impact. Explicit boundaries allow components
to evolve without hidden coupling.

### V. Make Failures Understandable
User-facing and operational failures MUST be handled explicitly; code MUST NOT silently
convert errors into success-shaped results. Logs and error messages MUST provide useful
diagnostic context without exposing secrets or sensitive data. Loading, empty, and error
states MUST be represented where users depend on remote or fallible operations.


### VI. Specification-First Development

New features and significant behavioral changes MUST
begin with a documented specification defining user
needs, expected behavior, acceptance criteria, and
relevant constraints.

Technical planning MUST follow specification review.
Implementation tasks MUST be traceable to approved
requirements.

Specifications MUST describe WHAT the system must
achieve without prematurely prescribing HOW it
must be implemented.

Minor maintenance changes MAY use a simplified
workflow when their scope and rationale are documented.


### VII. Governed AI Agent Execution

AI agents MUST operate within explicitly defined
responsibilities, permissions, and tool boundaries.

Agents MUST follow the project constitution and
approved specifications.

Planning agents MUST NOT modify application code,
infrastructure, or deployment configurations.

Agents MUST NOT autonomously merge pull requests,
deploy to production, or access secrets without
explicitly authorized workflows and controls.

Agent-generated changes MUST be validated through
the same quality gates as human-generated changes.

Human approval MUST be required for high-impact,
security-sensitive, or production-affecting actions.


## Technical & Security Constraints

The frontend MUST use the established React, TypeScript, and Vite toolchain unless an
approved change documents the reason and migration impact. Backend changes MUST follow
the existing .NET solution and project boundaries. External services and deployment
settings MUST be configurable rather than hard-coded into application source. Dependency
or infrastructure changes MUST preserve compatibility with documented local validation
and deployment workflows.

Backend dependencies MUST point toward the inner
architectural layers.

- Domain MUST remain independent of Application,
  Infrastructure, and API.
- Application MUST NOT depend on Infrastructure or API.
- Infrastructure MAY depend on Application and Domain.
- API MAY compose Application and Infrastructure.

Changes MUST preserve existing architectural
boundaries unless an approved architecture decision
documents the exception.


## Engineering Workflow & Quality Gates

Changes MUST be scoped, reviewed against this constitution, and validated with the
narrowest relevant automated checks. Frontend changes MUST run the available tests and
production build; backend changes MUST run relevant tests and build. CI or deployment
workflow changes MUST be checked for correctness without exposing credentials. Pull
requests MUST describe behavior changes, validation performed, and any known limitations.
If a required check cannot run, the reason and remaining risk MUST be stated.

## Governance

This constitution governs project decisions and supersedes conflicting informal
practices. Amendments MUST be made in the constitution, include an impact report, and
explain the rationale for changed requirements. Changes affecting implementation MUST
identify any necessary migration or follow-up work.

The constitution uses semantic versioning: MAJOR for incompatible changes to principles
or governance, MINOR for new principles or materially expanded requirements, and PATCH
for clarifications and non-semantic wording changes. Every amendment MUST update the
version and last-amended date. The original ratification date MUST be retained once
confirmed.

Contributors and reviewers MUST assess applicable changes against these principles and
quality gates. Any exception MUST be explicit in the change description, include its
rationale and risk, and receive review before it is accepted. Periodic project reviews
MUST check whether the principles and constraints still match the repository's
technology and delivery practices.

**Version**: 1.1.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date is not recorded; confirm with project maintainers. | **Last Amended**: 2026-10-22
