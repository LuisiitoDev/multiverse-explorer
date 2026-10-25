# Laboratorio GH600 — greenfield dentro de Multiverse Explorer

Base: `main` en `7f34dde4d575818b582161cc4afa61396589cd13`. Rama de estudio: `gh600/greenfield-2026-10-31`. Objetivo: preparación para el 31 de octubre de 2026, Costa Rica.

Este es un nuevo laboratorio acotado dentro de una aplicación existente. La funcionalidad **Agent Run Ledger** comienza sin implementación en `labs/gh600/app/`. El código actual de frontend/backend sigue siendo contexto para aprender a inspeccionar un repositorio. El curso oficial guía todas las prácticas.

## Empieza aquí

1. Cambia a esta rama en VS Code y lee la constitución en `.specify/memory/constitution.md`.
2. Lee `spec.md`, después `plan-de-estudio.md` y el laboratorio 01.
3. Selecciona `gh600-lab-planner`, cuyo perfil usa lectura y búsqueda. Revisa sus herramientas efectivas en tu runtime.
4. Completa la especificación si tienes dudas y solicita un plan. La plantilla no está aprobada: registra una autorización comprobable antes de delegar implementación.
5. Guarda evidencias reales; el estado inicial de todos los laboratorios es PENDIENTE.

```bash
git fetch origin
git switch --track origin/gh600/greenfield-2026-10-31
```

Si ya tienes esa rama local, usa `git switch gh600/greenfield-2026-10-31`. Revisa tus cambios locales antes de cambiar de rama.

## Contenido

- `spec.md`: requisitos del ejercicio nuevo, sin solución implementada.
- `labs/01-...` a `06-...`: prácticas en el orden de Microsoft Learn.
- `templates/`: plan, autorización, evidencia, checkpoint, handoff, evaluación y matriz de riesgo.
- `agent-templates/`: borradores con TODO, no cargados automáticamente como agentes.
- `evidence/`: resultados de tus sesiones; no se incluyen resultados ficticios.
- `app/`: ubicación de la funcionalidad nueva, todavía sin implementación.
- `coverage.csv`: seguimiento de las 52 unidades; debes registrar el avance real.

## Condiciones del laboratorio

El Planner investiga; no implementa. Los cambios de aplicación siguen especificación, revisión y plan. No fusionar ni desplegar automáticamente. No se han configurado servidores MCP, secretos, branch protections ni nuevos workflows activos. Las plantillas de autorización y de evidencia son registros, no mecanismos que por sí solos bloqueen acciones. En el laboratorio 06 diseñas y compruebas el control efectivo.

El Planner que ya existía en `main` se conserva. Compara su wildcard MCP con el nuevo perfil acotado como parte del aprendizaje; no presupongas que ambos tienen el mismo acceso. No se incorpora la rama `agents` a esta base.

## Autoridad del aprendizaje

- [Curso](https://learn.microsoft.com/en-us/training/courses/gh-600t00)
- [Guía y pesos](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600)
- `sources.md`: módulos, ejercicios y precisiones del producto.

Los dos ejercicios oficiales se realizan en los repositorios que indica Microsoft. Este sandbox los complementa; no modifica sus workflows ni afirma reemplazarlos.
