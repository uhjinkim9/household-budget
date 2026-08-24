import { Injectable, Logger } from "@nestjs/common";
import { HolidayService } from "./holiday.service";

@Injectable()
export class KoreanBusinessDayService {
  private readonly logger = new Logger(KoreanBusinessDayService.name);
  private readonly cache = new Map<number, Set<string>>();

  constructor(private readonly holidays: HolidayService) {}

  async nextBusinessDay(scheduledDate: string) {
    let date = scheduledDate;
    while (true) {
      const year = Number(date.slice(0, 4));
      const holidays = await this.holidayDates(year);
      const day = this.dayOfWeek(date);
      if (day !== 0 && day !== 6 && !holidays.has(date)) return date;
      date = this.addDays(date, 1);
    }
  }

  private async holidayDates(year: number) {
    const cached = this.cache.get(year);
    if (cached) return cached;
    let dates: Set<string>;
    try {
      dates = new Set(
        (await this.holidays.list(year)).map((holiday) => holiday.date),
      );
    } catch (error) {
      dates = new Set();
      this.logger.warn(
        `${year}년 공휴일 조회 실패, 주말 기준으로 계산합니다: ${
          error instanceof Error ? error.message : "unknown"
        }`,
      );
    }
    this.cache.set(year, dates);
    return dates;
  }

  private dayOfWeek(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }

  private addDays(value: string, amount: number) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + amount));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }
}
