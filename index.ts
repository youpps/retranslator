import config from "./configs/appConfig.json";
import ServerModule from "./modules/server";
import TelegramModule from "./modules/telegram";
import VkModule from "./modules/vk";

async function bootstrap() {
  try {
    const telegram = await TelegramModule.init(config);
    await VkModule.init(config, telegram);
    await ServerModule.init(config);
  } catch (e) {
    console.log(e);
  }
}

bootstrap();
