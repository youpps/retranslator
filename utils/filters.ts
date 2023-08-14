import fs from "fs/promises";
import path from "path";

class Filters {
  static async getAll(): Promise<string[]> {
    const filtersFile = await fs.readFile(path.resolve(__dirname, "../configs/filters.json"));
    const filters = JSON.parse(filtersFile.toString("utf8"));
    return filters;
  }

  static async add(filter: string) {
    const filters = await Filters.getAll();
    filters.push(filter);

    await fs.writeFile(path.resolve(__dirname, "../configs/filters.json"), JSON.stringify(filters));
  }

  static async delete(filter: string) {
    let filters = await Filters.getAll();

    filters = filters.filter((item) => item !== filter);

    await fs.writeFile(path.resolve(__dirname, "../configs/filters.json"), JSON.stringify(filters));
  }
}

export default Filters;
