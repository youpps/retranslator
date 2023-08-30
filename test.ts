import { VK } from "vk-io";
import config from "./configs/appConfig.json";

const vk = new VK({
  token: config.vkTokens[0],
  apiVersion: "5.131",
  language: "ru",
  apiTimeout: 10000,
});

vk.api.wall
  .get({
    owner_id: -5890082,
    count: 100,
    filter: "all",
  })
  .then((res) => console.log(res.items[0].copy_history));
