import { MessageEntity } from "telegraf/typings/core/types/typegram";
import Telegram from "../utils/telegram";
import Channels from "../utils/channels";
import Messages from "../utils/messages";
import Filters from "../utils/filters";
import State from "../utils/state";
import IConfig from "../types/config";

class TelegramModule {
  static async init(config: IConfig) {
    const { apiId, apiHash, telegramPhone, telegramPassword, botToken } = config;

    const client = await Telegram.createInstance({
      apiId,
      apiHash,
      telegramPassword,
      telegramPhone,
      botToken,
    });

    await client.start();

    await client.getMe();

    let groupedMessages: { [key: number]: { file: Buffer; caption: string; filename: string; entities: MessageEntity[] | undefined }[] } = {};

    async function sendGroupedMessage(chat: number | string, groupedId: number, type: "photo" | "video" | "document", file: Buffer, filename: string, caption: string, entities: MessageEntity[] | undefined) {
      if (!groupedMessages[groupedId]) {
        groupedMessages[groupedId] = [{ file, caption, filename, entities }];
      } else {
        groupedMessages[groupedId].push({ file, caption, filename, entities });
        return;
      }

      setTimeout(() => {
        if (!groupedMessages[groupedId]) {
          return;
        }

        const isCaption = groupedMessages[groupedId].some(({ caption }) => !!caption);
        if (!isCaption) {
          delete groupedMessages[groupedId];
          return;
        }

        if (type === "video") {
          client.sendVideoMediaGroup(chat, groupedMessages[groupedId]).catch(console.log);
        }

        if (type === "photo") {
          client.sendPhotoMediaGroup(chat, groupedMessages[groupedId]).catch(console.log);
        }

        if (type === "document") {
          client.sendDocumentMediaGroup(chat, groupedMessages[groupedId]).catch(console.log);
        }

        delete groupedMessages[groupedId];
      }, 15000);
    }

    client.onMessage(async (e) => {
      try {
        const { isActive } = await State.getState();

        const message = e.message;
        if (!isActive || (!e.isChannel && !e.isGroup) || !message.chatId) {
          return;
        }

        let messageText = message.rawText;

        if (messageText) {
          const filters = await Filters.getAll();

          let isOk = false;

          for (let filter of filters) {
            if (messageText.toLowerCase().includes(filter.toLowerCase())) {
              isOk = true;
            }
          }

          if (!isOk) return;
        }

        if (!messageText && !message.groupedId) {
          return;
        }

        const getCorrectEntityType = (entityType: string): MessageEntity["type"] | null => {
          switch (entityType) {
            case "MessageEntityUrl":
              return "url";
            case "MessageEntityBold":
              return "bold";
            case "MessageEntityBotCommand":
              return "bot_command";
            case "MessageEntityCashtag":
              return "cashtag";
            case "MessageEntityCode":
              return "code";
            case "MessageEntityCustomEmoji":
              return "custom_emoji";
            case "MessageEntityEmail":
              return "email";
            case "MessageEntityHashtag":
              return "hashtag";
            case "MessageEntityItalic":
              return "italic";
            case "MessageEntityMention":
              return "mention";
            case "MessageEntityMentionName":
              return "text_mention";
            case "MessageEntityPhone":
              return "phone_number";
            case "MessageEntityPre":
              return "pre";
            case "MessageEntitySpoiler":
              return "spoiler";
            case "MessageEntityStrike":
              return "strikethrough";
            case "MessageEntityTextUrl":
              return "text_link";
            case "MessageEntityUnderline":
              return "underline";
            default:
              return null;
          }
        };

        const messageEntities = e.message.entities
          ?.filter(({ className }) => !!getCorrectEntityType(className))
          ?.map(({ className, ...rest }) => {
            const correctEntityType = getCorrectEntityType(className) as MessageEntity["type"];

            if (className === "MessageEntityCustomEmoji") {
              return {
                ...rest,
                type: correctEntityType,
                custom_emoji_id: (rest as any).documentId,
              };
            }

            return {
              ...rest,
              type: correctEntityType,
            };
          }) as MessageEntity[];

        // .filter(({ length, offset }) => {
        //   return length + offset <= messageText.length;
        // });

        const username = await client.getUsername(message.chatId);
        const channels = await Channels.getAll();

        if (channels.includes(username as any)) {
          return;
        }

        const isExists = await Messages.exists(messageText);
        if (isExists) return;

        const reference = username ? `\n\nhttps://t.me/${username.slice(1)}/${message.id}` : "";

        for (let channel of channels) {
          // if (channels.includes(username as any)) {
          //   continue;
          // }

          // if (channel === username || Number.isInteger(Number(username))) {
          //   continue;
          // }

          if (message.media && !message.webPreview) {
            const isCaptionLengthCorrect = (messageText + reference).length <= 1024;

            if (!isCaptionLengthCorrect) {
              messageText = messageText.slice(0, 1025 - reference.length);
            }

            if (message.groupedId) {
              if (message.photo) {
                const photo = (await client.downloadMedia(message)) as Buffer;
                sendGroupedMessage(channel, message.groupedId.toJSNumber(), "photo", photo, "photo", messageText + reference, messageEntities);
              } else if (message.video) {
                const video = (await client.downloadMedia(message)) as Buffer;
                sendGroupedMessage(channel, message.groupedId.toJSNumber(), "video", video, "video", messageText + reference, messageEntities);
              } else if (message.document) {
                const document = (await client.downloadMedia(message)) as Buffer;
                sendGroupedMessage(channel, message.groupedId.toJSNumber(), "document", document, (message.document.attributes[0] as any).fileName, messageText + reference, messageEntities);
              }

              return;
            }
            // 1AgAOMTQ5LjE1NC4xNjcuNDEBu4zw/VuWZbr+nTjmVZA5J0pW8dQWdZI6+5kfYO+efrvJrY/JpWYvzmC4osNY1FO9Z/peovegDzZvBWteNlw+EnUlaKbPB6gbMCGT8IgGvWDhymKQKfP6Cyn1odttJmVR8HWGEDIeCZILrRHVk6box043z2B4lsnO8sffprtHUKdKjlBe0zFMugWyhrPgEAXa/NyJKBkpdM6jKN9dJaIuuoi+CoCq6aygslpRC7r/3uzTmivHUd9amKescD1keRTs+i4qhrMmITyFHN6XwJoh8hlb+hs+/MBNhJXH4HcRTgbJWHCS2pLnN0tAi2lCtAUVEiUvOBaHYFJ7ClMKpGk/KKI=

            // TEST: 1AQAOMTQ5LjE1NC4xNzUuNTkBu0AqbwfSqSIn+BD4mSpvwBhncGFg/ornbo1Jz1EeyWiPdZJ+mQAwzWSf7sPs1qFfc2QPn6b3JWh7wMmXBy5NlelskgaJ5tiyvv39ursNRc96wgoj4Ja+q+zEl6TIXRN8oRqLSzhvCzC7YLoNV/SNxElp1kRkod9mQytL+2JfuLHoIPGMFFvNqrgMH6X0tIvplstbgp+aoGGzWHSE8ee66JKPUHCCMfHt77Ox4dI8RLG23elCd1dPts1YTF80TM5yvN/qZJDeMYLOlnQ/GK4eveTEBLq+JUfDOEQglohVhPS9LNrWPvwUYT/hLtNwelGq64s3bb6uoygl6HJYxg77zS8=
            if (message.photo) {
              const photo = (await client.downloadMedia(message)) as Buffer;
              await client.sendPhoto(channel, photo, messageText + reference, messageEntities);
            } else if (message.video) {
              const video = (await client.downloadMedia(message)) as Buffer;
              await client.sendVideo(channel, video, messageText + reference, messageEntities);
            } else if (message.document) {
              const document = (await client.downloadMedia(message)) as Buffer;
              await client.sendDocument(channel, document, (message.document.attributes[0] as any).fileName, messageText + reference, messageEntities);
            }
          } else {
            await client.sendMessage(channel, messageText + reference, messageEntities);
          }
        }
      } catch (e) {
        console.log(e);
      }
    });

    return client;
  }
}

export default TelegramModule;
