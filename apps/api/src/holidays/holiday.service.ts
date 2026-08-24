import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { ApiKeyService } from "../api-keys/api-key.service";

export interface HolidayResult {
  date: string;
  name: string;
}

type PortalItem = {
  locdate?: number | string;
  dateName?: string;
  isHoliday?: string;
};

@Injectable()
export class HolidayService {
  private readonly cache = new Map<
    number,
    { expiresAt: number; value: HolidayResult[] }
  >();

  constructor(private readonly apiKeys: ApiKeyService) {}

  async list(year: number): Promise<HolidayResult[]> {
    if (!Number.isInteger(year) || year < 1900 || year > 2100)
      throw new BadRequestException("연도는 1900~2100 사이여야 합니다.");

    const cached = this.cache.get(year);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const key = await this.apiKeys.getValue("public_holiday");
    const url =
      "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo" +
      `?serviceKey=${this.encodeServiceKey(key)}&solYear=${year}&numOfRows=100&_type=json`;

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new BadGatewayException(
        "공휴일 정보 제공기관에 연결하지 못했습니다.",
      );
    }
    if (!response.ok)
      throw new BadGatewayException(
        `공휴일 정보 조회에 실패했습니다. (${response.status})`,
      );

    let payload: any;
    try {
      payload = await response.json();
    } catch {
      throw new BadGatewayException("공휴일 정보 응답 형식이 올바르지 않습니다.");
    }

    const header = payload?.response?.header;
    if (header && !["00", "0000"].includes(String(header.resultCode)))
      throw new BadGatewayException(
        header.resultMsg || "공휴일 정보 조회에 실패했습니다.",
      );

    const raw = payload?.response?.body?.items?.item;
    const items: PortalItem[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const value = items
      .filter((item) => item.isHoliday !== "N" && item.locdate && item.dateName)
      .map((item) => ({
        date: this.toDate(item.locdate!),
        name: String(item.dateName),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    this.cache.set(year, {
      expiresAt: Date.now() + 24 * 60 * 60 * 1_000,
      value,
    });
    return value;
  }

  private encodeServiceKey(key: string) {
    const trimmed = key.trim();
    try {
      return encodeURIComponent(decodeURIComponent(trimmed));
    } catch {
      return encodeURIComponent(trimmed);
    }
  }

  private toDate(value: string | number) {
    const digits = String(value);
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
}
