export interface IStorageProvider {
    /**
     * Sube un archivo al almacenamiento
     * @param fileName Nombre del archivo o ruta destino
     * @param content Buffer o stream del archivo
     * @returns URL o ruta relativa pública del archivo
     */
    uploadFile(fileName: string, content: Buffer | NodeJS.ReadableStream): Promise<string>;

    /**
     * Elimina un archivo del almacenamiento
     * @param filePath Ruta relativa o URL del archivo
     */
    deleteFile(filePath: string): Promise<void>;

    /**
     * Obtiene una URL firmada o directa para el archivo
     */
    getPublicUrl(filePath: string): string;
}
