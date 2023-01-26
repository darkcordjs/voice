import { Connector, NodeOption, Connectors } from "shoukaku";
import { Client } from "darkcord";

export class Darkcord extends Connector {
  declare client: Client;
  // sendPacket is where your library send packets to Discord Gateway
  sendPacket(shardId: number, payload: any, important: boolean) {
    return this.client.websocket.shards
      .get(String(shardId))
      ?.send(payload, important);
  }
  // getId is a getter where the lib stores the client user (the one logged in as a bot) id
  getId() {
    return this.client.user.id;
  }
  // Listen attaches the event listener to the library you are using
  listen(nodes: NodeOption[]) {
    // Only attach to ready event once, refer to your library for its ready event
    this.client.once("ready", () => this.ready(nodes));
    // Attach to the raw websocket event, this event must be 1:1 on spec with api (most libs implement this)
    this.client.on("packet", (packet) => this.raw(packet));
  }
}

Connectors.Darkcord = Darkcord;

declare module "shoukaku" {
  namespace Connectors {
    export class Darkcord extends Connector {
      sendPacket(shardId: number, payload: any, important: boolean): void;
      getId(): string;
      listen(nodes: NodeOption[]): void;
    }
  }
}
