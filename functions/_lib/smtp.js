import { connect } from "cloudflare:sockets";

const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;

function encodeSubject(value) {
  const base64 = btoa(unescape(encodeURIComponent(value)));
  return `=?UTF-8?B?${base64}?=`;
}

class SmtpClient {
  constructor(socket, writer, reader) {
    this.socket = socket;
    this.writer = writer;
    this.reader = reader;
    this.buffer = "";
    this.decoder = new TextDecoder();
  }

  async readLine() {
    for (;;) {
      const idx = this.buffer.indexOf("\n");
      if (idx !== -1) {
        const line = this.buffer.slice(0, idx).replace(/\r$/, "");
        this.buffer = this.buffer.slice(idx + 1);
        return line;
      }
      const { value, done } = await this.reader.read();
      if (done) throw new Error("SMTP connection closed");
      this.buffer += this.decoder.decode(value, { stream: true });
    }
  }

  async expect(expectedCode, label) {
    const line = await this.readLine();
    if (line.startsWith(expectedCode + "-")) {
      return this.expect(expectedCode, label);
    }
    if (!line.startsWith(expectedCode + " ")) {
      throw new Error(`SMTP ${label} failed: ${line}`);
    }
    return line;
  }

  async command(cmd, expectedCode, label) {
    await this.writer.write(new TextEncoder().encode(cmd + "\r\n"));
    return this.expect(expectedCode, label);
  }
}

export async function sendMail({ user, pass, to, subject, text }) {
  const socket = connect(
    { hostname: SMTP_HOST, port: SMTP_PORT, secureTransport: "on" },
    { secureTransport: "on" }
  );
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const smtp = new SmtpClient(socket, writer, reader);

  await smtp.expect("220", "greeting");
  await smtp.command("EHLO property-care.pages.dev", "250", "EHLO");
  await smtp.command("AUTH LOGIN", "334", "auth");
  await smtp.command(btoa(user), "334", "username");
  await smtp.command(btoa(pass), "235", "password");
  await smtp.command(`MAIL FROM:<${user}>`, "250", "MAIL FROM");
  await smtp.command(`RCPT TO:<${to}>`, "250", "RCPT TO");
  await smtp.command("DATA", "354", "DATA");

  const data =
    `From: Property Care <${user}>\r\n` +
    `To: <${to}>\r\n` +
    `Subject: ${encodeSubject(subject)}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/plain; charset=UTF-8\r\n` +
    `Content-Transfer-Encoding: 8bit\r\n` +
    `\r\n` +
    text;

  await writer.write(new TextEncoder().encode(data.replace(/\r?\n/g, "\r\n").replace(/\r\n\./g, "\r\n..") + "\r\n.\r\n"));
  await smtp.expect("250", "data");
  await smtp.command("QUIT", "221", "quit");
  await writer.close();
}