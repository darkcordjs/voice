import { Client, ClientEvents, Guild, MakeError, PluginManager, VoiceChannel } from "darkcord";
import { CreatePlayerOptions, Kazagumo, KazagumoOptions, KazagumoPlayer, KazagumoSearchOptions, KazagumoTrack, PlayerMovedChannels, PlayerMovedState } from "kazagumo";

import { NodeOption, PlayerUpdate, ShoukakuOptions, TrackExceptionEvent, TrackStuckEvent, WebSocketClosedEvent } from "shoukaku";

import { Darkcord as DarkcordConnector } from "./shoukaku/connector";

export class Voice {
  #kazagumo: Kazagumo;
  constructor(kazagumo: Kazagumo) {
    this.#kazagumo = kazagumo;
  }

  get players() {
    return this.#kazagumo.players;
  }

  createPlayer(options: CreatePlayerOptions) {
    return this.#kazagumo.createPlayer(options);
  }

  destroyPlayer(guildId: string) {
    return this.#kazagumo.destroyPlayer(guildId);
  }

  get lavalink() {
    return this.#kazagumo.shoukaku;
  }

  getPlayer(guildId: string) {
    return this.#kazagumo.getPlayer(guildId);
  }

  search(query: string, options?: KazagumoSearchOptions) {
    return this.#kazagumo.search(query, options);
  }

  play(guildId: string, track: KazagumoTrack) {
    return this.getPlayer(guildId).play(track);
  }

  async searchAndPlayFirst(
    guildId: string,
    query: string,
    options?: KazagumoSearchOptions
  ) {
    const result = await this.search(query, options);

    if (!result.tracks.length) {
      throw MakeError({
        name: "NoTracks",
        message: `No results found for ${query}`,
      });
    }

    const track = result.tracks[0];
    return this.play(guildId, track);
  }
}

export function VoicePlugin(
  nodes: NodeOption[],
  kazagumoOptions: Omit<KazagumoOptions, "send">,
  shoukakuOptions?: ShoukakuOptions
) {
  return (manager: PluginManager) => {
    return {
      name: "voice",
      version: "0.1.0",
      onStart() { },
      load() {
            const kazagumo = new Kazagumo(
              {
                ...kazagumoOptions,
                send: (guildId, payload) => {
                  const guild = manager.client.cache.guilds.get(guildId);
                  if (guild)
                    manager.client.websocket.shards
                      .get(guild.shardId)
                      ?.send(payload);
                },
              },
              DarkcordConnector,
              nodes,
              shoukakuOptions
            );

            manager.addProperty("voice", new Voice(kazagumo));

            // Modify Voice Channel
            this.overrideResource(
              "VoiceChannel",
              (X: typeof VoiceChannel) =>
                class VoiceChannel extends X {
                  declare _client: Client;
                  play(track: KazagumoTrack) {
                    const currentPlayer = this._client.voice.getPlayer(
                      this.guildId
                    );
                    if (currentPlayer.voiceId !== this.id) {
                      currentPlayer.setVoiceChannel(this.id);
                    }

                    return currentPlayer.play(track);
                  }
                }
            );

            // Modify Guild
            this.overrideResource(
              "Guild",
              (X: typeof Guild) =>
                class Guild extends X {
                  declare _client: Client;
                  createPlayer(
                    textId: string,
                    voiceId: string,
                    options: Omit<
                      CreatePlayerOptions,
                      "textId" | "voiceId" | "guildId" | "shardId"
                    >
                  ) {
                    return this._client.voice.createPlayer({
                      shardId: Number(this.shardId),
                      textId,
                      voiceId,
                      guildId: this.id,
                      ...options,
                    });
                  }

                  destroyPlayer() {
                    return this._client.voice.destroyPlayer(this.id);
                  }

                  get voicePlayer() {
                    return this._client.voice.getPlayer(this.id);
                  }
                }
            );

            // Prepare events
            kazagumo.on("playerStart", (player, track) =>
              manager.emit("voicePlayerStart", player, track)
            );
            kazagumo.on("playerCreate", (player) =>
              manager.emit("voicePlayerCreate", player)
            );
            kazagumo.on("playerClosed", (player, data) =>
              manager.emit("voicePlayerClose", player, data)
            );
            kazagumo.on("playerDestroy", (player) =>
              manager.emit("voicePlayerDestroy", player)
            );
            kazagumo.on("playerEmpty", (player) =>
              manager.emit("voicePlayerEmpty", player)
            );
            kazagumo.on("playerEnd", (player) =>
              manager.emit("voicePlayerEnd", player)
            );
            kazagumo.on("playerException", (player, data) =>
              manager.emit("voicePlayerException", player, data)
            );
            kazagumo.on("playerMoved", (player, state, channels) =>
              manager.emit("voicePlayerMoved", player, state, channels)
            );
            kazagumo.on("playerResolveError", (player, track, message) => {
              throw MakeError({
                name: "VoicePlayerResolve",
                message,
                args: [
                  ["track", track],
                  ["player", player],
                ],
              });
            });
            kazagumo.on("playerResumed", (player) =>
              manager.emit("voicePlayerResume", player)
            );
            kazagumo.on("playerStuck", (player, data) =>
              manager.emit("voicePlayerStuck", player, data)
            );
            kazagumo.on("playerUpdate", (player, data) =>
              manager.emit("voicePlayerUpdate", player, data)
            );
      }
    }
  };
}

export default VoicePlugin;

// Typing
export interface VoiceClientEvents extends ClientEvents {
  voicePlayerUpdate: [player: KazagumoPlayer, data: PlayerUpdate];
  voicePlayerStuck: [player: KazagumoPlayer, data: TrackStuckEvent];
  voicePlayerResume: [player: KazagumoPlayer];
  voicePlayerMoved: [
    player: KazagumoPlayer,
    state: PlayerMovedState,
    channels: PlayerMovedChannels
  ];
  voicePlayerException: [player: KazagumoPlayer, data: TrackExceptionEvent];
  voicePlayerEnd: [player: KazagumoPlayer];
  voicePlayerEmpty: [player: KazagumoPlayer];
  voicePlayerDestroy: [player: KazagumoPlayer];
  voicePlayerClose: [player: KazagumoPlayer, data: WebSocketClosedEvent];
  voicePlayerCreate: [player: KazagumoPlayer];
  voicePlayerStart: [player: KazagumoPlayer];
}

// Extending types
declare module "darkcord/typing/resources/Channel" {
  export interface VoiceChannel {
    play(track: KazagumoTrack): Promise<KazagumoPlayer>;
  }
}

declare module "darkcord/typing/resources/Guild" {
  export interface Guild {
    createPlayer(
      textId: string,
      voiceId: string,
      options: Omit<
        CreatePlayerOptions,
        "textId" | "voiceId" | "guildId" | "shardId"
      >
    ): Promise<KazagumoPlayer>;
    destroyPlayer(): void;
    get voicePlayer(): KazagumoPlayer;
  }
}

declare module "darkcord/typing/client/Client" {
  export interface Client {
    voice: Voice;
    on<E extends keyof VoiceClientEvents>(
      event: E,
      listener: (...args: VoiceClientEvents[E]) => any
    ): this;
    once<E extends keyof VoiceClientEvents>(
      event: E,
      listener: (...args: VoiceClientEvents[E]) => any
    ): this;
    emit<E extends keyof VoiceClientEvents>(
      event: E,
      ...args: VoiceClientEvents[E]
    ): boolean;
  }
}
