const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const fs = require("fs");

// =======================
// CONFIG
// =======================

// URL DE RÉFÉRENCE (ancien domaine connu)
const CHECK_URL = "https://tirexo.city";

const DISCORD_TIREXO_CHANNEL_ID = "1317225132019679372";      // salon texte Tirexo
const DISCORD_VOCAL_LOG_CHANNEL_ID = "1450145620131053742";  // salon notif vocal
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

// Charger le dernier domaine sauvegardé
if (fs.existsSync(DOMAIN_FILE)) {
  lastDetectedDomain = fs.readFileSync(DOMAIN_FILE, "utf8").trim();
}

// =======================
// DOMAIN REDIRECT CHECK
// =======================

async function checkDomainRedirect() {
  try {
    const res = await axios.get(CHECK_URL, {
      maxRedirects: 5,
      timeout: 10000,
      validateStatus: null,
    });

    const finalUrl = res.request?.res?.responseUrl;
    if (!finalUrl) return;

    const finalDomain = new URL(finalUrl)
      .hostname
      .replace(/^www\./, "")
      .toLowerCase();

    // Aucun changement
    if (finalDomain === lastDetectedDomain) return;

    // Mise à jour mémoire + fichier
    lastDetectedDomain = finalDomain;
    fs.writeFileSync(DOMAIN_FILE, finalDomain, "utf8");

    const tirexoChannel = await client.channels
      .fetch(DISCORD_TIREXO_CHANNEL_ID)
      .catch(() => null);

    if (!tirexoChannel) return;

    await tirexoChannel.send(
      `📢 **Nouveau nom de domaine détecté :** https://${finalDomain}`
    );

  } catch (err) {
    console.error("❌ Erreur check domaine:", err.message);
  }
}

// =======================
// BOT READY
// =======================

client.once("ready", () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);

  // Premier check après 30 secondes
  setTimeout(checkDomainRedirect, 30_000);

  // Puis toutes les 6 heures
  setInterval(checkDomainRedirect, 6 * 60 * 60 * 1000);
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
