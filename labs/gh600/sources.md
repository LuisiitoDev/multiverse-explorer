# Fuentes del laboratorio

## Fuentes y precedencia

1. **Alcance del examen y pesos:** [guía de estudio oficial GH-600](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600), verificada el 25 de octubre de 2026; última actualización indicada: 13 de mayo de 2026.
2. **Orden y enseñanza:** [curso GH-600T00 de Microsoft Learn](https://learn.microsoft.com/en-us/training/courses/gh-600t00).
3. **Detalle del producto:** [GitHub: perfiles de agentes](https://docs.github.com/en/copilot/reference/custom-agents-configuration) y [VS Code: referencia del archivo](https://code.visualstudio.com/docs/agents/reference/custom-agent-file-reference). Verificados el 25 de octubre de 2026.
4. **Apuntes por clase:** `GH600_curso_completo_por_clase.md`, síntesis propia del curso consultado el 23 de octubre. Está incorporada en la fuente maestra de NotebookLM guardada junto a los recursos del curso en Google Drive.
5. Las imágenes, el deck y los ejemplos personales son apoyos. Si contradicen el alcance oficial o una especificación vigente del producto, se corrigen; no se convierten en autoridad técnica.

Rutas oficiales:

- [Parte 1](https://learn.microsoft.com/en-us/training/paths/gh-developing-agentic-systems-1/)
- [Parte 2](https://learn.microsoft.com/en-us/training/paths/github-agentic-systems-part-two/github-agentic-systems-part-two/)

La guía determina QUÉ se evalúa. El curso determina la secuencia de aprendizaje. La documentación del runtime determina QUÉ configuración funciona. El repositorio aporta evidencia de práctica.

## Dominios y pesos oficiales

| Dominio | Capacidad evaluada, resumida en español | Peso oficial | Módulos principales del curso |
|---|---|---|---|
| D1 | Preparar arquitectura de agentes y procesos del SDLC | 15–20% | 1 y 2 |
| D2 | Implementar herramientas e interacción con el entorno | 20–25% | 2 y 3 |
| D3 | Gestionar memoria, estado y ejecución | 10–15% | 5 |
| D4 | Evaluar, analizar errores y ajustar comportamiento | 15–20% | 5 y 6 |
| D5 | Orquestar la coordinación multiagente | 15–20% | 4 |
| D6 | Implementar guardrails y responsabilidad | 10–15% | 1, 2 y 6 |

El cruce entre módulos y dominios es una propuesta de estudio, no una tabla oficial de ponderación por clase. Los porcentajes son rangos por dominio; no equivalen a horas de estudio ni permiten calcular un número exacto de preguntas. Microsoft no publica un peso específico para cada encabezado de `.agent.md`. Los temas se cruzan: seguridad, trazabilidad y evaluación se aplican durante todo el recorrido.

- Módulo 1: https://learn.microsoft.com/en-us/training/modules/foundations-agentic-ai/
- Módulo 2: https://learn.microsoft.com/en-us/training/modules/design-agent-architecture-integration/
- Módulo 3: https://learn.microsoft.com/en-us/training/modules/agent-tooling-mcp-execution-environments/
- Módulo 4: https://learn.microsoft.com/en-us/training/modules/multi-agent-systems-orchestration/
- Módulo 5: https://learn.microsoft.com/en-us/training/modules/memory-state-evaluation/
- Módulo 6: https://learn.microsoft.com/en-us/training/modules/governance-guardrails-operations/

## Ejercicios oficiales

- Clase 3.6: https://learn.microsoft.com/en-us/training/modules/agent-tooling-mcp-execution-environments/exercise
- Repositorio: https://github.com/skills/agentic-workflows-that-read-the-room
- Clase 4.8: https://learn.microsoft.com/en-us/training/modules/multi-agent-systems-orchestration/exercise
- Repositorio: https://github.com/skills/agent-orchestration-build-your-ai-dream-team

Las versiones, comandos, modelos y herramientas se toman de la documentación vigente al ejecutar. VS Code no cubre por sí solo la práctica de Copilot CLI del módulo 4. No se instala ni configura nada automáticamente como parte de este scaffold.
