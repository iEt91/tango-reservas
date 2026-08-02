# Runbook de staging seguro

## Regla principal

**Nunca aplicar primero en producción.**

Staging y producción deben ser dos proyectos Supabase diferentes, con project refs,
claves, usuarios, datos y backups separados.

## 1. Crear el proyecto

Crear un proyecto nuevo llamado claramente `tango-staging`.

No reutilizar el proyecto actual de producción o prototipo. Guardar su project ref y
la clave pública. La clave privilegiada solo se coloca en `.env.staging.local`.

## 2. Preparar variables

Copiar:

```text
.env.staging.example
```

como:

```text
.env.staging.local
```

Completar los valores. El archivo real está ignorado por Git.

## 3. Diagnóstico de conectividad

```text
npm run staging:preflight
```

El comando valida:

- entorno declarado como staging;
- project refs diferentes;
- coincidencia entre URL y staging;
- DNS;
- Auth;
- PostgREST;
- que la clave pública no sea privilegiada.

No imprime secretos.

## 4. Preflight SQL

Ejecutar en el SQL Editor de staging:

```text
supabase/preflight/20260802_001_staging_preflight.sql
```

En un proyecto nuevo, aplicar después:

```text
supabase/schema.sql
supabase/migrations/20260802_001_business_members_and_rls.sql
```

Antes de copiar SQL, verificar:

```text
npm run staging:verify-migrations
```

## 5. Postflight

Ejecutar:

```text
supabase/preflight/20260802_002_business_members_postflight.sql
```

Debe finalizar sin excepciones y devolver `PASS`.

## 6. Prueba real de aislamiento

La siguiente fase creará dos usuarios y dos negocios de prueba y ejecutará el plan
`docs/security/RLS-ISOLATION-TEST-PLAN.md` desde clientes autenticados reales.

## 7. Evidencia

Guardar:

- salida de preflight;
- resultado del postflight;
- fecha;
- project ref de staging;
- commit probado.

No guardar claves, tokens ni contraseñas en capturas, issues o commits.

## 8. Producción

No repetir en producción hasta que:

- Security Gate esté verde;
- la prueba real de aislamiento pase;
- se haya probado rollback;
- exista backup;
- no haya alertas altas o críticas;
- la migración esté congelada por hash.
