const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

// =======================
// CONFIG
// =======================

const CHECK_TIREXO_URL = "https://www.tirexo.fit/";
const DISCORD_TIREXO_CHANNEL_ID = "1317225132019679372";

const CHECK_MOVIX_URL = "https://movix.club/";
const DISCORD_MOVIX_CHANNEL_ID = "1453447650421506170";

const DISCORD_VOCAL_LOG_CHANNEL_ID = "1450145620131053742";

// =======================
// DISCORD CLIENT
// =======================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

// =======================
// REDIRECT CHECK — TIREXO
// =======================

async function checkRedirectTirexo() {
  try {
    const res = await axios.get(CHECK_TIREXO_URL, {
      maxRedirects: 10,
      timeout: 10000,
      validateStatus: null,
    });

    const finalUrl =
      res.request?.res?.responseUrl ||
      res.request?._redirectable?._currentUrl;

    if (!finalUrl) return;

    const cleanFinalUrl = finalUrl.toLowerCase().replace(/\/$/, "");
    const channel = await client.channels.fetch(DISCORD_TIREXO_CHANNEL_ID);

    const messages = await channel.messages.fetch({ limit: 10 });
    const botMessage = messages.find(m => m.author.id === client.user.id);

    const content = `📢 **URL actuelle de Tirexo :** ${cleanFinalUrl}`;

    if (botMessage) {
      if (botMessage.content !== content) {
        await botMessage.edit(content);
      }
      return;
    }

    await channel.send(content);

  } catch (err) {
    console.error("❌ Erreur Tirexo:", err.message);
  }
}

// =======================
// REDIRECT CHECK — MOVIX
// =======================

async function checkRedirectMovix() {
  try {
    const res = await axios.get(CHECK_MOVIX_URL, {
      maxRedirects: 10,
      timeout: 10000,
      validateStatus: null,
    });

    const finalUrl =
      res.request?.res?.responseUrl ||
      res.request?._redirectable?._currentUrl;

    if (!finalUrl) return;

    const cleanFinalUrl = finalUrl.toLowerCase().replace(/\/$/, "");
    const channel = await client.channels.fetch(DISCORD_MOVIX_CHANNEL_ID);

    const messages = await channel.messages.fetch({ limit: 10 });
    const botMessage = messages.find(m => m.author.id === client.user.id);

    const content = `🎬 **URL actuelle de Movix :** ${cleanFinalUrl}`;

    if (botMessage) {
      if (botMessage.content !== content) {
        await botMessage.edit(content);
      }
      return;
    }

    await channel.send(content);

  } catch (err) {
    console.error("❌ Erreur Movix:", err.message);
  }
}

// =======================
// BOT READY
// =======================

client.once("ready", () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);

  // Tirexo → toutes les 6h
  checkRedirectTirexo();
  setInterval(checkRedirectTirexo, 6 * 60 * 60 * 1000);

  // Movix → 1 fois par jour
  checkRedirectMovix();
  setInterval(checkRedirectMovix, 24 * 60 * 60 * 1000);
});

// =======================
// VOCAL NOTIFICATION
// =======================

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (oldState.channel || !newState.channel) return;

  const channel = newState.channel;

  const humanCount = channel.members.filter(
    m => !m.user.bot
  ).size;

  if (humanCount !== 1) return;

  const logChannel = await channel.guild.channels
    .fetch(DISCORD_VOCAL_LOG_CHANNEL_ID)
    .catch(() => null);

  if (!logChannel) return;

  try {
    await logChannel.send(
      `🔊 **Un vocal vient de commencer** : ${channel.name}`
    );
  } catch (err) {
    console.error("❌ Erreur vocal:", err.message);
  }
});

// =======================
// LOGIN
// =======================

client.login(process.env.DISCORD_TOKEN);