import { SocketConnectOpts, AddressInfo, SocketReadyState } from "net";
import { createInterface } from "readline/promises";

async function input(query?: string) {
  const inputInterface = createInterface(process.stdin, process.stdout);
  const text = await inputInterface.question((query ?? "") + "\n");
  return text;
}

export default input;
