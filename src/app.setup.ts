import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { join } from 'path';

type RawBodyRequest = IncomingMessage & {
  rawBody?: Buffer;
};

function captureRawBody(
  request: RawBodyRequest,
  _response: ServerResponse,
  buffer: Buffer,
  encoding: string,
): void {
  void encoding;
  request.rawBody = Buffer.from(buffer);
}

export function applyAppConfiguration(app: NestExpressApplication): void {
  app.use(json({ verify: captureRawBody }));
  app.use(urlencoded({ extended: true, verify: captureRawBody }));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors();
  app.setBaseViewsDir(join(__dirname, '..', 'src/views'));
  app.setViewEngine('hbs');
}
