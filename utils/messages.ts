import fs from "fs/promises";
import path from "path";
import md5 from "md5";

class Messages {
  private static async getAll(): Promise<string[]> {
    const messagesFile = await fs.readFile(path.resolve(__dirname, "../configs/messages.json"));
    const messages = JSON.parse(messagesFile.toString("utf8"));
    return messages;
  }

  static async exists(message: string) {
    const hashMessage = md5(message);

    const messages = await Messages.getAll();

    const isExisting = messages.some((item) => item === hashMessage);
    if (!isExisting) {
      messages.push(hashMessage);

      await fs.writeFile(path.resolve(__dirname, "../configs/messages.json"), JSON.stringify(messages));
    }

    return isExisting;
  }
}

export default Messages;
