/**
 * Icon Upload Routes
 * POST /api/upload/icon - Upload SVG icon file
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as fs from "fs";
import * as path from "path";

export async function iconUploadRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // POST /api/upload/icon - Upload SVG icon file
  fastify.post(
    "/api/upload/icon",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await request.file();

        if (!data) {
          reply.code(400).send({ error: "No file uploaded" });
          return;
        }

        // Validar que sea SVG
        if (data.mimetype !== "image/svg+xml") {
          reply.code(400).send({
            error: "Invalid file type",
            message: "Only SVG files are allowed",
          });
          return;
        }

        // Usar el nombre original del archivo (sin path traversal)
        const originalFilename = data.filename.replace(/^.*[\\\/]/, "");

        // Validar que el nombre sea seguro
        if (!/^[a-z0-9_-]+\.svg$/i.test(originalFilename)) {
          reply.code(400).send({
            error: "Invalid filename",
            message:
              "Filename must contain only letters, numbers, underscores, hyphens and .svg extension",
          });
          return;
        }

        // Carpeta de iconos precargados en el frontend
        const iconsDir = path.join(
          __dirname,
          "../../../frontend/public/icons/waze/iconos_svg",
        );

        // Crear directorio si no existe
        if (!fs.existsSync(iconsDir)) {
          fs.mkdirSync(iconsDir, { recursive: true });
        }

        // Guardar archivo (reemplazará si ya existe)
        const filepath = path.join(iconsDir, originalFilename);
        const buffer = await data.toBuffer();
        fs.writeFileSync(filepath, buffer);

        // Retornar la ruta relativa que se usará en el frontend
        const publicUrl = `/icons/waze/iconos_svg/${originalFilename}`;

        fastify.log.info(
          { url: publicUrl, filename: originalFilename },
          "Icon uploaded/updated successfully",
        );

        reply.send({
          success: true,
          url: publicUrl,
          filename: originalFilename,
          message:
            "Icon uploaded successfully. It will be available after page reload.",
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const errorStack = error instanceof Error ? error.stack : undefined;

        fastify.log.error(
          {
            error: errorMessage,
            url: request.url,
            stack: errorStack,
          },
          "Error uploading icon",
        );
        reply.code(500).send({
          error: "Failed to upload icon",
          message: errorMessage,
        });
      }
    },
  );
}
