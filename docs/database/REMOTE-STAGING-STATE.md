# Historial remoto de staging

> Esta página registra una verificación histórica. No constituye evidencia de
> seguridad o release actual: antes de cada corte se deben ejecutar preflight,
> pruebas de aislamiento y Advisors contra el proyecto activo.

## Proyecto

- Nombre: `tango-resto`
- Project ref: `yzkeugxygfdgzhlwdeek`
- Región: São Paulo
- Uso: staging

## Migraciones aplicadas

1. `initial_schema_lockdown`
2. `business_members_and_rls`

## Verificación remota

- 11 tablas con RLS;
- 11 tablas con FORCE RLS;
- anon sin SELECT;
- authenticated sin escrituras;
- solo business_members concede SELECT autenticado;
- helper SECURITY DEFINER únicamente en private;
- search_path vacío;
- sin alertas críticas o altas en la captura original del Security Advisor.

Los avisos informativos `rls_enabled_no_policy` sobre tablas operativas son
intencionales: esas tablas permanecen bloqueadas hasta que cada módulo tenga
políticas y pruebas negativas específicas. Los avisos nuevos deben compararse con
la evidencia actual, no con esta captura.
