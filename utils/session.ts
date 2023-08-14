import fs from "fs/promises";
import path from "path";
import { StringSession } from "telegram/sessions";

class Session {
  static async getSession() {
    const sessionString = await fs.readFile(path.resolve(__dirname, "../session/session.sess"), { encoding: "utf-8" });
    return sessionString;
  }

  static async setSession(session: StringSession) {
    const sessionString = session.save();

    await fs.writeFile(path.resolve(__dirname, "../session/session.sess"), sessionString, { encoding: "utf-8" });
  }
}

export default Session;
