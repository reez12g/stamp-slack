import { Logger } from '@nestjs/common';

const loggerMethods = ['log', 'error', 'warn', 'debug', 'verbose'] as const;

beforeAll(() => {
  for (const method of loggerMethods) {
    jest.spyOn(Logger.prototype, method).mockImplementation(() => undefined);
  }
});

afterAll(() => {
  jest.restoreAllMocks();
});
