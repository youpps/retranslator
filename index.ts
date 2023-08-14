import express from "express";
import { engine } from "express-handlebars";
import Session from "./utils/session";
import Telegram from "./utils/telegram";
import config from "./configs/appConfig.json";
import path from "path";
import Channels from "./utils/channels";
import Filters from "./utils/filters";
import { MessageEntity } from "telegraf/typings/core/types/typegram";

const PORT = process.env.PORT || 5000;

const app = express();
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", path.resolve(__dirname, "./views"));
app.use(express.urlencoded({ extended: true }));

let isLaunched = true;

async function bootstrap() {
  try {
    const { apiId, apiHash, telegramPhone, telegramPassword, botToken } = config as any;

    const session = await Session.getSession();

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

    async function sendGroupedMessage(chat: number | string, groupedId: number, type: "photo" | "video" | "document", file: Buffer, filename: string, caption: string, entities: MessageEntity[] | undefined, thread: number | undefined) {
      if (!groupedMessages[groupedId]) {
        groupedMessages[groupedId] = [{ file, caption, filename, entities }];
      } else {
        groupedMessages[groupedId].push({ file, caption, filename, entities });
      }

      setTimeout(() => {
        if (!groupedMessages[groupedId]) {
          return;
        }

        if (type === "video") {
          client.sendVideoMediaGroup(chat, groupedMessages[groupedId], thread).catch(console.log);
        }

        if (type === "photo") {
          client.sendPhotoMediaGroup(chat, groupedMessages[groupedId], thread).catch(console.log);
        }

        if (type === "document") {
          client.sendDocumentMediaGroup(chat, groupedMessages[groupedId], thread).catch(console.log);
        }

        delete groupedMessages[groupedId];
      }, 5000);
    }

    client.onMessage(async (e) => {
      try {
        const message = e.message;
        if (!isLaunched || (!e.isChannel && !e.isGroup) || !message.chatId) {
          return;
        }

        const messageText = message.rawText;

        const filters = await Filters.getAll();

        let isOk = true;

        for (let filter of filters) {
          if (messageText.toLowerCase().includes(filter.toLowerCase())) {
            isOk = true;
          }
        }

        if (!isOk) return;

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
          ?.map(({ className, length, ...rest }) => {
            const correctEntityType = getCorrectEntityType(className) as MessageEntity["type"];

            if (className === "MessageEntityCustomEmoji") {
              return {
                ...rest,
                length: length - 1,
                type: correctEntityType,
                custom_emoji_id: (rest as any).documentId,
              };
            }

            return {
              ...rest,
              length: length - 1,
              type: correctEntityType,
            };
          }) as MessageEntity[];

        // .filter(({ length, offset }) => {
        //   return length + offset <= messageText.length;
        // });

        const username = await client.getUsername(message.chatId);
        const channels = await Channels.getAll();

        for (let { from, to } of channels) {
          if (username === from) {
            const thread = to.split("/").length === 2 ? Number(to.split("/")[1]) : undefined;
            const channelTo = to.split("/").length === 2 ? to.split("/")[0] : to;

            if (message.media && !message.webPreview) {
              if (message.groupedId) {
                if (message.photo) {
                  const photo = (await client.downloadMedia(message)) as Buffer;
                  sendGroupedMessage(channelTo, message.groupedId.toJSNumber(), "photo", photo, "photo", messageText, messageEntities, thread);
                } else if (message.video) {
                  const video = (await client.downloadMedia(message)) as Buffer;
                  sendGroupedMessage(channelTo, message.groupedId.toJSNumber(), "video", video, "video", messageText, messageEntities, thread);
                } else if (message.document) {
                  const document = (await client.downloadMedia(message)) as Buffer;
                  sendGroupedMessage(channelTo, message.groupedId.toJSNumber(), "document", document, (message.document.attributes[0] as any).fileName, messageText, messageEntities, thread);
                }

                return;
              }
              // 1AgAOMTQ5LjE1NC4xNjcuNDEBu4zw/VuWZbr+nTjmVZA5J0pW8dQWdZI6+5kfYO+efrvJrY/JpWYvzmC4osNY1FO9Z/peovegDzZvBWteNlw+EnUlaKbPB6gbMCGT8IgGvWDhymKQKfP6Cyn1odttJmVR8HWGEDIeCZILrRHVk6box043z2B4lsnO8sffprtHUKdKjlBe0zFMugWyhrPgEAXa/NyJKBkpdM6jKN9dJaIuuoi+CoCq6aygslpRC7r/3uzTmivHUd9amKescD1keRTs+i4qhrMmITyFHN6XwJoh8hlb+hs+/MBNhJXH4HcRTgbJWHCS2pLnN0tAi2lCtAUVEiUvOBaHYFJ7ClMKpGk/KKI=

              // TEST: 1AQAOMTQ5LjE1NC4xNzUuNTkBu0AqbwfSqSIn+BD4mSpvwBhncGFg/ornbo1Jz1EeyWiPdZJ+mQAwzWSf7sPs1qFfc2QPn6b3JWh7wMmXBy5NlelskgaJ5tiyvv39ursNRc96wgoj4Ja+q+zEl6TIXRN8oRqLSzhvCzC7YLoNV/SNxElp1kRkod9mQytL+2JfuLHoIPGMFFvNqrgMH6X0tIvplstbgp+aoGGzWHSE8ee66JKPUHCCMfHt77Ox4dI8RLG23elCd1dPts1YTF80TM5yvN/qZJDeMYLOlnQ/GK4eveTEBLq+JUfDOEQglohVhPS9LNrWPvwUYT/hLtNwelGq64s3bb6uoygl6HJYxg77zS8=
              if (message.photo) {
                const photo = (await client.downloadMedia(message)) as Buffer;
                await client.sendPhoto(channelTo, photo, messageText, messageEntities, thread);
              } else if (message.video) {
                const video = (await client.downloadMedia(message)) as Buffer;
                await client.sendVideo(channelTo, video, messageText, messageEntities, thread);
              } else if (message.document) {
                const document = (await client.downloadMedia(message)) as Buffer;
                await client.sendDocument(channelTo, document, (message.document.attributes[0] as any).fileName, messageText, messageEntities, thread);
              }
            } else {
              await client.sendMessage(channelTo, messageText, messageEntities, thread);
            }
          }
        }
      } catch (e) {
        console.log(e);
      }
    });

    const channelRegexp = /@.+->@.+/;
    app.all("/", async (req, res) => {
      try {
        const { channel_name } = req.body;

        if (channel_name && channelRegexp.test(channel_name)) {
          if (req.body["remove_channel"]) {
            const from = channel_name.split("->")[0];
            const to = channel_name.split("->")[1];

            await Channels.delete({
              from,
              to,
            });
          }

          if (req.body["add_channel"]) {
            const from = channel_name.split("->")[0];
            const to = channel_name.split("->")[1];

            await Channels.add({
              from,
              to,
            });
          }
        }

        if (req.body["stop_bot"]) {
          isLaunched = false;
        }

        if (req.body["start_bot"]) {
          isLaunched = true;
        }

        const channels = await Channels.getAll();

        res.status(200).render("admin", {
          bot_status: isLaunched,
          channels: channels.map(({ from, to }) => from + "->" + to),
        });
      } catch (e) {
        console.log(e);
      }
    });

    app.all("/filters", async (req, res) => {
      try {
        const { filter_word } = req.body;

        if (filter_word) {
          if (req.body["add_filter_word"]) {
            await Filters.add(filter_word);
          }

          if (req.body["remove_filter_word"]) {
            await Filters.delete(filter_word);
          }
        }

        const filters = await Filters.getAll();

        res.status(200).render("filters", {
          filters,
        });
      } catch (e) {
        console.log(e);
      }
    });

    app.listen(PORT, () => {
      console.log(`http://localhost:${PORT}`);
    });
  } catch (e) {
    console.log(e);
  }
}

bootstrap();
