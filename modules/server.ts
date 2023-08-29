import path from "path";
import express from "express";
import { engine } from "express-handlebars";
import Filters from "../utils/filters";
import Channels from "../utils/channels";
import State from "../utils/state";
import VkConfig from "../utils/vk";
import IConfig from "../types/config";

class ServerModule {
  static async init(config: IConfig) {
    const app = express();

    app.engine("handlebars", engine());
    app.set("view engine", "handlebars");
    app.set("views", path.resolve(__dirname, "../views"));
    app.use(express.urlencoded({ extended: true }));

    app.all("/", async (req, res) => {
      try {
        const { isActive } = await State.getState();

        const { channel_name } = req.body;

        if (channel_name) {
          if (req.body["remove_channel"]) {
            const channel = channel_name;

            await Channels.delete(channel);
          }

          if (req.body["add_channel"]) {
            const channel = channel_name;

            await Channels.add(channel);
          }
        }

        if (req.body["stop_bot"]) {
          await State.changeState({
            isActive: false,
          });
        }

        if (req.body["start_bot"]) {
          await State.changeState({
            isActive: true,
          });
        }

        const channels = await Channels.getAll();

        res.status(200).render("admin", {
          bot_status: isActive,
          channels: channels,
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

    app.all("/vk", async (req, res) => {
      try {
        const { groupId } = req.body;

        if (groupId) {
          if (req.body["add_group"]) {
            await VkConfig.addGroupId(groupId);
          }

          if (req.body["remove_group"]) {
            await VkConfig.deleteGroupId(groupId);
          }
        }

        const { groupIds } = await VkConfig.getConfig();

        res.status(200).render("vk", {
          groupIds,
        });
      } catch (e) {
        console.log(e);
      }
    });

    app.listen(config.port, () => {
      console.log(`http://localhost:${config.port}`);
    });
  }
}

export default ServerModule;
