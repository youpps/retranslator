import moment from "moment";
import { VK } from "vk-io";
import { WallWallpostFull } from "vk-io/lib/api/schemas/objects";
import Telegram from "../utils/telegram";
import VkConfig from "../utils/vk";
import Channels from "../utils/channels";
import State from "../utils/state";
import IConfig from "../types/config";
import Filters from "../utils/filters";
import Messages from "../utils/messages";

class VkModule {
  private static async downloadImage(url: string) {
    const data = await fetch(url);

    const arrayBuffer = await data.arrayBuffer();

    return Buffer.from(arrayBuffer);
  }

  private static async getGoodPosts(vk: VK, owner_id: number, after?: string | number | Date) {
    const res = await vk.api.wall.get({
      owner_id: -Math.abs(owner_id),
      count: 100,
      filter: "all",
    });

    const posts = res.items;

    const goodPosts: WallWallpostFull[] = [];

    const filters = await Filters.getAll();

    for (let post of posts) {
      if (!post.text) {
        continue;
      }

      if (!post.date) {
        continue;
      }

      if (after && moment(after).isAfter(moment(post.date * 1000))) {
        continue;
      }

      // if (post.copy_history?.length) {
      //   continue;
      // }

      if (post.marked_as_ads !== 0) {
        continue;
      }

      const exists = await Messages.exists(post.text);
      if (exists) {
        continue;
      }

      let isOk = false;

      for (let filter of filters) {
        if (post.text.toLowerCase().includes(filter.toLowerCase())) {
          isOk = true;
        }
      }

      if (!isOk) {
        continue;
      }

      goodPosts.push(post);
    }

    return goodPosts;
  }

  private static async getMedia(post: any) {
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

  private static async sendMessage(telegram: Telegram, text: string, media: any[], reference: string) {
    const channels = await Channels.getAll();

    for (let channel of channels) {
      if (!media.length) {
        await telegram.sendMessage(channel, text + reference);
        continue;
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

        continue;
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

  static async retranslatingTask(telegram: Telegram, vk: VK) {
    try {
      const { isActive } = await State.getState();
      if (!isActive) {
        return;
      }

      const { groupIds } = await VkConfig.getConfig();

      for (let groupId of groupIds) {
        try {
          const { lastDate } = await VkConfig.getConfig();

          const posts = await VkModule.getGoodPosts(vk, groupId, lastDate);

          console.log(groupId + " IS HANDLING", posts);

          for (let post of posts) {
            const text = post.text ?? "";
            const media = await VkModule.getMedia(post);
            const reference = "\n\nhttps://vk.com/wall" + post.owner_id + "_" + post.id;

            await VkModule.sendMessage(telegram, text, media, reference);
            await new Promise((rs) => setTimeout(rs, 300));
          }
        } catch (e) {
          console.log(groupId, e);
        } finally {
          await new Promise((rs) => setTimeout(rs, 300));
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  static async init(config: IConfig, telegram: Telegram) {
    const pool = new VkPool(config.vkTokens);

    const MINUT = 1000 * 60;

    setInterval(() => {
      console.log("VK TICK");

      const vk = pool.getClient();

      VkModule.retranslatingTask(telegram, vk);
    }, 4.5 * MINUT);
  }
}

class VkPool {
  private poolItems: {
    vk: VK;
    count: number;
  }[] = [];

  constructor(tokens: string[]) {
    for (let token of tokens) {
      const vk = new VK({
        token,
        apiVersion: "5.131",
        language: "ru",
        apiTimeout: 10000,
      });

      this.poolItems.push({
        vk,
        count: 0,
      });
    }
  }

  getClient(): VK {
    let leastClientIdx = 0;
    let leastCount = this.poolItems[0].count;

    for (let i = 0; i < this.poolItems.length; i++) {
      const poolItem = this.poolItems[i];

      if (poolItem.count < leastCount) {
        leastClientIdx = i;
        leastCount = poolItem.count;
      }
    }

    const client = this.poolItems[leastClientIdx].vk;

    this.poolItems[leastClientIdx].count += 1;
    console.log(this.poolItems);

    return client;
  }
}

export default VkModule;
