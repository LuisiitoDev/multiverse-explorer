# Especificación del ejercicio greenfield: Agent Run Ledger

Estado: PROPUESTA_DE_PRACTICA. No implica aprobación de un plan de implementación.

## Necesidad

Como estudiante de GH600 quiero consultar un registro local de sesiones de agentes para distinguir quién hizo qué, sobre qué versión y con qué resultado. Se usa información sintética de aprendizaje; no contiene secretos ni datos productivos.

## Resultados esperados

- R1: mostrar sesiones con identificador, rol, tarea, commit de código evaluado y estado.
- R2: permitir filtrar por rol y estado.
- R3: cada sesión permite consultar sus referencias de evidencia, bloqueos y siguiente acción.
- R4: representar estados sin datos y datos inválidos con mensajes explícitos.
- R5: una sesión sin evidencia o sin validaciones no se muestra como validada; distinguir NOT_RUN de PASS y FAIL.
- R6: el flujo de práctica conserva un vínculo entre requisito, plan, autorización, cambio y evidencia. Una autorización antigua no se aplica silenciosamente a otro plan.

## Límites

Solo lectura de datos sintéticos locales. Sin backend nuevo, autenticación nueva, IA externa, dependencia nueva, despliegue ni cambios a Favorites. La ubicación propuesta es `labs/gh600/app/`; el plan debe justificar integración y pruebas con el toolchain existente. No se prescribe aquí el diseño visual ni la implementación.

## Criterios de aceptación

- AC1: al cargar dos sesiones sintéticas se ven rol, estado, tarea y commit; R1.
- AC2: al filtrar un rol o estado solo se ven sus sesiones; R2.
- AC3: una sesión sin evidencias muestra esa ausencia y no afirma PASS; R3 y R5.
- AC4: un conjunto vacío muestra estado vacío y datos inválidos muestran un fallo comprensible; R4.
- AC5: el reporte final relaciona cada criterio con una prueba ejecutada o una limitación explícita; R5 y R6.

Antes de implementar: revisar esta especificación, resolver ambigüedades y aprobar el plan concreto. Los ejercicios de memoria, conflictos y gobernanza aplican después sobre este mismo cambio.
