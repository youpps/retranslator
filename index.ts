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

//  vk1.a.DJOC-jnp3BYFXlfkaM_EMTYgvgo5MuxbNU3Dp1aK-qUKct3YlL3jKbT02x4FuuYg_GxCbpeAPFiqth7FhVYx9PCiwS0c46HqBDgxYHqzSEfL9z7KWKQx_ncZCrfxM2RCO_yGmfCQmFjpz6yOYQifZK8cGQmbWlpDLPAWt1EfssQNTBtKnbwt99C1CI0glq4zgs4a39XXL-r44LgiVE7eDQ
// CURR vk1.a.AlUWwv9Rree3X2-x7ozHxZ-18hX1ee7BsyM1lXwRNeGtwWiI9msYLvdUCdz0j65QsazHjqYNOdZWV7_H8cU4Zts6jXqql3ia4GZ_FLlgECpDU8FPAbf5xj_XjbRcrLHw-xaDP6ncd3GuNPxJ3wpMidCTraoDVMelRdOAW3Fp6YSN68NUXSRXaanRRKg5CJgNuf1X4QtbdellMgvXP4kw_w
bootstrap();
