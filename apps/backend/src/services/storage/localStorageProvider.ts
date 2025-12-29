import fs from 'fs';
import path from 'path';
import { IStorageProvider } from './storageProvider';

export class LocalStorageProvider implements IStorageProvider {
    private uploadDir: string;

    constructor() {
        // El root es el directorio 'backend'
        this.uploadDir = path.join(__dirname, '../../../public/uploads');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async uploadFile(fileName: string, content: Buffer | NodeJS.ReadableStream): Promise<string> {
        const filePath = path.join(this.uploadDir, fileName);

        if (Buffer.isBuffer(content)) {
            fs.writeFileSync(filePath, content);
        } else {
            const writeStream = fs.createWriteStream(filePath);
            await new Promise((resolve, reject) => {
                content.pipe(writeStream);
                content.on('end', resolve);
                content.on('error', reject);
            });
        }

        return `/public/uploads/${fileName}`;
    }

    async deleteFile(filePath: string): Promise<void> {
        // filePath viene como /public/uploads/file.ext
        const fileName = path.basename(filePath);
        const fullPath = path.join(this.uploadDir, fileName);

        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }

    getPublicUrl(filePath: string): string {
        // En local, la URL es simplemente el path relativo servido por fastify-static
        return filePath;
    }
}
