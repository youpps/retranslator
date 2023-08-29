import fs from "fs/promises";
import path from "path";

export interface IVkConfig {
  groupIds: number[];
  lastDate: string;
}

class VkConfig {
  static async getConfig(): Promise<IVkConfig> {
    const vkConfig = await fs.readFile(path.resolve(__dirname, "../configs/vk.json"), { encoding: "utf-8" });
    const vkJsonConfig = JSON.parse(vkConfig);
    return vkJsonConfig;
  }

  static async setLastDate(lastDate: string | number) {
    const config = await VkConfig.getConfig();

    await fs.writeFile(
      path.resolve(__dirname, "../configs/vk.json"),
      JSON.stringify({
        ...config,
        lastDate,
      })
    );
  }

  static async addGroupId(id: number) {
    const config = await VkConfig.getConfig();

    if (config.groupIds.includes(id)) {
      return;
    }

    await fs.writeFile(
      path.resolve(__dirname, "../configs/vk.json"),
      JSON.stringify({
        ...config,
        groupIds: [...config.groupIds, id],
      })
    );
  }

  static async deleteGroupId(id: number) {
    const config = await VkConfig.getConfig();

    await fs.writeFile(
      path.resolve(__dirname, "../configs/vk.json"),
      JSON.stringify({
        ...config,
        groupIds: config.groupIds.filter((groupId) => groupId !== id),
      })
    );
  }
}

export default VkConfig;
