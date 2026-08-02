# Historial remoto de staging

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
- cero alertas críticas o altas del Security Advisor.

Los avisos informativos `rls_enabled_no_policy` sobre tablas operativas son
intencionales: esas tablas permanecen bloqueadas hasta que cada módulo tenga
políticas y pruebas negativas específicas.
