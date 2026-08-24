import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { HolidayService } from "./holiday.service";

@UseGuards(AuthGuard("jwt"))
@Controller("holidays")
export class HolidayController {
  constructor(private readonly holidays: HolidayService) {}

  @Get()
  list(@Query("year", ParseIntPipe) year: number) {
    return this.holidays.list(year);
  }
}
