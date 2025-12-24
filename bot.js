const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// =======================
// CONFIG
// =======================

const TELEGRAM_URL = "https://t.me/s/tirexoofficiel";
const DISCORD_TIREXO_CHANNEL_ID = "1317225132019679372";
const DISCORD_VOCAL_LOG_CHANNEL_ID = "1450145620131053742";
const DOMAIN_FILE = "./lastDomain.txt";

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
// DOMAIN MEMORY
// =======================

let lastDetectedDomain = null;

// Charger le dernier domaine sauvegardé (si existant)
if (fs.existsSync(DOMAIN_FILE)) {
  lastDetectedDomain = fs.readFileSync(DOMAIN_FILE, "utf8").trim();
}

// =======================
// TELEGRAM CHECK
// =======================

async function checkTelegram() {
  try {
    const res = await axios.get(TELEGRAM_URL);
    const $ = cheerio.load(res.data);

    const firstPost = $(".tgme_widget_message").first();
    if (!firstPost.length) return;

    const text = firstPost
      .find(".tgme_widget_message_text")
      .text()
      .trim();

    if (!text) return;

    // Extraction du domaine (ex: tirexo.com)
    const match = text.match(
      /\b[a-z0-9-]+\.(com|net|org|xyz|lol|site|cc|io)\b/i
    );
    if (!match) return;

    const domain = match[0].toLowerCase();

    // Aucun changement → on sort
    if (domain === lastDetectedDomain) return;

    // Mise à jour mémoire + fichier
    lastDetectedDomain = domain;
    fs.writeFileSync(DOMAIN_FILE, domain);

    const discordChannel = await client.channels
      .fetch(DISCORD_TIREXO_CHANNEL_ID)
      .catch(() => null);

    if (!discordChannel) return;

    await discordChannel.send(
      `📢 **Nouveau nom de domaine détecté :** https://${domain}`
    );
  } catch (err) {
    console.error("❌ Erreur Telegram:", err.message);
  }
}

// =======================
// BOT READY
// =======================

client.once("ready", () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);

  // 1er check après 10s
  setTimeout(checkTelegram, 10_000);

  // Puis toutes les 24h
  setInterval(checkTelegram, 24 * 60 * 60 * 1000);
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
      const textChannel = await channel.guild.channels
        .fetch(DISCORD_VOCAL_LOG_CHANNEL_ID)
        .catch(() => null);

      if (!textChannel) return;

      try {
        const msg = await textChannel.send(
          `🔊 **Un vocal vient de commencer** : <#${channel.id}>`
        );

        // Suppression auto après 48h
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
