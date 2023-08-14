import { log } from "console";
import fs from "fs/promises";
import path from "path";

interface IChannel {
  from: string;
  to: string;
}
// 1AgAOMTQ5LjE1NC4xNjcuNDEBuwQkFLI7Vqacurd0NN6gNTtx22+ZZmj+zJws+u1eN9wGeTVjsgSh8FbwJNgUsPQOzJdHRKHeuQbflcfDjRKmxaTF5HKK1xzJd1dH4ovpBEPAMP1SN/ezEEgRCH/fRrRkPXcLApIRyGUcY3Gz7E2n7Xt7bGcr21fTUeXMx8+M/SJD0q1k2qIRlhT/dK02GsRB5oslUyAN3tTnrhEQhTzuh4VUjvfB31ot6/Op9wUYLqBlD4QHI3ezLXF5zWcztQYiM2iUNGslaYa8CoBItWlHgSnNEqP8dTyXOOBTf3cBDh2igNPTrshngjDq7vwQOCMQaHpa3OxInhXNw+FVyg3+kLk=
class Channels {
  static async getAll(): Promise<IChannel[]> {
    const channelsFile = await fs.readFile(path.resolve(__dirname, "../configs/channels.json"));
    const channels = JSON.parse(channelsFile.toString("utf8"));
    return channels;
  }

  static async add(channel: IChannel) {
    const channels = await Channels.getAll();

    const channelExists = channels.some(({ from, to }) => from === channel.from && to === channel.to);
    if (channelExists) {
      return;
    }

    channels.push(channel);

    await fs.writeFile(path.resolve(__dirname, "../configs/channels.json"), JSON.stringify(channels));
  }

  static async delete(channel: IChannel) {
    let channels = await Channels.getAll();
    channels = channels.filter(({ from, to }) => channel.from !== from || channel.to !== to);

    await fs.writeFile(path.resolve(__dirname, "../configs/channels.json"), JSON.stringify(channels));
  }
}

export default Channels;
