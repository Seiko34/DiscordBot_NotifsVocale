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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

// =======================
// REDIRECT CHECK
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

    // 🔍 Récupère le message du bot s’il existe
    const messages = await channel.messages.fetch({ limit: 10 });
    const botMessage = messages.find(
      (m) => m.author.id === client.user.id
    );

    const content = `📢 **URL actuelle de Tirexo :** ${cleanFinalUrl}`;

    // 🟢 Message déjà présent → édition si nécessaire
    if (botMessage) {
      if (botMessage.content !== content) {
        await botMessage.edit(content);
      }
      return;
    }

    // 🆕 Aucun message → création
    await channel.send(content);

  } catch (err) {
    console.error("❌ Erreur check redirect:", err.message);
  }
}

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

    const messages = await channel.messages.fetch({ limit: 20 });
    const botMessage = messages.find(
      m => m.author.id === client.user.id
    );

    if (botMessage) {
      if (!botMessage.content.includes(cleanFinalUrl)) {
        await botMessage.edit(
          `🎬 **URL actuelle de Movix :** ${cleanFinalUrl}`
        );
      }
      return;
    }

    await channel.send(
      `🎬 **URL actuelle de Movix :** ${cleanFinalUrl}`
    );

  } catch (err) {
    console.error("❌ Erreur check Movix:", err.message);
  }
}

// =======================
// BOT READY
// =======================

client.once("ready", () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);

  // Tirexo → toutes les 6h
  setTimeout(checkRedirectTirexo, 30_000);
  setInterval(checkRedirectTirexo, 6 * 60 * 60 * 1000);

  // Movix → 1 fois par jour
  setTimeout(checkRedirectMovix, 60_000);
  setInterval(checkRedirectMovix, 24 * 60 * 60 * 1000);
});

// =======================
// VOCAL NOTIFICATION 
// =======================

client.on("voiceStateUpdate", async (oldState, newState) => {
  // Entrée dans un vocal uniquement
  if (oldState.channel || !newState.channel) return;

  const channel = newState.channel;

  // Compter uniquement les humains
  const humanCount = channel.members.filter(
    m => !m.user.bot
  ).size;

  // On notifie UNIQUEMENT quand le 1er humain arrive
  if (humanCount !== 1) return;

  const logChannel = await channel.guild.channels
    .fetch(DISCORD_VOCAL_LOG_CHANNEL_ID)
    .catch(() => null);

  if (!logChannel) return;

  try {
    const msg = await logChannel.send(
      `🔊 **Un vocal vient de commencer** : ${channel.name}`
    );

    // Suppression auto après 48h
    setTimeout(() => {
      msg.delete().catch(() => {});
    }, 48 * 60 * 60 * 1000);

  } catch (err) {
    console.error("❌ Erreur vocal:", err);
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content !== "!refresh") return;

  // Supprimer la commande utilisateur
  await message.delete().catch(() => {});

  if (message.channel.id === DISCORD_TIREXO_CHANNEL_ID) {
    await refreshWithStatus(
      DISCORD_TIREXO_CHANNEL_ID,
      checkRedirectTirexo,
      "Tirexo"
    );
    return;
  }

  if (message.channel.id === DISCORD_MOVIX_CHANNEL_ID) {
    await refreshWithStatus(
      DISCORD_MOVIX_CHANNEL_ID,
      checkRedirectMovix,
      "Movix"
    );
    return;
  }
});

async function refreshWithStatus(channelId, checkFn, label) {
  const channel = await client.channels.fetch(channelId);

  // Cherche le message du bot
  const messages = await channel.messages.fetch({ limit: 10 });
  let botMessage = messages.find(
    (m) => m.author.id === client.user.id
  );

  // S’il existe, on met "check en cours"
  if (botMessage) {
    await botMessage.edit(`⏳ **Vérification de ${label} en cours...**`);
  }

  // Sinon, on crée un message temporaire
  if (!botMessage) {
    botMessage = await channel.send(
      `⏳ **Vérification de ${label} en cours...**`
    );
  }

  // Laisse respirer Discord (optionnel mais sain)
  await new Promise(res => setTimeout(res, 500));

  // Appel de la logique EXISTANTE (inchangée)
  await checkFn();
}


// =======================
// LOGIN
// =======================

client.login(process.env.DISCORD_TOKEN);
