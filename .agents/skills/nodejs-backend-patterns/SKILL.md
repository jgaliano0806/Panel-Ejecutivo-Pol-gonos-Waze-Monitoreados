---
name: nodejs-backend-patterns
description: Construye servicios backend de Node.js listos para producción con Express/Fastify, implementando patrones de middleware, manejo de errores, autenticación, integración de bases de datos y mejores prácticas de diseño de API. Úsalo al crear servidores Node.js, APIs REST, backends GraphQL o arquitecturas de microservicios.
---

# Patrones de Backend en Node.js

Guía completa para construir aplicaciones backend en Node.js escalables, mantenibles y listas para producción utilizando frameworks modernos, patrones arquitectónicos y mejores prácticas.

## Cuándo usar este Skill

- Construcción de APIs REST o servidores GraphQL
- Creación de microservicios con Node.js
- Implementación de autenticación y autorización
- Diseño de arquitecturas backend escalables
- Configuración de middleware y manejo de errores
- Integración de bases de datos (SQL y NoSQL)
- Construcción de aplicaciones en tiempo real con WebSockets
- Implementación de procesamiento de trabajos en segundo plano (background jobs)

## Frameworks Principales

### Express.js - Framework Minimalista

**Configuración Básica:**

```typescript
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";

const app = express();

// Middleware de seguridad
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") }));
app.use(compression());

// Parseo de cuerpo (body)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Registro de solicitudes (logging)
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Fastify - Framework de Alto Rendimiento

**Configuración Básica:**

```typescript
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import compress from "@fastify/compress";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  },
});

// Plugins
await fastify.register(helmet);
await fastify.register(cors, { origin: true });
await fastify.register(compress);

// Rutas con tipos seguros y validación de esquema
fastify.post<{
  Body: { name: string; email: string };
  Reply: { id: string; name: string };
}>(
  "/users",
  {
    schema: {
      body: {
        type: "object",
        required: ["name", "email"],
        properties: {
          name: { type: "string", minLength: 1 },
          email: { type: "string", format: "email" },
        },
      },
    },
  },
  async (request, reply) => {
    const { name, email } = request.body;
    return { id: "123", name };
  },
);

await fastify.listen({ port: 3000, host: "0.0.0.0" });
```

## Patrones Arquitectónicos

### Patrón 1: Arquitectura en Capas

**Estructura:**

```
src/
├── controllers/     # Manejo de solicitudes/respuestas HTTP
├── services/        # Lógica de negocio
├── repositories/    # Capa de acceso a datos
├── models/          # Modelos de datos
├── middleware/      # Middleware de Express/Fastify
├── routes/          # Definición de rutas
├── utils/           # Funciones de ayuda
├── config/          # Configuración
└── types/           # Tipos de TypeScript
```

**Capa de Controlador:**

```typescript
// controllers/user.controller.ts
import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";
import { CreateUserDTO, UpdateUserDTO } from "../types/user.types";

export class UserController {
  constructor(private userService: UserService) {}

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userData: CreateUserDTO = req.body;
      const user = await this.userService.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates: UpdateUserDTO = req.body;
      const user = await this.userService.updateUser(id, updates);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await this.userService.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
```

**Capa de Servicio:**

```typescript
// services/user.service.ts
import { UserRepository } from "../repositories/user.repository";
import { CreateUserDTO, UpdateUserDTO, User } from "../types/user.types";
import { NotFoundError, ValidationError } from "../utils/errors";
import bcrypt from "bcrypt";

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async createUser(userData: CreateUserDTO): Promise<User> {
    // Validación
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ValidationError("Email already exists");
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Crear usuario
    const user = await this.userRepository.create({
      ...userData,
      password: hashedPassword,
    });

    // Eliminar contraseña de la respuesta
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async updateUser(id: string, updates: UpdateUserDTO): Promise<User> {
    const user = await this.userRepository.update(id, updates);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async deleteUser(id: string): Promise<void> {
    const deleted = await this.userRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError("User not found");
    }
  }
}
```

**Capa de Repositorio:**

```typescript
// repositories/user.repository.ts
import { Pool } from "pg";
import { CreateUserDTO, UpdateUserDTO, UserEntity } from "../types/user.types";

export class UserRepository {
  constructor(private db: Pool) {}

  async create(
    userData: CreateUserDTO & { password: string },
  ): Promise<UserEntity> {
    const query = `
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, password, created_at, updated_at
    `;
    const { rows } = await this.db.query(query, [
      userData.name,
      userData.email,
      userData.password,
    ]);
    return rows[0];
  }

  async findById(id: string): Promise<UserEntity | null> {
    const query = "SELECT * FROM users WHERE id = $1";
    const { rows } = await this.db.query(query, [id]);
    return rows[0] || null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const query = "SELECT * FROM users WHERE email = $1";
    const { rows } = await this.db.query(query, [email]);
    return rows[0] || null;
  }

  async update(id: string, updates: UpdateUserDTO): Promise<UserEntity | null> {
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    const setClause = fields
      .map((field, idx) => `${field} = $${idx + 2}`)
      .join(", ");

    const query = `
      UPDATE users
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await this.db.query(query, [id, ...values]);
    return rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const query = "DELETE FROM users WHERE id = $1";
    const { rowCount } = await this.db.query(query, [id]);
    return rowCount > 0;
  }
}
```

### Patrón 2: Inyección de Dependencias (DI)

**Contenedor DI:**

```typescript
// di-container.ts
import { Pool } from "pg";
import { UserRepository } from "./repositories/user.repository";
import { UserService } from "./services/user.service";
import { UserController } from "./controllers/user.controller";
import { AuthService } from "./services/auth.service";

class Container {
  private instances = new Map<string, any>();

  register<T>(key: string, factory: () => T): void {
    this.instances.set(key, factory);
  }

  resolve<T>(key: string): T {
    const factory = this.instances.get(key);
    if (!factory) {
      throw new Error(`No factory registered for ${key}`);
    }
    return factory();
  }

  singleton<T>(key: string, factory: () => T): void {
    let instance: T;
    this.instances.set(key, () => {
      if (!instance) {
        instance = factory();
      }
      return instance;
    });
  }
}

export const container = new Container();

// Registro de dependencias
container.singleton(
  "db",
  () =>
    new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }),
);

container.singleton(
  "userRepository",
  () => new UserRepository(container.resolve("db")),
);

container.singleton(
  "userService",
  () => new UserService(container.resolve("userRepository")),
);

container.register(
  "userController",
  () => new UserController(container.resolve("userService")),
);

container.singleton(
  "authService",
  () => new AuthService(container.resolve("userRepository")),
);
```

## Patrones de Middleware

### Middleware de Autenticación

```typescript
// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../utils/errors";

interface JWTPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new UnauthorizedError("No token provided");
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    req.user = payload;
    next();
  } catch (error) {
    next(new UnauthorizedError("Invalid token"));
  }
};
```

### Middleware de Autorización

```typescript
// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../utils/errors";

interface JWTPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new UnauthorizedError("No token provided");
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    req.user = payload;
    next();
  } catch (error) {
    next(new UnauthorizedError("Invalid token"));
  }
};

export const authorize = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError("Not authenticated"));
    }

    // Verificar si el usuario tiene el rol requerido
    const hasRole = roles.some((role) => req.user?.roles?.includes(role));

    if (!hasRole) {
      return next(new UnauthorizedError("Insufficient permissions"));
    }

    next();
  };
};
```

### Middleware de Validación

```typescript
// middleware/validation.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { ValidationError } from "../utils/errors";

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        next(new ValidationError("Validation failed", errors));
      } else {
        next(error);
      }
    }
  };
};

// Uso con Zod
import { z } from "zod";

const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

router.post("/users", validate(createUserSchema), userController.createUser);
```

### Middleware de Limitación de Tasa (Rate Limiting)

```typescript
// middleware/rate-limit.middleware.ts
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || "6379"),
});

export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:",
  }),
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita cada IP a 100 solicitudes por windowMs
  message:
    "Demasiadas solicitudes de esta IP, por favor intente de nuevo más tarde",
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:auth:",
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // Límite más estricto para endpoints de autenticación
  skipSuccessfulRequests: true,
});
```

### Middleware de Registro de Solicitudes (Logging)

```typescript
// middleware/logger.middleware.ts
import { Request, Response, NextFunction } from "express";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  // Registrar respuesta al finalizar
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
  });

  next();
};

export { logger };
```

## Manejo de Errores

### Clases de Error Personalizadas

```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public errors?: any[],
  ) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
```

### Manejador de Errores Global

```typescript
// middleware/error-handler.ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { logger } from "./logger.middleware";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      ...(err instanceof ValidationError && { errors: err.errors }),
    });
  }

  // Registrar errores inesperados
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // No filtrar detalles de error en producción
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(500).json({
    status: "error",
    message,
  });
};

// Envoltorio para errores asíncronos
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

## Patrones de Bases de Datos

### PostgreSQL con Pool de Conexiones

```typescript
// config/database.ts
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

// Probar conexión
pool.on("connect", () => {
  console.log("Base de datos conectada");
});

pool.on("error", (err) => {
  console.error("Error inesperado de base de datos", err);
  process.exit(-1);
});

// Cierre elegante (graceful shutdown)
export const closeDatabase = async () => {
  await pool.end();
  console.log("Conexión a la base de datos cerrada");
};
```

### MongoDB con Mongoose

```typescript
// config/mongoose.ts
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("MongoDB conectado");
  } catch (error) {
    console.error("Error de conexión a MongoDB:", error);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB desconectado");
});

mongoose.connection.on("error", (err) => {
  console.error("Error de MongoDB:", err);
});

export { connectDB };

// Ejemplo de Modelo
import { Schema, model, Document } from "mongoose";

interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

// Índices
userSchema.index({ email: 1 });

export const User = model<IUser>("User", userSchema);
```

### Patrón de Transacción

```typescript
// services/order.service.ts
import { Pool } from "pg";

export class OrderService {
  constructor(private db: Pool) {}

  async createOrder(userId: string, items: any[]) {
    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      // Crear pedido
      const orderResult = await client.query(
        "INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING id",
        [userId, calculateTotal(items)],
      );
      const orderId = orderResult.rows[0].id;

      // Crear artículos del pedido
      for (const item of items) {
        await client.query(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
          [orderId, item.productId, item.quantity, item.price],
        );

        // Actualizar inventario
        await client.query(
          "UPDATE products SET stock = stock - $1 WHERE id = $2",
          [item.quantity, item.productId],
        );
      }

      await client.query("COMMIT");
      return orderId;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
```

## Autenticación y Autorización

### Autenticación JWT

```typescript
// services/auth.service.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { UserRepository } from "../repositories/user.repository";
import { UnauthorizedError } from "../utils/errors";

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = this.generateRefreshToken({
      userId: user.id,
    });

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET!,
      ) as { userId: string };

      const user = await this.userRepository.findById(payload.userId);

      if (!user) {
        throw new UnauthorizedError("User not found");
      }

      const token = this.generateToken({
        userId: user.id,
        email: user.email,
      });

      return { token };
    } catch (error) {
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  private generateToken(payload: any): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "15m",
    });
  }

  private generateRefreshToken(payload: any): string {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, {
      expiresIn: "7d",
    });
  }
}
```

## Estrategias de Caché

```typescript
// utils/cache.ts
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || "6379"),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// Decorador de Caché
export function Cacheable(ttl: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = new CacheService();
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;

      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      await cache.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}
```

## Formato de Respuesta de la API

```typescript
// utils/response.ts
import { Response } from "express";

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200,
  ) {
    return res.status(statusCode).json({
      status: "success",
      message,
      data,
    });
  }

  static error(res: Response, message: string, statusCode = 500, errors?: any) {
    return res.status(statusCode).json({
      status: "error",
      message,
      ...(errors && { errors }),
    });
  }

  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
  ) {
    return res.json({
      status: "success",
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }
}
```

## Mejores Prácticas

1.  **Usa TypeScript**: La seguridad de tipos evita errores en tiempo de ejecución.
2.  **Implementa un manejo de errores adecuado**: Usa clases de error personalizadas.
3.  **Valida la entrada**: Usa librerías como Zod o Joi.
4.  **Usa variables de entorno**: Nunca dejes secretos en el código.
5.  **Implementa registros (logging)**: Usa registros estructurados (Pino, Winston).
6.  **Añade limitación de tasa (rate limiting)**: Evita el abuso.
7.  **Usa HTTPS**: Siempre en producción.
8.  **Implementa CORS correctamente**: No uses `*` en producción.
9.  **Usa inyección de dependencias**: Facilita las pruebas y el mantenimiento.
10. **Escribe pruebas**: Pruebas unitarias, de integración y E2E.
11. **Maneja el cierre elegante (graceful shutdown)**: Limpia los recursos.
12. **Usa pool de conexiones**: Para bases de datos.
13. **Implementa verificaciones de salud (health checks)**: Para monitoreo.
14. **Usa compresión**: Reduce el tamaño de la respuesta.
15. **Monitorea el rendimiento**: Usa herramientas de APM.

## Patrones de Pruebas

Consulta el skill `javascript-testing-patterns` para obtener una guía completa de pruebas.

## Recursos

- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices
- **Guía de Express.js**: https://expressjs.com/en/guide/
- **Documentación de Fastify**: https://www.fastify.io/docs/
- **TypeScript Node Starter**: https://github.com/microsoft/TypeScript-Node-Starter
