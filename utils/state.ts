import fs from "fs/promises";
import path from "path";

interface IState {
  isActive: boolean;
}

class State {
  static async getState(): Promise<IState> {
    const stateFile = await fs.readFile(path.resolve(__dirname, "../configs/state.json"));
    const state = JSON.parse(stateFile.toString("utf8"));
    return state;
  }

  static async changeState(state: IState) {
    await fs.writeFile(path.resolve(__dirname, "../configs/state.json"), JSON.stringify(state));
  }
}

export default State;
