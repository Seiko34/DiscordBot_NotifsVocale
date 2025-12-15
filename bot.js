const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

client.once("ready", () => {
    console.log(`✅ Bot connecté : ${client.user.tag}`);
});

client.on("voiceStateUpdate", (oldState, newState) => {

    // uniquement quand quelqu’un ENTRE dans un vocal
    if (!oldState.channel && newState.channel) {

        const channel = newState.channel;

        // humains uniquement
        const humanCount = channel.members.filter(
            member => !member.user.bot
        ).size;

        // vide → non vide
        if (humanCount === 1) {
            const textChannel = channel.guild.channels.cache.get("1450145620131053742");

            if (textChannel) {
                textChannel.send(
                    `🔊 **Un vocal vient de commencer** dans **${channel.name}**`
                );
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
