import { Guild } from "darkcord";
import { CreatePlayerOptions, Kazagumo, KazagumoPlayer as Player, KazagumoTrack as Track, type KazagumoSearchOptions as SearchOptions, PlayOptions } from "kazagumo";
import { NodeOption, Shoukaku } from "shoukaku";
import { copy } from "../utils/copy";

export class LavaPlayer {
    #instance: Kazagumo;
    constructor(kazagumo: Kazagumo) {
        this.#instance = kazagumo
    }

    get nodes() {
        return this.#instance.shoukaku.nodes
    }

    get players() {
        return this.#instance.players
    }

    get lavalink() {
        return copy(this.#instance.shoukaku, ["on", "once", "off"])
    }

    get on() {
        return this.#instance.on.bind(this.#instance) as Shoukaku["on"]
    }

    get once() {
        return this.#instance.once.bind(this.#instance) as Shoukaku["once"]
    }

    get off() {
        return this.#instance.off.bind(this.#instance) as Shoukaku["off"]
    }

    /**
     * Add a Lavalink node to the pool of available nodes
     * @param node node to be added
     */
    addNode(node: NodeOption) {
        this.#instance.shoukaku.addNode(node)
    }

    /**
     * Remove a Lavalink node from the pool of available nodes
     * @param name name of node to remove
     * @param reason Reason of removing the node
     */
    removeNode(name: string, reason?: string) {
        this.#instance.shoukaku.removeNode(name, reason)
    }

    /**
     * Select a Lavalink node from the pool of nodes
     */
    getNode(name: string) {
        return this.#instance.shoukaku.getNode(name)
    }

    /**
     * Search a track by query or uri.
     */
    search(query: string, options?: SearchOptions) {
        return this.#instance.search(query, options)
    }

    play(player: Player | Guild | string, track: Track, options?: PlayOptions) {
        let guildId: string | undefined;

        if (typeof player === "string") guildId = player
        if (player instanceof Guild) guildId = player.id

        if (guildId) {
            player = this.#instance.getPlayer(guildId) as Player;
        }

        if (player instanceof Player) {
            return player.play(track, options)
        } 

        throw new Error("No player found")
    }

    /**
     * Get a least used node.
     */
    leastUsedNode() {
        return this.#instance.getLeastUsedNode()
    }

    /**
     * Get a guild player
     * @param guild Guild instance or guild id of player
     * @returns 
     */
    getPlayer(guild: string | Guild) {
        return this.#instance.getPlayer(typeof guild === "string" ? guild : guild.id)
    }

    /**
     * Create a player.
     * @param options
     * @returns 
     */
    createPlayer(options: CreatePlayerOptions) {
        return this.#instance.createPlayer(options)
    }

    /**
     * Destroy a player
     * @param guild Guild instance or guild id of player
     * @returns 
     */
    destroyPlayer(guild: string | Guild) {
        return this.#instance.destroyPlayer(typeof guild === "string" ? guild : guild.id)
    }
}