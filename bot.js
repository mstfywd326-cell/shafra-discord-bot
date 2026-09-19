require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  SlashCommandBuilder
} = require("discord.js");

const { Player, useQueue } = require("discord-player");
const { DefaultExtractors } = require("@discord-player/extractor");
const http = require("http");
const fs = require("fs");
const path = require("path");

const token = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 10000;

if (!token) throw new Error("BOT_TOKEN غير موجود في متغيرات البيئة");

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Shafra Bot is online");
}).listen(PORT);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const player = new Player(client);

// ==================== الملفات والإعدادات ====================

const dataDir = path.join(__dirname, "data");
const configFile = path.join(dataDir, "config.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(configFile)) {
  fs.writeFileSync(configFile, "{}");
}

function readConfigs() {
  try {
    return JSON.parse(fs.readFileSync(configFile, "utf8") || "{}");
  } catch {
    return {};
  }
}

function saveConfigs(data) {
  fs.writeFileSync(configFile, JSON.stringify(data, null, 2));
}

function getConfig(guildId) {
  const data = readConfigs();

  if (!data[guildId]) {
    data[guildId] = {
      welcomeEnabled: true,
      welcomeChannelId: null,
      traineeRoleId: null,
      musicTextChannelId: null,
      musicAllChannels: false,
      welcomeMessage:
        "هلا وغلا {user} 👋\nنورت سيرفر **{server}** ❤️\nتم إعطاؤك رتبة **{role}**."
    };

    saveConfigs(data);
  }

  return data[guildId];
}

function updateConfig(guildId, changes) {
  const data = readConfigs();

  data[guildId] = {
    ...getConfig(guildId),
    ...changes
  };

  saveConfigs(data);
  return data[guildId];
}

// ==================== رتب شفره ====================

const roles = [
  { name: "👑 Boss", color: 0x8b0000 },
  { name: "🥷 Co-Boss", color: 0x5b2c6f },
  { name: "💎 رتبة عليا", color: 0x3498db },
  { name: "🔫 عضو", color: 0x2ecc71 },
  { name: "🟢 متدرب", color: 0x95a5a6 },
  { name: "🤖 Bot", color: 0x5865f2 }
];

// ==================== قنوات شفره ====================

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

// ==================== إنشاء الرتب والقنوات ====================

async function getOrCreateRole(guild, data) {
  let role = guild.roles.cache.find(r => r.name === data.name);

  if (!role) {
    role = await guild.roles.create({
      name: data.name,
      color: data.color,
      reason: "Shafra setup"
    });
  }

  return role;
}

async function getOrCreateCategory(guild, name) {
  let category = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildCategory &&
      c.name === name
  );

  if (!category) {
    category = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory,
      reason: "Shafra setup"
    });
  }

  return category;
}

async function setupGuild(guild) {
  const createdRoles = {};

  for (const roleData of roles) {
    createdRoles[roleData.name] =
      await getOrCreateRole(guild, roleData);
  }

  for (const section of layout) {
    const category =
      await getOrCreateCategory(guild, section.name);

    for (const [name, topic] of section.channels || []) {
      let channel = guild.channels.cache.find(
        c =>
          c.type === ChannelType.GuildText &&
          c.name === name &&
          c.parentId === category.id
      );

      if (!channel) {
        channel = await guild.channels.create({
          name,
          type: ChannelType.GuildText,
          parent: category.id,
          topic,
          reason: "Shafra setup"
        });
      }

      if (name === "📜・القوانين") {
        const messages =
          await channel.messages.fetch({ limit: 5 }).catch(() => null);

        if (messages && messages.size === 0) {
          const embed = new EmbedBuilder()
            .setTitle("🏴 قوانين عصابة Shafra")
            .setDescription(
              "1. احترام أعضاء العصابة.\n" +
              "2. الالتزام بقوانين سيرفر FiveM.\n" +
              "3. عدم إفساد الـRP.\n" +
              "4. أوامر القيادة تُحترم.\n" +
              "5. المخالفات تُرفع للقيادة."
            )
            .setFooter({ text: "Shafra" });

          await channel.send({
            embeds: [embed]
          }).catch(() => {});
        }
      }
    }

    for (const name of section.voice || []) {
      const exists = guild.channels.cache.find(
        c =>
          c.type === ChannelType.GuildVoice &&
          c.name === name &&
          c.parentId === category.id
      );

      if (!exists) {
        await guild.channels.create({
          name,
          type: ChannelType.GuildVoice,
          parent: category.id,
          reason: "Shafra setup"
        });
      }
    }
  }

  const leaderCategory = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildCategory &&
      c.name === "👑・القيادة"
  );

  if (leaderCategory) {
    await leaderCategory.permissionOverwrites.edit(
      guild.roles.everyone,
      {
        ViewChannel: false
      }
    ).catch(() => {});

    for (const roleName of [
      "👑 Boss",
      "🥷 Co-Boss",
      "💎 رتبة عليا"
    ]) {
      const role = createdRoles[roleName];

      if (role) {
        await leaderCategory.permissionOverwrites.edit(
          role,
          {
            ViewChannel: true,
            SendMessages: true,
            Connect: true,
            Speak: true
          }
        ).catch(() => {});
      }
    }
  }

  const cfg = getConfig(guild.id);

  if (!cfg.traineeRoleId && createdRoles["🟢 متدرب"]) {
    updateConfig(guild.id, {
      traineeRoleId: createdRoles["🟢 متدرب"].id
    });
  }

  return createdRoles;
}

// ==================== أوامر البوت ====================

const commands = [
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("لوحة إعدادات Shafra")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("تجهيز رتب وقنوات Shafra")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  new SlashCommandBuilder()
    .setName("play")
    .setDescription("تشغيل موسيقى")
    .addStringOption(option =>
      option
        .setName("query")
        .setDescription("اسم الأغنية أو الرابط")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("تخطي الأغنية"),

  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("إيقاف مؤقت"),

  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("استئناف الموسيقى"),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("إيقاف الموسيقى"),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("عرض قائمة الانتظار"),

  new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("عرض الأغنية الحالية"),

  new SlashCommandBuilder()
    .setName("volume")
    .setDescription("تغيير مستوى الصوت")
    .addIntegerOption(option =>
      option
        .setName("level")
        .setDescription("من 0 إلى 100")
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)
    )
].map(command => command.toJSON());
async function registerCommands() {
  for (const guild of client.guilds.cache.values()) {
    await guild.commands.set(commands).catch(error => {
      console.error(
        `فشل تسجيل الأوامر في ${guild.name}:`,
        error
      );
    });
  }
}

// ==================== لوحة الإعدادات ====================

function panelEmbed(guild) {
  const cfg = getConfig(guild.id);

  const welcomeChannel = cfg.welcomeChannelId
    ? `<#${cfg.welcomeChannelId}>`
    : "غير محددة";

  const traineeRole = cfg.traineeRoleId
    ? `<@&${cfg.traineeRoleId}>`
    : "غير محددة";

  const musicChannel = cfg.musicTextChannelId
    ? `<#${cfg.musicTextChannelId}>`
    : "غير محددة";

  return new EmbedBuilder()
    .setTitle("⚙️ لوحة إعدادات Shafra")
    .setDescription(
      `**👋 الترحيب:** ${
        cfg.welcomeEnabled ? "🟢 مفعل" : "🔴 متوقف"
      }\n` +
      `**📢 قناة الترحيب:** ${welcomeChannel}\n` +
      `**🟢 رتبة المتدرب:** ${traineeRole}\n` +
      `**🎵 قناة الموسيقى:** ${musicChannel}\n` +
      `**🎵 الموسيقى بكل القنوات:** ${
        cfg.musicAllChannels ? "🟢 نعم" : "🔴 لا"
      }\n\n` +
      "استخدم الأزرار والقوائم بالأسفل للتعديل."
    )
    .setFooter({
      text: "Shafra • إعدادات السيرفر"
    });
}

function panelRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("welcome_toggle")
        .setLabel("تشغيل/إيقاف الترحيب")
        .setEmoji("👋")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("welcome_message")
        .setLabel("رسالة الترحيب")
        .setEmoji("✏️")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("auto_setup")
        .setLabel("تجهيز تلقائي")
        .setEmoji("🛠️")
        .setStyle(ButtonStyle.Success)
    ),

    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId("trainee_role")
        .setPlaceholder("اختر رتبة المتدرب")
        .setMinValues(1)
        .setMaxValues(1)
    ),

    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("welcome_channel")
        .setPlaceholder("اختر قناة الترحيب")
        .setChannelTypes(ChannelType.GuildText)
        .setMinValues(1)
        .setMaxValues(1)
    ),

    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("music_channel")
        .setPlaceholder("اختر قناة أوامر الموسيقى")
        .setChannelTypes(ChannelType.GuildText)
        .setMinValues(1)
        .setMaxValues(1)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("music_all")
        .setLabel("السماح بالموسيقى بكل القنوات")
        .setEmoji("🎵")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("welcome_reset")
        .setLabel("إرجاع رسالة الترحيب")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

// ==================== الترحيب ====================

function renderWelcome(text, member, role) {
  return text
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{server}", member.guild.name)
    .replaceAll(
      "{role}",
      role ? `<@&${role.id}>` : "متدرب"
    );
}

// ==================== تشغيل البوت ====================

client.once("ready", async () => {
  console.log(
    `✅ تم تسجيل الدخول باسم ${client.user.tag}`
  );

  try {
    await player.extractors.loadMulti(
      DefaultExtractors
    );

    console.log("🎵 تم تحميل مصادر الموسيقى.");
  } catch (error
            // ==================== نهاية أوامر الموسيقى ====================
      }

      // ==================== أزرار لوحة التحكم ====================

      if (interaction.isButton()) {
        if (
          !interaction.memberPermissions?.has(
            PermissionFlagsBits.ManageGuild
          )
        ) {
          return interaction.reply({
            content:
              "❌ تحتاج صلاحية إدارة السيرفر.",
            ephemeral: true
          });
        }

        const guildId = interaction.guild.id;
        const cfg = getConfig(guildId);

        // تشغيل / إيقاف الترحيب
        if (
          interaction.customId ===
          "welcome_toggle"
        ) {
          updateConfig(guildId, {
            welcomeEnabled:
              !cfg.welcomeEnabled
          });

          const newCfg = getConfig(guildId);

          return interaction.update({
            embeds: [
              panelEmbed(interaction.guild)
            ],
            components: panelRows()
          });
        }

        // رسالة الترحيب
        if (
          interaction.customId ===
          "welcome_message"
        ) {
          const modal =
            new ModalBuilder()
              .setCustomId(
                "welcome_message_modal"
              )
              .setTitle(
                "✏️ تعديل رسالة الترحيب"
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                "welcome_message_input"
              )
              .setLabel(
                "اكتب رسالة الترحيب"
              )
              .setStyle(
                TextInputStyle.Paragraph
              )
              .setRequired(true)
              .setMaxLength(1000)
              .setValue(
                cfg.welcomeMessage
              );

          modal.addComponents(
            new ActionRowBuilder().addComponents(
              input
            )
          );

          return interaction.showModal(
            modal
          );
        }

        // التجهيز التلقائي
        if (
          interaction.customId ===
          "auto_setup"
        ) {
          await interaction.deferUpdate();

          try {
            const created =
              await setupGuild(
                interaction.guild
              );

            const trainee =
              created["🟢 متدرب"];

            const welcome =
              interaction.guild.channels.cache.find(
                c =>
                  c.type ===
                    ChannelType.GuildText &&
                  (
                    c.name ===
                      "👋・ترحيب" ||
                    c.name.includes("ترحيب")
                  )
              );

            updateConfig(
              guildId,
              {
                traineeRoleId:
                  trainee?.id ||
                  cfg.traineeRoleId,

                welcomeChannelId:
                  welcome?.id ||
                  cfg.welcomeChannelId
              }
            );

            return interaction.editReply({
              embeds: [
                panelEmbed(
                  interaction.guild
                )
              ],
              components: panelRows()
            });
          } catch (error) {
            console.error(error);

            return interaction.editReply({
              content:
                "❌ حدث خطأ أثناء التجهيز.",
              embeds: [],
              components: []
            });
          }
        }

        // السماح بالموسيقى بكل القنوات
        if (
          interaction.customId ===
          "music_all"
        ) {
          updateConfig(guildId, {
            musicAllChannels:
              !cfg.musicAllChannels
          });

          return interaction.update({
            embeds: [
              panelEmbed(interaction.guild)
            ],
            components: panelRows()
          });
        }

        // إعادة رسالة الترحيب الافتراضية
        if (
          interaction.customId ===
          "welcome_reset"
        ) {
          updateConfig(guildId, {
            welcomeMessage:
              "هلا وغلا {user} 👋\nنورت سيرفر **{server}** ❤️\nتم إعطاؤك رتبة **{role}**."
          });

          return interaction.update({
            embeds: [
              panelEmbed(interaction.guild)
            ],
            components: panelRows()
          });
        }
      }

      // ==================== القوائم ====================

      if (
        interaction.isRoleSelectMenu()
      ) {
        if (
          interaction.customId ===
          "trainee_role"
        ) {
          if (
            !interaction.memberPermissions?.has(
              PermissionFlagsBits.ManageGuild
            )
          ) {
            return interaction.reply({
              content:
                "❌ تحتاج صلاحية إدارة السيرفر.",
              ephemeral: true
            });
          }

          const roleId =
            interaction.values[0];

          updateConfig(
            interaction.guild.id,
            {
              traineeRoleId: roleId
            }
          );

          return interaction.update({
            embeds: [
              panelEmbed(interaction.guild)
            ],
            components: panelRows()
          });
        }
      }

      if (
        interaction.isChannelSelectMenu()
      ) {
        if (
          !interaction.memberPermissions?.has(
            PermissionFlagsBits.ManageGuild
          )
        ) {
          return interaction.reply({
            content:
              "❌ تحتاج صلاحية إدارة السيرفر.",
            ephemeral: true
          });
        }

        const channelId =
          interaction.values[0];

        // قناة الترحيب
        if (
          interaction.customId ===
          "welcome_channel"
        ) {
          updateConfig(
            interaction.guild.id,
            {
              welcomeChannelId:
                channelId
            }
          );

          return interaction.update({
            embeds: [
              panelEmbed(interaction.guild)
            ],
            components: panelRows()
          });
        }

        // قناة الموسيقى
        if (
          interaction.customId ===
          "music_channel"
        ) {
          updateConfig(
            interaction.guild.id,
            {
              musicTextChannelId:
                channelId
            }
          );

          return interaction.update({
            embeds: [
              panelEmbed(interaction.guild)
            ],
            components: panelRows()
          });
        }
      }

      // ==================== مودال رسالة الترحيب ====================

      if (
        interaction.isModalSubmit() &&
        interaction.customId ===
          "welcome_message_modal"
      ) {
        const message =
          interaction.fields.getTextInputValue(
            "welcome_message_input"
          );

        updateConfig(
          interaction.guild.id,
          {
            welcomeMessage: message
          }
        );

        return interaction.reply({
          content:
            "✅ تم حفظ رسالة الترحيب الجديدة.",
          embeds: [
            panelEmbed(interaction.guild)
          ],
          components: panelRows(),
          ephemeral: true
        });
      }

    } catch (error) {
      console.error(
        "❌ Interaction Error:",
        error
      );

      if (
        interaction.replied ||
        interaction.deferred
      ) {
        await interaction.followUp({
          content:
            "❌ حدث خطأ غير متوقع.",
          ephemeral: true
        }).catch(() => {});
      } else {
        await interaction.reply({
          content:
            "❌ حدث خطأ غير متوقع.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);

// ==================== تسجيل الدخول ====================

client.login(token);
