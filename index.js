const {
    Client,
    IntentsBitField,
    Partials,
    ApplicationCommandOptionType,
    REST,
    Routes,
    EmbedBuilder,
    Colors,
    ActivityType,
    MessageFlags
} = require('discord.js');
const cfonts = require('cfonts');
const fs = require('fs');

const client = new Client({
    fetchAllMembers: true,
    allowedMentions: {
        parse: ["roles", "users", "everyone"],
        repliedUser: false
    },
    partials: [
        'MESSAGE',
        'CHANNEL',
        'REACTION',
    ],
    intents: [
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageTyping,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildInvites,
        IntentsBitField.Flags.GuildIntegrations,
        IntentsBitField.Flags.GuildModeration,
        IntentsBitField.Flags.DirectMessages,
        IntentsBitField.Flags.DirectMessageTyping,
        IntentsBitField.Flags.GuildPresences,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildWebhooks,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.MessageContent
    ],
});

client.footer = 'Made by ThunderDoesDev';
client.settings = require('./config.json');
client.logger = require('./logger.js');
client.errors = require('./errors.js');
client.rgbFlashingIntervals = new Map();

client.once('ready', async () => {
    try {
        const banner = cfonts.render((`${client.settings.bot.botName}\nBy ${client.settings.bot.botOwner}`), {
            font: 'chrome',
            color: 'candy',
            align: 'center',
            gradient: ["red", "magenta"],
            lineHeight: 1
        });
        console.log(banner.string);
        client.logger.log("LOGGED IN", `${client.user.tag}`);
        setTimeout(() => {
            client.user.setPresence({
                activities: [{
                        name: client.settings.bot.botName,
                        type: ActivityType.Custom
                    },
                    {
                        name: `Made by ${client.settings.bot.botOwner}`,
                        type: ActivityType.Custom
                    }
                ]
            });
        }, 3000);
        const commands = [{
                name: 'start_rgb',
                description: 'Starts the RGB role flashing.'
            },
            {
                name: 'stop_rgb',
                description: 'Stops the RGB role from flashing.'
            },
            {
                name: 'add_color',
                description: 'Adds a custom color to the RGB role.',
                options: [{
                    name: 'color',
                    description: 'The color to add.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                }],
            },
            {
                name: 'list_colors',
                description: 'Lists the current colors of the RGB role.'
            },
            {
                name: 'remove_color',
                description: 'Removes a custom color from the RGB role.',
                options: [{
                    name: 'color',
                    description: 'The color to remove.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                }],
            },
            {
                name: 'add_role',
                description: 'Adds a role to the RGB role.',
                options: [{
                    name: 'role',
                    description: 'The role to add.',
                    type: ApplicationCommandOptionType.Role,
                    required: true,
                }],
            },
            {
                name: 'remove_role',
                description: 'Removes a role from the RGB role.',
                options: [{
                    name: 'role',
                    description: 'The role to remove.',
                    type: ApplicationCommandOptionType.Role,
                    required: true,
                }],
            },
            {
                name: 'list_roles',
                description: 'Lists the current roles of the RGB role.'
            },
            {
                name: 'rgb_delay',
                description: 'Sets the delay for the RGB role flashing.',
                options: [{
                    name: 'delay',
                    description: 'The delay for the RGB role flashing.',
                    type: ApplicationCommandOptionType.Number,
                    required: true,
                }],
            },
            {
                name: 'reset_rgb_delay',
                description: 'Resets the delay for the RGB role flashing.'
            },
            {
                name: 'help',
                description: 'Shows the help menu.'
            }
        ];
        setTimeout(async () => {
            const rest = new REST({
                version: '10'
            }).setToken(client.settings.bot.token);
            await rest.put(Routes.applicationCommands(client.user.id), {
                body: commands
            }).then(s => {
                client.logger.log(`EVENTS`, `Loaded (${client._eventsCount}) Events.`)
                client.logger.log(`REGISTERED COMMANDS`, `Loaded (${commands.length}) Slash Commands.`)
            }).catch(e => {
                client.logger.error(`Err registering slash -> ${e}`)
            })
        }, 3000) // when u hve lot commands best to raise this time a bit so u make sure it loaded all commands into the slashCmds array 
        restartRGB(client);
    } catch (error) {
        client.errors(error, true, interaction);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (!interaction.isCommand()) return;
        const {
            commandName
        } = interaction;
        if (commandName === 'start_rgb') {
            await startRGB(client, interaction);
        } else if (commandName === 'stop_rgb') {
            await stopRGB(client, interaction);
        } else if (commandName === 'add_color') {
            const color = interaction.options.getString('color');
            await addColor(client, interaction, color);
        } else if (commandName === 'list_colors') {
            await listColors(client, interaction);
        } else if (commandName === 'remove_color') {
            const color = interaction.options.getString('color');
            await removeColor(client, interaction, color);
        } else if (commandName === 'add_role') {
            const role = interaction.options.getRole('role');
            await addRole(client, interaction, role);
        } else if (commandName === 'remove_role') {
            const role = interaction.options.getRole('role');
            await removeRole(client, interaction, role);
        } else if (commandName === 'list_roles') {
            await listRoles(client, interaction);
        } else if (commandName === 'rgb_delay') {
            const delay = interaction.options.getNumber('delay');
            await setRGBDelay(client, interaction, delay);
        } else if (commandName === 'reset_rgb_delay') {
            await resetRGBDelay(client, interaction);
        } else if (commandName === 'help') {
            await help(client, interaction);
        }
    } catch (error) {
        client.errors(error, true, interaction);
    }
});

async function restartRGB(client) {
    try {
        for (const [guildId, guildConfig] of Object.entries(client.settings.guilds)) {
            if (guildConfig.status !== "running") continue;
            const guild = client.guilds.cache.get(guildId);
            if (!guild) continue;
            const { roles, colors, flashing } = guildConfig;
            const allColors = colors.defaultColors.concat(colors.customColors);
            for (const roleId of roles) {
                const role = guild.roles.cache.get(roleId);
                if (!role || !role.editable) continue;
                if (client.rgbFlashingIntervals.has(`${guildId}_${roleId}`)) continue;
                let i = 0;
                const interval = setInterval(() => {
                    role.setColor(allColors[i]).catch(console.error);
                    i = (i + 1) % allColors.length;
                }, flashing.delay);
                client.rgbFlashingIntervals.set(`${guildId}_${roleId}`, interval);
            }
        }
    } catch (error) {
        client.errors(error, true, interaction);
    }
}

async function startRGB(client, interaction) {
    try {
        const guildId = interaction.guild.id;
        const guildConfig = client.settings.guilds[guildId];
        guildConfig.status = "running";
        fs.writeFileSync('./config.json', JSON.stringify(client.settings, null, 4));
        if (!guildConfig || !guildConfig.roles.length) {
            const noRoles = new EmbedBuilder()  
                .setColor(Colors.Red)
                .setTitle(`No Roles Set`)
                .setDescription(`No roles set to flash in this guild.`)
                .setFooter({
                    text: client.footer
                })
            return interaction.reply({
                embeds: [noRoles],
                flags: MessageFlags.Ephemeral
            });
        }
        const {
            roles,
            colors,
            flashing
        } = guildConfig;
        const allColors = colors.defaultColors.concat(colors.customColors);
        for (const roleId of roles) {
            const role = interaction.guild.roles.cache.get(roleId);
            if (!role || !role.editable) continue;
            if (client.rgbFlashingIntervals.has(`${guildId}_${roleId}`)) continue;
            let i = 0;
            const interval = setInterval(() => {
                role.setColor(allColors[i]).catch(console.error);
                i = (i + 1) % allColors.length;
            }, flashing.delay);
            client.rgbFlashingIntervals.set(`${guildId}_${roleId}`, interval);
        }
        const startedRGB = new EmbedBuilder()   
            .setColor(Colors.Green)
            .setTitle(`RGB Started`)
            .setDescription(`RGB role flashing started for this guild!`)
            .setFooter({
                text: client.footer
            })
        interaction.reply({
            embeds: [startedRGB],
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        client.errors(error, true, interaction);
    }
}

async function stopRGB(client, interaction) {
    try {
        const guildId = interaction.guild.id;
        const guildConfig = client.settings.guilds[guildId];
        guildConfig.status = "stopped";
        fs.writeFileSync('./config.json', JSON.stringify(client.settings, null, 4));
        for (const [key, interval] of client.rgbFlashingIntervals) {
            if (key.startsWith(`${guildId}_`)) {
                clearInterval(interval);
                client.rgbFlashingIntervals.delete(key);
            }
        }
        const stoppedRGB = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle(`RGB Stopped`)
            .setDescription(`RGB role flashing stopped for this guild.`)
            .setFooter({
                text: client.footer
            })
        interaction.reply({
            embeds: [stoppedRGB],
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        client.errors(error, true, interaction);
    }
}

async function addColor(client, interaction, color) {
    try {
        const guildId = interaction.guild.id;
        const guildConfig = client.settings.guilds[guildId];
        guildConfig.colors.customColors.push(color);
        fs.writeFileSync('./config.json', JSON.stringify(client.settings, null, 4));
        const addedColor = new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle(`Color Added`)
            .setDescription(`Added color ${color} for RGB flashing in this guild.`)
            .setFooter({
                text: client.footer
            })
        interaction.reply({
            embeds: [addedColor],
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        client.errors(error, true, interaction);
    }
}

async function removeColor(client, interaction, color) {
    try {
        const guildId = interaction.guild.id;
        const guildConfig = client.settings.guilds[guildId];
        const index = guildConfig.colors.customColors.indexOf(color);
        if (index > -1) guildConfig.colors.customColors.splice(index, 1);
        fs.writeFileSync('./config.json', JSON.stringify(client.settings, null, 4));
        const removedColor = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle(`Color Removed`)
            .setDescription(`Removed color ${color} from RGB flashing in this guild.`)
            .setFooter({
                text: client.footer
            })
        interaction.reply({
            embeds: [removedColor],
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error(error);
    }
}

async function addRole(client, interaction, role) {
    try {
        const guildId = interaction.guild.id;
        const guildConfig = client.settings.guilds[guildId];
        if (!guildConfig.roles.includes(role.id)) {
            guildConfig.roles.push(role.id);
            fs.writeFileSync('./config.json', JSON.stringify(client.settings, null, 4));
        }   
        const addedRole = new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle(`Role Added`)
            .setDescription(`Added role ${role.name} for RGB flashing in this guild.`)
            .setFooter({
                text: client.footer
            })
        interaction.reply({
            embeds: [addedRole],
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        client.errors(error, true, interaction);
    }
}


async function removeRole(client, interaction, role) {
    try {
        const guildId = interaction.guild.id;
        const guildConfig = client.settings.guilds[guildId];
        const index = guildConfig.roles.indexOf(role.id);
        if (index > -1) guildConfig.roles.splice(index, 1);
        fs.writeFileSync('./config.json', JSON.stringify(client.settings, null, 4));
        const removedRole = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle(`Role Removed`)
            .setDescription(`Removed role ${role.name} from RGB flashing in this guild.`)
            .setFooter({
                text: client.footer
            })
        interaction.reply({
            embeds: [removedRole],
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        client.errors(error, true, interaction);
    }
}

async function listRoles(client, interaction) {
    try {
        const guildId = interaction.guild.id;
        const guildConfig = client.settings.guilds[guildId];
        const roles = guildConfig.roles.map(roleId => `<@&${roleId}>`).join(', ') || 'No roles configured.';
        const listRoles = new EmbedBuilder()
            .setColor(Colors.Blue)
            .setTitle(`List of Roles`)
            .setDescription(`Roles for RGB flashing: ${roles}`)
            .setFooter({
                text: client.footer
            })
        interaction.reply({
            embeds: [listRoles],
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        client.errors(error, true, interaction);
    }
}

async function listColors(client, interaction) {
    try {
        const guildId = interaction.guild.id;
        const guildConfig = client.settings.guilds[guildId];
        const {
            defaultColors,
            customColors
        } = guildConfig.colors;
        const defaultList = defaultColors.length ? defaultColors.join(', ') : 'No default colors.';
        const customList = customColors.length ? customColors.join(', ') : 'No custom colors.';
        const listColors = new EmbedBuilder()
            .setColor(Colors.Blue)
            .setTitle(`List of Colors`)
            .setDescription(`Default Colors: ${defaultList}\nCustom Colors: ${customList}`)
            .setFooter({
                text: client.footer
            })
        interaction.reply({
            embeds: [listColors],
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        client.errors(error, true, interaction);
    }
}

async function setRGBDelay(client, interaction, delay) {
    try {
        const guildId = interaction.guild.id;
        const guildConfig = client.settings.guilds[guildId];
        guildConfig.flashing.delay = delay;
        fs.writeFileSync('./config.json', JSON.stringify(client.settings, null, 4));
        const setDelay = new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle(`RGB Delay Set`)
            .setDescription(`RGB delay set to ${delay}ms for this guild.`)
            .setFooter({
                text: client.footer
            })
        interaction.reply({
            embeds: [setDelay],
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        client.errors(error, true, interaction);
    }
}

async function resetRGBDelay(client, interaction) {
    try {
        const guildId = interaction.guild.id;
        const guildConfig = client.settings.guilds[guildId];
        guildConfig.flashing.delay = 1000;
        fs.writeFileSync('./config.json', JSON.stringify(client.settings, null, 4));
        const resetDelay = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle(`RGB Delay Reset`)
            .setDescription(`RGB delay reset to 1000ms for this guild.`)
            .setFooter({
                text: client.footer
            })
        interaction.reply({
            embeds: [resetDelay],
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        client.errors(error, true, interaction);
    }
}

client.login(client.settings.bot.token);