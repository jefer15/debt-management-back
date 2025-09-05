# Debt Management Backend

Este es el backend del sistema de **Gestión de Deudas**, desarrollado con **NestJS**, **PostgreSQL**, **Redis** y autenticación con **JWT**.  

## Tecnologías principales
- **NestJS v11**
- **TypeORM v0.3**
- **PostgreSQL v15**
- **Redis v7**
- **JWT para autenticación**
- **Docker Compose para orquestación de servicios**

---

## Estructura del proyecto
```
src/
 ├── auth/          # Módulo de autenticación (login, registro, JWT, guard)
 │   ├── dto/
 │   └── guard/
 │
 ├── debt/          # Módulo de deudas (CRUD, exportación, resumen)
 │   ├── dto/
 │   └── entities/
 │
 ├── user/          # Módulo de usuarios
 │   ├── dto/
 │   └── entities/
 │
 ├── app.module.ts  # Configuración principal (DB, Redis, módulos)
 └── main.ts
```

---

## ⚙️ Configuración del entorno

En la raíz del proyecto hay un archivo **`.env copy`** de ejemplo para variables de entorno.  

---

## Levantar base de datos y Redis con Docker

Ejecuta:
```bash
docker-compose up -d
```

Esto levantará:
- **Postgres** en `localhost:5432`
- **Redis** en `localhost:6379`

Para verificar:
```bash
docker ps
```

---

Instalar dependencias:
```bash
npm install
```

Ejecutar en modo desarrollo:
```bash
npm run start:dev
```

Compilar y ejecutar en producción:
```bash
npm run build
npm run start:prod
```
---

## Endpoints principales

### Autenticación
- **POST** `/auth/register` → Registro de usuario  
- **POST** `/auth` → Login (devuelve JWT)

### Deudas
- **POST** `/debt` → Crear deuda  
- **GET** `/debt` → Listar deudas (`?status=all|completed|pending`)  
- **GET** `/debt/summary` → Resumen de deudas  
- **GET** `/debt/:id` → Obtener una deuda por ID  
- **PUT** `/debt/:id` → Actualizar deuda  
- **PATCH** `/debt/:id/pay` → Marcar deuda como pagada  
- **DELETE** `/debt/:id` → Eliminar deuda  
- **GET** `/debt/export/:format` → Exportar deudas (`json` o `csv`)

---

## Tests
Ejecutar los tests unitarios:
```bash
npm run test
```

Ejecutar con cobertura:
```bash
npm run test:cov
```

---

## Decisiones técnicas

- **TypeORM + PostgreSQL**: flexibilidad para mapear entidades y relaciones en una base de datos relacional confiable.

- **JWT con Passport**: autenticación segura y escalable.

- **bcryptjs**: contraseñas encriptadas antes de ser almacenadas.

- **Redis como caché**: mejora de rendimiento en consultas frecuentes (ej. listados de deudas).

- **Arquitectura modular**: separación clara entre auth, debt y user.

- **DTOs y validaciones**: garantizan integridad de datos y evitan inconsistencias.

- **Exportación CSV/JSON**: funcionalidad adicional para integraciones o reportes.
