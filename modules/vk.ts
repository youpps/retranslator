import moment from "moment";
import { VK } from "vk-io";
import { WallWallpostFull } from "vk-io/lib/api/schemas/objects";
import Telegram from "../utils/telegram";
import VkConfig from "../utils/vk";
import Channels from "../utils/channels";
import State from "../utils/state";
import IConfig from "../types/config";
import Filters from "../utils/filters";

class VkModule {
  private static async downloadImage(url: string) {
    const data = await fetch(url);

    const arrayBuffer = await data.arrayBuffer();

    return Buffer.from(arrayBuffer);
  }

  private static async getWall(vk: VK, owner_id: number) {
    const res = await vk.api.wall.get({
      owner_id: -Math.abs(owner_id),
      count: 100,
      filter: "owner",
    });

    return res.items;
  }

  private static async getGoodPosts(vk: VK, owner_id: number, after?: string | number | Date) {
    const posts = await VkModule.getWall(vk, owner_id);
    const goodPosts: WallWallpostFull[] = [];

    const filters = await Filters.getAll();

    for (let post of posts) {
      if (!post.date) {
        continue;
      }

      if (after && moment(after).isAfter(moment(post.date * 1000))) {
        continue;
      }

      if (post.copy_history?.length) {
        continue;
      }

      if (post.marked_as_ads !== 0) {
        continue;
      }

      let isOk = false;

      if (post.text) {
        for (let filter of filters) {
          if (post.text.toLowerCase().includes(filter.toLowerCase())) {
            isOk = true;
          }
        }
      }

      if (!isOk) {
        continue;
      }

      goodPosts.push(post);
    }

    return goodPosts;
  }

  static async retranslatingTask(telegram: Telegram, vk: VK) {
    try {
      const { isActive } = await State.getState();
      if (!isActive) {
        return;
      }

      const { lastDate, groupIds } = await VkConfig.getConfig();
      if (!lastDate) {
        await VkConfig.setLastDate(Date.now());
      }

      async function getMedia(post: any) {
        const media: { type: string; buffer: Buffer }[] = [];

        if (post.attachments) {
          for (let attachment of post.attachments) {
            if (attachment.type === "photo") {
              const photoAttachment = attachment.photo;
              const photo = await VkModule.downloadImage(photoAttachment.sizes[photoAttachment.sizes.length - 1].url);

              media.push({
                type: "photo",
                buffer: photo,
              });

              continue;
            }

            // if (attachment.type === "audio") {
            //   const audioAttachment = attachment.audio;

            //   const audio = await VkModule.downloadImage(audioAttachment.url);

            //   media.push({
            //     type: "audio",
            //     buffer: audio,
            //   });

            //   continue;
            // }

            if (attachment.type === "video") {
              const videoAttachment = attachment.video;

              const videoPreview = await VkModule.downloadImage(videoAttachment.url);

              media.push({
                type: "photo",
                buffer: videoPreview,
              });

              continue;
            }
          }
        }

        return media;
      }

      async function sendMessage(text: string, media: any[], reference: string) {
        const channels = await Channels.getAll();

        for (let channel of channels) {
          if (!media.length) {
            await telegram.sendMessage(channel, text + reference);
            break;
          }

          const isCaptionLengthCorrect = (text + reference).length <= 1024;
          if (!isCaptionLengthCorrect) {
            text = text.slice(0, 1025 - reference.length);
          }

          if (media.length === 1) {
            const mediaItem = media[0];
            if (mediaItem.type === "photo") {
              await telegram.sendPhoto(channel, mediaItem.buffer, text + reference);
            }

            break;
          }

          const mediaGroup = media.map((mediaItem, idx) => {
            if (idx === 0) {
              return {
                file: mediaItem.buffer,
                caption: text + reference,
              };
            }

            return {
              file: mediaItem.buffer,
              caption: "",
            };
          });

          await telegram.sendPhotoMediaGroup(channel, mediaGroup);
        }
      }

      for (let groupId of groupIds) {
        const { lastDate } = await VkConfig.getConfig();

        const posts = await VkModule.getGoodPosts(vk, groupId, lastDate);

        for (let post of posts) {
          const text = post.text ?? "";
          const media = await getMedia(post);
          const reference = "https://vk.com/wall" + post.owner_id + "_" + post.id;

          await sendMessage(text, media, reference);
          await new Promise((rs) => setTimeout(rs, 250));
        }

        await new Promise((rs) => setTimeout(rs, 250));
      }

      await VkConfig.setLastDate(Date.now() + 1);
    } catch (e) {
      console.log(e);
    }
  }

  static async init(config: IConfig, telegram: Telegram) {
    const vk = new VK({
      token: config.vkToken,
      apiVersion: "5.131",
      language: "ru",
      apiTimeout: 10000,
    });

    setInterval(() => VkModule.retranslatingTask(telegram, vk), 25000);
  }
}

export default VkModule;
