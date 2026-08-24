import { Module } from "@nestjs/common";
import { ApiKeyModule } from "../api-keys/api-key.module";
import { HolidayController } from "./holiday.controller";
import { HolidayService } from "./holiday.service";
import { KoreanBusinessDayService } from "./korean-business-day.service";

@Module({
  imports: [ApiKeyModule],
  controllers: [HolidayController],
  providers: [HolidayService, KoreanBusinessDayService],
  exports: [HolidayService, KoreanBusinessDayService],
})
export class HolidayModule {}
