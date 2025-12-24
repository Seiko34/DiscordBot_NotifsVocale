const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once("ready", () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  // Uniquement quand quelqu’un ENTRE dans un vocal
  if (!oldState.channel && newState.channel) {
    const channel = newState.channel;

    // Compte UNIQUEMENT les humains
    const humanCount = channel.members.filter((m) => !m.user.bot).size;

    // Déclenche uniquement quand le vocal passe de vide à non vide
    if (humanCount === 1) {
      const textChannel = channel.guild.channels.cache.get("1450145620131053742");
      if (!textChannel) return;

      try {
        const msg = await textChannel.send(
          `🔊 **Un vocal vient de commencer** : <#${channel.id}>`
        );

        // Auto-suppression après 48h
        setTimeout(() => {
          msg.delete().catch(() => {});
        }, 48 * 60 * 60 * 1000);
      } catch (err) {
        console.error("❌ Erreur envoi/suppression message:", err);
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
