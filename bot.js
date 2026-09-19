require("dotenv").config();
const {
  Client, GatewayIntentBits, ChannelType, PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("ضع BOT_TOKEN في ملف .env");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const roles = [
  { name: "👑 Boss", color: 0x8b0000 },
  { name: "🥷 Co-Boss", color: 0x5b2c6f },
  { name: "💎 رتبة عليا", color: 0x3498db },
  { name: "🔫 عضو", color: 0x2ecc71 },
  { name: "🟢 متدرب", color: 0x95a5a6 },
  { name: "🤖 Bot", color: 0x5865f2 }
];

const layout = [
  {
    name: "🏴・شفره",
    channels: [
      ["📜・القوانين", "القوانين والتعليمات الأساسية."],
      ["📢・الإعلانات", "إعلانات القيادة."],
      ["💬・شات-العصابة", "الدردشة العامة."],
      ["📸・صور-العصابة", "صور ولقطات FiveM."]
    ]
  },
  {
    name: "🔫・العمليات",
    channels: [
      ["🎯・العمليات", "تنظيم العمليات."],
      ["🚗・السيارات", "معلومات السيارات."],
      ["📍・المواقع", "مواقع وتنسيق RP."],
      ["📦・التسليمات", "التسليمات والمهام."]
    ]
  },
  {
    name: "💰・الإدارة",
    channels: [
      ["💵・الخزنة", "إدارة الخزنة."],
      ["📦・المخزن", "إدارة المخزن."],
      ["📊・الحسابات", "الحسابات الداخلية."]
    ]
  },
  {
    name: "👑・القيادة",
    channels: [
      ["🔒・غرفة-القيادة", "خاص بالقيادة."],
      ["📋・قرارات-القيادة", "قرارات الإدارة."],
      ["👥・ترقية-الأعضاء", "الترقيات."],
      ["⚠️・المخالفات", "سجل المخالفات."]
    ]
  },
  {
    name: "🎙️・الصوتيات",
    voice: [
      "🔊・روم-العصابة",
      "🔊・العمليات",
      "🔊・الاجتماعات",
      "🔒・روم-القيادة",
      "💤・الخمول"
    ]
  }
];

async function getOrCreateRole(guild, data) {
  let role = guild.roles.cache.find(r => r.name === data.name);
  if (!role) role = await guild.roles.create({
    name: data.name,
    color: data.color,
    reason: "Shafra template setup"
  });
  return role;
}

async function getOrCreateCategory(guild, name) {
  let cat = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === name
  );
  if (!cat) cat = await guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    reason: "Shafra template setup"
  });
  return cat;
}

async function setupGuild(guild) {
  const createdRoles = {};
  for (const r of roles) createdRoles[r.name] = await getOrCreateRole(guild, r);

  for (const section of layout) {
    const category = await getOrCreateCategory(guild, section.name);

    for (const [name, topic] of (section.channels || [])) {
      let ch = guild.channels.cache.find(
        c => c.type === ChannelType.GuildText && c.name === name && c.parentId === category.id
      );
      if (!ch) ch = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: category.id,
        topic,
        reason: "Shafra template setup"
      });

      if (name === "📜・القوانين") {
        const embed = new EmbedBuilder()
          .setTitle("🏴 قوانين عصابة Shafra")
          .setDescription(
            "1. احترام أعضاء العصابة.\n" +
            "2. الالتزام بقوانين سيرفر FiveM.\n" +
            "3. عدم إفساد الـRP.\n" +
            "4. أوامر القيادة تُحترم داخل العصابة.\n" +
            "5. أي مخالفة تُرفع للقيادة."
          )
          .setFooter({ text: "Shafra" });
        await ch.send({ embeds: [embed] }).catch(() => {});
      }
    }

    for (const name of (section.voice || [])) {
      const exists = guild.channels.cache.find(
        c => c.type === ChannelType.GuildVoice && c.name === name && c.parentId === category.id
      );
      if (!exists) {
        await guild.channels.create({
          name,
          type: ChannelType.GuildVoice,
          parent: category.id,
          reason: "Shafra template setup"
        });
      }
    }
  }

  // صلاحيات القيادة: اخفاء قسم القيادة عن الجميع والسماح للرتب العليا.
  const leaderCategory = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === "👑・القيادة"
  );
  if (leaderCategory) {
    const everyone = guild.roles.everyone;
    await leaderCategory.permissionOverwrites.edit(everyone, {
      ViewChannel: false
    }).catch(() => {});

    for (const roleName of ["👑 Boss", "🥷 Co-Boss", "💎 رتبة عليا"]) {
      const role = createdRoles[roleName];
      if (role) {
        await leaderCategory.permissionOverwrites.edit(role, {
          ViewChannel: true,
          SendMessages: true,
          Connect: true,
          Speak: true
        }).catch(() => {});
      }
    }
  }

  return createdRoles;
}

client.once("ready", async () => {
  console.log(`تم تسجيل الدخول باسم ${client.user.tag}`);
  for (const guild of client.guilds.cache.values()) {
    try {
      await setupGuild(guild);
      console.log(`تم تجهيز: ${guild.name}`);
    } catch (e) {
      console.error(`فشل تجهيز ${guild.name}:`, e);
    }
  }
});

client.on("guildCreate", async guild => {
  try {
    await setupGuild(guild);
    console.log(`تم تجهيز السيرفر الجديد: ${guild.name}`);
  } catch (e) {
    console.error(e);
  }
});

client.login(token);
