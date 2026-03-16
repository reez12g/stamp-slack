import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { isValidSlackSignature } from '../security/slack-request-signature';

type SlackRequest = Request & {
  rawBody?: Buffer;
};

@Injectable()
export class SlackRequestSignatureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<SlackRequest>();
    const signingSecret = process.env.SLACK_SIGNING_SECRET?.trim();

    if (!signingSecret) {
      throw new InternalServerErrorException('Slack signing secret is not configured');
    }

    const timestamp = request.header('x-slack-request-timestamp') ?? '';
    const signature = request.header('x-slack-signature') ?? '';
    const rawBody = request.rawBody;

    if (!rawBody || !timestamp || !signature) {
      throw new UnauthorizedException('Slack request signature is missing or invalid');
    }

    const isValid = isValidSlackSignature({
      secret: signingSecret,
      timestamp,
      signature,
      body: rawBody,
    });

    if (!isValid) {
      throw new UnauthorizedException('Slack request signature is missing or invalid');
    }

    return true;
  }
}
