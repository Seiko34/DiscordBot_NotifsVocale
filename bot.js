const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const fs = require("fs");

// =======================
// CONFIG
// =======================

// URL DE DÉPART À SURVEILLER
const CHECK_URL = "https://www.tirexo.fit/";

// Salons Discord
const DISCORD_TIREXO_CHANNEL_ID = "1317225132019679372";
const DISCORD_VOCAL_LOG_CHANNEL_ID = "1450145620131053742";

// Fichier mémoire
const URL_FILE = "./lastUrl.txt";
const MSG_FILE = "./lastMessageId.txt";

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

// Charger la dernière URL sauvegardée
if (fs.existsSync(URL_FILE)) {
  lastDetectedUrl = fs.readFileSync(URL_FILE, "utf8").trim();
}

let lastMessageId = fs.existsSync(MSG_FILE)
  ? fs.readFileSync(MSG_FILE, "utf8").trim()
  : null;

let isChecking = false;

// =======================
// REDIRECT CHECK
// =======================

async function checkRedirect() {
  if (isChecking) return;
  isChecking = true;

  try {
    const res = await axios.get(CHECK_URL, {
      maxRedirects: 10,
      timeout: 10000,
      validateStatus: null,
    });

    const finalUrl =
      res.request?.res?.responseUrl ||
      res.request?._redirectable?._currentUrl;

    if (!finalUrl) return;

    const cleanFinalUrl = finalUrl
      .toLowerCase()
      .replace(/\/$/, "");

    const channel = await client.channels
      .fetch(DISCORD_TIREXO_CHANNEL_ID)
      .catch(() => null);

    if (!channel) return;

    // 🔎 CAS 0 — première exécution (aucune URL en mémoire)
    if (!lastDetectedUrl) {
      const msg = await channel.send(
        `📢 **URL actuelle détectée :** ${cleanFinalUrl}`
      );

      lastDetectedUrl = cleanFinalUrl;
      lastMessageId = msg.id;

      fs.writeFileSync(URL_FILE, cleanFinalUrl, "utf8");
      fs.writeFileSync(MSG_FILE, msg.id, "utf8");
      return;
    }

    // 🟢 CAS 1 — URL identique → RIEN
    if (cleanFinalUrl === lastDetectedUrl) return;

    // 🔄 CAS 2 — URL différente → suppression + nouveau message
    if (lastMessageId) {
      const oldMsg = await channel.messages
        .fetch(lastMessageId)
        .catch(() => null);
      if (oldMsg) await oldMsg.delete().catch(() => {});
    }

    const newMsg = await channel.send(
      `📢 **Nouvelle URL détectée :** ${cleanFinalUrl}`
    );

    lastDetectedUrl = cleanFinalUrl;
    lastMessageId = newMsg.id;

    fs.writeFileSync(URL_FILE, cleanFinalUrl, "utf8");
    fs.writeFileSync(MSG_FILE, newMsg.id, "utf8");

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

  // Premier check après 30 secondes
  setTimeout(checkRedirect, 30_000);

  // Puis toutes les 6 heures
  setInterval(checkRedirect, 6 * 60 * 60 * 1000);
});

// =======================
// VOCAL NOTIFICATION
// =======================

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (!oldState.channel && newState.channel) {
    const channel = newState.channel;

    const humanCount = channel.members.filter(
      (m) => !m.user.bot
    ).size;

    if (humanCount === 1) {
      const logChannel = await channel.guild.channels
        .fetch(DISCORD_VOCAL_LOG_CHANNEL_ID)
        .catch(() => null);

      if (!logChannel) return;

      try {
        const msg = await logChannel.send(
          `🔊 **Un vocal vient de commencer** : <#${channel.id}>`
        );

        // Auto-suppression après 48h
        setTimeout(() => {
          msg.delete().catch(() => {});
        }, 48 * 60 * 60 * 1000);

      } catch (err) {
        console.error("❌ Erreur vocal:", err);
      }
    }
  }
});

// =======================
// LOGIN
// =======================

client.login(process.env.DISCORD_TOKEN);
