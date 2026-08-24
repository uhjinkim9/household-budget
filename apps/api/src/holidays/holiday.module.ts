import { Module } from "@nestjs/common";
import { ApiKeyModule } from "../api-keys/api-key.module";
import { HolidayController } from "./holiday.controller";
import { HolidayService } from "./holiday.service";

@Module({
  imports: [ApiKeyModule],
  controllers: [HolidayController],
  providers: [HolidayService],
})
export class HolidayModule {}
