import { PluginManager, Guild, VoiceChannel, type Client, PluginObject, PluginFn } from "darkcord";
import { NodeOption, Shoukaku, ShoukakuOptions } from "shoukaku";
import { CreatePlayerOptions, Kazagumo, KazagumoPlayer, KazagumoPlugin, PlayOptions, KazagumoTrack as Track, YoutubeThumbnail } from "kazagumo";
import { Darkcord } from "../utils/connector";
import { LavaPlayer } from "./LavaPlayer";

// Typing Darkcord Lib
declare module "darkcord" {
    export interface Client {
        lava: LavaPlayer
    }
    export interface Guild {
        _client: Client;
        createLavaPlayer(voiceChannel: VoiceChannel | string, options: Omit<CreatePlayerOptions, "guildId" | "shardId" | "voiceId">): Promise<KazagumoPlayer>;
        destroyLavaPlayer(): void;
        lavaPlayer(): KazagumoPlayer | undefined
    }
    export interface VoiceChannel {
        _client: Client;
        play(track: Track, options?: PlayOptions): Promise<KazagumoPlayer>
    }
}

export interface LavaOptions extends ShoukakuOptions {
    nodes: NodeOption[];
    debug?: boolean;
    plugins?: KazagumoPlugin[];
    defaultSearchEngine?: string;
    defaultYoutubeThumbnail?: YoutubeThumbnail
}

export function Lava(options: LavaOptions): PluginFn {
    return (manager: PluginManager) => ({
        name: "darkcord/lava",
        description: "",
        version: "0.1.0",
        load: () => {
            const kazagumo = new Kazagumo({
                plugins: options.plugins,
                send: (guildId, payload) => {
                    const guild = manager.client.guilds.cache.get(guildId);

                    if (guild && guild.shardId) {
                        manager.client.shards.get(guild.shardId)?.send(payload);
                    }
                },
                defaultYoutubeThumbnail: options.defaultYoutubeThumbnail ?? "default",
                defaultSearchEngine: options.defaultSearchEngine ?? "youtube",
            }, new Darkcord(manager.client), options.nodes, options);

            manager.addProperty("lava", new LavaPlayer(kazagumo));

            // Extends Guild
            manager.extends("Guild", (X: typeof Guild) => class Guild extends X {
                declare _client: Client;

                createLavaPlayer(voiceChannel: VoiceChannel | string, options: Omit<CreatePlayerOptions, "guildId" | "shardId" | "voiceId">) {
                    if (!this.shardId) {
                        throw new Error("No shard in guild");
                    }

                    const voiceId = typeof voiceChannel === "string" ? voiceChannel : voiceChannel.id;

                    return this._client.lava.createPlayer({
                        shardId: Number(this.shardId),
                        guildId: this.id,
                        voiceId,
                        ...options
                    });
                }

                destroyLavaPlayer() {
                    this._client.lava.destroyPlayer(this.id);
                }

                lavaPlayer() {
                    return this._client.lava.getPlayer(this.id);
                }
            });

            // Extends VoiceChannel
            manager.extends("VoiceChannel", (X: typeof VoiceChannel) => class VoiceChannel extends X {
                declare _client: Client;

                async play(track: Track, options?: PlayOptions) {
                    const player = this._client.lava.getPlayer(this.guildId);

                    if (!player) {
                        await this._client.lava.createPlayer({
                            guildId: this.guildId,
                            textId: this.id,
                            voiceId: this.id
                        });
                    }

                    if (player?.voiceId !== this.id) {
                        player?.setVoiceChannel(this.id);
                    }

                    return player!.play(track, options);
                }
            });
        },
        onStart() {
            if (options.debug) {
                console.log("Loaded darkcord/lava plugin!");
            }
        }
    })
}

export default Lava