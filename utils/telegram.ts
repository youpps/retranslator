import { Api, Logger, TelegramClient } from "telegram";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { StringSession } from "telegram/sessions";
import { Telegram as TelegramBot } from "telegraf";
import { LogLevel } from "telegram/extensions/Logger";
import os from "os";
import fs from "fs/promises";
import input from "./input";
import Session from "./session";
import { EntityLike } from "telegram/define";
import { log } from "console";
import { MessageEntity } from "telegraf/typings/core/types/typegram";

interface ITelegram {
  apiId: number;
  apiHash: string;
  telegramPhone: string;
  telegramPassword: string;
  botToken: string;
  session: string;
}

class Telegram {
  private telegramPhone: string;
  private telegramPassword: string;
  public client: TelegramClient;
  private bot: TelegramBot;

  constructor(props: ITelegram) {
    this.telegramPhone = props.telegramPhone;
    this.telegramPassword = props.telegramPassword;

    const session = new StringSession(props.session ?? "");

    this.client = new TelegramClient(session, props.apiId, props.apiHash, {
      connectionRetries: 50,
      baseLogger: new Logger(LogLevel.NONE),
      deviceModel: `bot@${os.hostname()}`,
      systemVersion: os.version() || "Unknown node",
      appVersion: "1.0.0",
    });

    this.bot = new TelegramBot(props.botToken);
  }

  static async createInstance(props: Omit<ITelegram, "session">) {
    const session = await Session.getSession();

    const client = new Telegram({
      ...props,
      session,
    });

    return client;
  }

  async start() {
    await this.client.start({
      phoneNumber: this.telegramPhone,
      password: async () => this.telegramPassword,
      phoneCode: async () => await input("Введите код который пришел вам в Telegram"),
      onError: (err) => console.log(err),
    });

    await Session.setSession(this.client.session as StringSession);
  }

  async getUsername(entity: EntityLike) {
    const entityObj = (await this.client.getEntity(entity)) as any;
    return entityObj?.username ? "@" + entityObj?.username : (null as string | null);
  }

  async downloadMedia(media: Api.Message | Api.TypeMessageMedia) {
    const file = await this.client.downloadMedia(media);
    return file;
  }

  async getMe() {
    const me = await this.client.getMe();
    return me;
  }

  onMessage(callback: (e: NewMessageEvent) => any) {
    this.client.addEventHandler(callback, new NewMessage({ incoming: true, outgoing: false }));
  }

  async sendPhotoMediaGroup(chat: number | string, files: { file: Buffer; caption: string; entities: MessageEntity[] | undefined }[]) {
    await this.bot.sendMediaGroup(
      chat,
      files.map(({ file, caption, entities }) => ({
        type: "photo",
        caption,
        caption_entities: entities,
        media: {
          source: file,
        },
      }))
    );
  }

  async sendVideoMediaGroup(chat: number | string, files: { file: Buffer; caption: string; entities: MessageEntity[] | undefined }[]) {
    await this.bot.sendMediaGroup(
      chat,
      files.map(({ file, caption, entities }) => ({
        type: "video",
        caption,
        caption_entities: entities,
        media: {
          source: file,
        },
      }))
    );
  }

  async sendDocumentMediaGroup(chat: number | string, files: { file: Buffer; filename: string; caption: string; entities: MessageEntity[] | undefined }[]) {
    await this.bot.sendMediaGroup(
      chat,
      files.map(({ file, caption, entities, filename }) => ({
        type: "document",
        caption,
        caption_entities: entities,
        media: {
          filename,
          source: file,
        },
      }))
    );
  }

  async sendPhoto(chat: number | string, photo: Buffer, caption: string, entities?: MessageEntity[]) {
    await this.bot.sendPhoto(
      chat,
      {
        source: photo,
      },
      {
        caption,
        caption_entities: entities,
      }
    );
  }

  async sendVideo(chat: number | string, video: Buffer, caption: string, entities?: MessageEntity[]) {
    await this.bot.sendVideo(
      chat,
      {
        source: video,
      },
      {
        caption,
        caption_entities: entities,
      }
    );
  }

  async sendDocument(chat: number | string, document: Buffer, filename: string, caption: string, entities?: MessageEntity[]) {
    await this.bot.sendDocument(
      chat,
      {
        source: document,
        filename,
      },
      {
        caption,
        caption_entities: entities,
      }
    );
  }

  async sendMessage(chat: number | string, message: string, entities?: MessageEntity[]) {
    await this.bot.sendMessage(chat, message, { entities });
  }

  async getChats() {
    const res = await this.client.getDialogs();
    return res;
  }
}

export default Telegram;
