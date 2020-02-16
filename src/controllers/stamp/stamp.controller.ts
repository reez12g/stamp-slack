import { Body, Controller, Post } from '@nestjs/common';
import { StampService } from '../../providers/stamp/stamp.service';
import { StampDTO } from '../../dto/stamp/stamp.dto';

@Controller('stamp')
export class StampController {
  constructor(private readonly stampService: StampService) {}

  @Post()
  async stampSlack(@Body() payload: StampDTO) {
    return this.stampService.makeEmojiBigger(payload);
  }
}
