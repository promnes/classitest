import { OTPProvider } from "./OTPProvider";
import { sendMail } from "../../mailer";

export class EmailOTPProvider implements OTPProvider {
  async send(destination: string, code: string): Promise<void> {
    const subject = "Classify - OTP Code";
    const html = `<p>Your verification code is: <strong>${code}</strong></p>`;
    await sendMail({ to: destination, subject, html });
  }
}
