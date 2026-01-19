// POST /api/upload/icon - Upload SVG icon file
server.post("/api/upload/icon", async (request, reply) => {
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

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const filename = `icon-${timestamp}-${randomStr}.svg`;

    // Crear directorio si no existe
    const iconsDir = path.join(__dirname, "../public/icons");
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    // Guardar archivo
    const filepath = path.join(iconsDir, filename);
    const buffer = await data.toBuffer();
    fs.writeFileSync(filepath, buffer);

    // Retornar URL pública del archivo
    const publicUrl = `/public/icons/${filename}`;

    console.log(`✅ Icon uploaded successfully: ${publicUrl}`);

    reply.send({
      success: true,
      url: publicUrl,
      filename: filename,
    });
  } catch (error: any) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error uploading icon"
    );
    reply.code(500).send({
      error: "Failed to upload icon",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
