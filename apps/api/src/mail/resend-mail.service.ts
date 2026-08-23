import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { VerificationMail } from './mail-dispatcher';

@Injectable()
export class ResendMailService {
  constructor(private readonly config: ConfigService) {}

  async sendVerification({ to, code, expiresInMinutes }: VerificationMail) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'RESEND_API_KEY가 설정되지 않아 인증 메일을 발송할 수 없습니다.',
      );
    }

    // 키가 없는 개발 환경에서도 애플리케이션은 기동될 수 있도록 발송 시점에 생성합니다.
    const client = new Resend(apiKey);
    const { error } = await client.emails.send({
      from: this.config.get<string>(
        'MAIL_FROM',
        'Mercury Lab <onboarding@resend.dev>',
      ),
      to,
      subject: '[Mercury Lab] 이메일 인증번호를 확인해주세요',
      text: `인증번호는 ${code}입니다. ${expiresInMinutes}분 안에 입력해주세요.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px"><h2>이메일 인증</h2><p>아래 인증번호를 ${expiresInMinutes}분 안에 입력해주세요.</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:20px;background:#f2f6f3;text-align:center;border-radius:12px">${code}</div><p style="color:#68736c;font-size:13px;margin-top:24px">본인이 요청하지 않았다면 이 메일을 무시해주세요.</p></div>`,
    });

    if (error) {
      throw new ServiceUnavailableException('인증 메일 발송에 실패했습니다.');
    }
  }
}
