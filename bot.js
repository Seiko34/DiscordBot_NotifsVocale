const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const fs = require("fs");

// =======================
// CONFIG
// =======================

const CHECK_TirexoURL = "https://www.tirexo.fit/";
const DISCORD_TIREXO_CHANNEL_ID = "1317225132019679372";
const TirexoURL_FILE = "./lastUrl_tirexo.txt";

const DISCORD_VOCAL_LOG_CHANNEL_ID = "1450145620131053742";

// =======================
// DISCORD CLIENT
// =======================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

// =======================
// MEMORY
// =======================

let lastDetectedUrl = null;
let isChecking = false;

if (fs.existsSync(TirexoURL_FILE)) {
  lastDetectedUrl = fs.readFileSync(TirexoURL_FILE, "utf8").trim();
}

// =======================
// REDIRECT CHECK
// =======================

async function checkRedirect() {
  if (isChecking) return;
  isChecking = true;

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

    // Récupère les messages récents du bot
    const messages = await channel.messages.fetch({ limit: 30 });
    const botMessages = messages.filter(
      m => m.author.id === client.user.id
    );

    // 🔎 Cherche un message qui contient EXACTEMENT l’URL actuelle
    const existingMessage = botMessages.find(
      m => m.content.includes(cleanFinalUrl)
    );

    // 🟢 CAS OK — message déjà présent avec la bonne URL → RIEN
    if (existingMessage) {
      lastDetectedUrl = cleanFinalUrl;
      fs.writeFileSync(TirexoURL_FILE, cleanFinalUrl, "utf8");
      return;
    }

    // 🔥 Sinon : suppression de TOUS les messages du bot
    for (const msg of botMessages.values()) {
      await msg.delete().catch(() => {});
    }

    // ✨ Nouveau message unique
    await channel.send(
      `📢 **URL actuelle détectée :** ${cleanFinalUrl}`
    );

    lastDetectedUrl = cleanFinalUrl;
    fs.writeFileSync(TirexoURL_FILE, cleanFinalUrl, "utf8");

  } catch (err) {
    console.error("❌ Erreur check redirect:", err.message);
  } finally {
    isChecking = false;
  }
}

// =======================
// BOT READY
// =======================

client.once("ready", () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);
  setTimeout(checkRedirect, 30_000);
  setInterval(checkRedirect, 6 * 60 * 60 * 1000);
});

// =======================
// VOCAL NOTIFICATION
// =======================

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (!oldState.channel && newState.channel) {
    const channel = newState.channel;
    const humanCount = channel.members.filter(m => !m.user.bot).size;

    if (humanCount === 1) {
      const logChannel = await channel.guild.channels
        .fetch(DISCORD_VOCAL_LOG_CHANNEL_ID)
        .catch(() => null);

      if (!logChannel) return;

      const msg = await logChannel.send(
        `🔊 **Un vocal vient de commencer** : <#${channel.id}>`
      );

      setTimeout(() => {
        msg.delete().catch(() => {});
      }, 48 * 60 * 60 * 1000);
    }
  }
});

// =======================
// LOGIN
// =======================

client.login(process.env.DISCORD_TOKEN);
