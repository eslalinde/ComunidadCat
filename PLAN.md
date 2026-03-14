# Plan de Seguridad + Programa de Penetration Testing

## Parte 1: Plan de Seguridad para VibeCaminoManager

### Hallazgos del análisis actual

El proyecto ya tiene buenas bases de seguridad:
- RLS en todas las tablas de Supabase
- RBAC con 6 roles bien definidos
- Audit logging automático
- CodeQL y Dependabot habilitados
- JWT con expiración de 1 hora + refresh rotation

### Mejoras recomendadas al proyecto actual

1. **Headers de seguridad** - Agregar CSP estricto, HSTS, X-Frame-Options en `next.config.ts`
2. **Rate limiting** - Implementar rate limiting en el cliente para prevenir abuso de la API de Supabase
3. **Validación server-side** - Agregar Edge Functions de Supabase para validación crítica (actualmente solo Zod client-side)
4. **MFA** - Habilitar autenticación multifactor en Supabase Auth
5. **Session management** - Considerar cookies httpOnly en vez de localStorage para tokens
6. **Electron hardening** - Deshabilitar `nodeIntegration`, habilitar `contextIsolation`, restringir `webPreferences`

---

## Parte 2: Nuevo Programa de Penetration Testing (Python)

### Estructura del proyecto: `vibe-pentest/`

```
vibe-pentest/
├── pyproject.toml              # Dependencias y config del proyecto
├── README.md                   # Documentación y uso
├── config/
│   ├── targets.yaml            # URLs, credenciales de test, alcance
│   └── owasp_checks.yaml      # Definición de checks OWASP
├── src/
│   ├── __init__.py
│   ├── cli.py                  # CLI principal (click/typer)
│   ├── runner.py               # Orquestador de pruebas
│   ├── reporter.py             # Generación de reportes (HTML/JSON)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── http_client.py      # Cliente HTTP con manejo de sesión/JWT
│   │   ├── supabase_client.py  # Cliente Supabase para pruebas directas
│   │   └── scanner_base.py     # Clase base para todos los scanners
│   ├── scanners/
│   │   ├── __init__.py
│   │   ├── a01_broken_access.py    # OWASP A01 - Broken Access Control
│   │   ├── a02_crypto_failures.py  # OWASP A02 - Cryptographic Failures
│   │   ├── a03_injection.py        # OWASP A03 - Injection (SQL, XSS)
│   │   ├── a04_insecure_design.py  # OWASP A04 - Insecure Design
│   │   ├── a05_security_misconfig.py # OWASP A05 - Security Misconfiguration
│   │   ├── a06_vulnerable_components.py # OWASP A06 - Vulnerable Components
│   │   ├── a07_auth_failures.py    # OWASP A07 - Auth & Identity Failures
│   │   ├── a08_integrity_failures.py # OWASP A08 - Software Integrity
│   │   ├── a09_logging_monitoring.py # OWASP A09 - Logging & Monitoring
│   │   └── a10_ssrf.py             # OWASP A10 - SSRF
│   ├── supabase/
│   │   ├── __init__.py
│   │   ├── rls_bypass.py       # Pruebas de bypass de Row Level Security
│   │   ├── jwt_manipulation.py # Manipulación de JWT tokens
│   │   ├── privilege_escalation.py # Escalación de roles
│   │   └── postgrest_abuse.py  # Abuso de PostgREST API
│   └── electron/
│       ├── __init__.py
│       ├── preload_check.py    # Verificar aislamiento de contexto
│       ├── protocol_handler.py # Pruebas de deep links / custom protocols
│       └── node_exposure.py    # Detección de APIs de Node expuestas
├── reports/                    # Directorio de reportes generados
├── tests/                      # Tests del propio pentest tool
│   ├── test_scanners.py
│   └── test_reporter.py
└── wordlists/
    ├── common_paths.txt        # Paths comunes para enumerar
    └── payloads/
        ├── sqli.txt            # Payloads de SQL injection
        └── xss.txt             # Payloads de XSS
```

### Dependencias principales

```
httpx          # Cliente HTTP async
typer          # CLI framework
pyyaml         # Configuración
rich           # Output formateado en terminal
jinja2         # Templates para reportes HTML
pyjwt          # Manipulación de JWT
supabase-py    # Cliente Supabase oficial
beautifulsoup4 # Parsing HTML
selenium       # Testing de Electron app
```

### Módulos detallados

#### 1. `a01_broken_access.py` - Broken Access Control
- **IDOR testing**: Acceder a recursos de otros usuarios cambiando IDs en requests
- **RLS bypass**: Intentar queries directas a PostgREST saltando filtros
- **Horizontal privilege escalation**: Usuario con rol `viewer` intenta operaciones de `admin`
- **Vertical privilege escalation**: `community_responsible` intenta acceder a otra comunidad
- **Forced browsing**: Acceso a rutas protegidas sin autenticación

#### 2. `a02_crypto_failures.py` - Cryptographic Failures
- Verificar HTTPS enforcement
- Analizar headers de seguridad (HSTS, etc.)
- Detectar datos sensibles en localStorage/cookies sin cifrar
- Verificar que tokens no se transmitan en URLs

#### 3. `a03_injection.py` - Injection
- **SQL Injection**: Payloads en filtros de PostgREST (`.eq()`, `.like()`, `.or()`)
- **XSS**: Inyección en campos de formulario (nombres, descripciones)
- **NoSQL/PostgREST injection**: Manipulación de query parameters

#### 4. `a04_insecure_design.py` - Insecure Design
- Verificar que no hay mass assignment en updates
- Probar business logic flaws (ej: asignar un hermano a comunidad sin permisos)
- Rate limiting en signup/login

#### 5. `a05_security_misconfig.py` - Security Misconfiguration
- Headers HTTP faltantes (CSP, X-Frame-Options, etc.)
- Supabase dashboard expuesto públicamente
- Debug mode habilitado en producción
- CORS misconfiguration
- Archivos sensibles expuestos (.env, .git, sourcemaps)

#### 6. `a06_vulnerable_components.py` - Vulnerable Components
- Escaneo de dependencias con `pip-audit` / `npm audit`
- Verificar versiones de Supabase, Next.js, Electron
- Detectar CVEs conocidos

#### 7. `a07_auth_failures.py` - Authentication Failures
- Brute force en login
- Enumeración de usuarios (respuestas diferentes para usuario válido/inválido)
- JWT manipulation (cambiar role claim, expiración)
- Token reuse después de logout
- Password policy enforcement

#### 8. `a08_integrity_failures.py` - Software Integrity
- Verificar integridad de dependencias (lock files)
- CI/CD pipeline security (GitHub Actions)
- Verificar que builds de Electron están firmados

#### 9. `a09_logging_monitoring.py` - Logging & Monitoring
- Verificar que acciones críticas generan audit logs
- Intentar borrar/modificar audit logs
- Verificar que errores de auth se registran

#### 10. `a10_ssrf.py` - SSRF
- Inyección de URLs en campos que podrían hacer requests server-side
- Probar redirect abuse en auth callbacks

### CLI de uso

```bash
# Ejecutar todas las pruebas contra entorno local
python -m vibe_pentest scan --target local --all

# Solo pruebas de acceso
python -m vibe_pentest scan --target local --module a01

# Solo pruebas de Supabase RLS
python -m vibe_pentest scan --target local --module supabase

# Generar reporte HTML
python -m vibe_pentest report --format html --output reports/

# Modo específico para Electron
python -m vibe_pentest scan --target electron --module electron
```

### Formato de reporte

Cada hallazgo se clasifica con:
- **Severidad**: Critical / High / Medium / Low / Info
- **OWASP Category**: A01-A10
- **CVSS Score estimado**
- **Descripción** del hallazgo
- **Evidencia** (request/response capturado)
- **Remediación** recomendada
- **Estado**: Vulnerable / Seguro / No aplica

---

## Plan de implementación (orden de archivos a crear)

1. `pyproject.toml` + estructura de directorios
2. `config/targets.yaml` con configuración de targets
3. `src/core/` - HTTP client, scanner base, supabase client
4. `src/cli.py` + `src/runner.py` - CLI y orquestador
5. `src/scanners/a01_broken_access.py` - Primer scanner (acceso)
6. `src/scanners/a07_auth_failures.py` - Auth scanner
7. `src/supabase/rls_bypass.py` + `jwt_manipulation.py` - Tests Supabase
8. Resto de scanners OWASP (a02-a06, a08-a10)
9. `src/electron/` - Tests de Electron
10. `src/reporter.py` - Generación de reportes
11. `tests/` - Tests del tool
12. `wordlists/` - Payloads
