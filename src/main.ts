import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './modules/app.module';
import { Logger } from '@nestjs/common';
import { applyAppConfiguration } from './app.setup';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      bodyParser: false,
    });
    applyAppConfiguration(app);

    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`Application started successfully on port ${port}`);
  } catch (error: any) {
    logger.error(`Error starting application: ${error.message}`, error.stack);
    process.exit(1);
  }
}
bootstrap();
