import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './modules/app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.enableCors();
    app.setBaseViewsDir(join(__dirname, '..', 'src/views'));
    app.setViewEngine('hbs');
    
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`Application started successfully on port ${port}`);
  } catch (error: any) {
    logger.error(`Error starting application: ${error.message}`, error.stack);
    process.exit(1);
  }
}
bootstrap();
