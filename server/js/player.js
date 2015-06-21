
var cls = require("./lib/class"),
        _ = require("underscore"),
        Messages = require("./message"),
        Utils = require("./utils"),
        Properties = require("./properties"),
        Formulas = require("./formulas"),
        check = require("./format").check,
        Types = require("../../shared/js/gametypes"),
        inventory = require("./inventory");

module.exports = Player = Character.extend({
    init: function (connection, worldServer, database) {
        var self = this;

        this.server = worldServer;
        this.mapServer;
        this.connection = connection;
        this.database = database;

        this._super(this.connection.id, "player", Types.Entities.WARRIOR, 0, 0, "");

        this.hasEnteredGame = false;
        this.isDead = false;
        this.haters = {};
        this.lastCheckpoint = null;
        this.formatChecker = new FormatChecker();
        this.disconnectTimeout = null;
        this.inventory = new Inventory();
        this.level = 0;

        this.connection.listen(function (message) {
            var action = parseInt(message[0]);

            log.debug("Received: " + message);
            if (!check(message)) {
                self.connection.close("Invalid " + Types.getMessageTypeAsString(action) + " message format: " + message);
                return;
            }

            if (!self.hasEnteredGame && action !== Types.Messages.HELLO) { // HELLO must be the first message
                self.connection.close("Invalid handshake message: " + message);
                return;
            }
            if (self.hasEnteredGame && !self.isDead && action === Types.Messages.HELLO) { // HELLO can be sent only once
                self.connection.close("Cannot initiate handshake twice: " + message);
                return;
            }

            self.resetTimeout();

            if (action === Types.Messages.HELLO) {
                var name = Utils.sanitize(message[1]);
                password = Utils.sanitize(message[2]);
                self.canPlay(name, password, function (playerData, inventoryData) {
                    if (playerData !== undefined) {
                        self.name = playerData.username;
                        self.map = playerData.map;
                        self.x = playerData.pos_x;
                        self.y = playerData.pos_y;
                        self.level = playerData.level;
                        self.hitPoints = playerData.hp;
                        self.kind = Types.Entities.WARRIOR;
                        self.equipWeapon(inventoryData["slot_15"]);
                        self.equipArmor(inventoryData["slot_16"]);
                        self.orientation = Utils.randomOrientation();
                        self.updateMaxHitPoints();
                        self.updateManaPoints(playerData.mp);
                        self.updateExpPoints(playerData.exp, playerData.level);
                        self.updatePosition();

                        self.server.addPlayer(self);
                        self.server.enter_callback(self);

                        self.send([Types.Messages.WELCOME, self.id, self.name, self.map, self.x, self.y, self.hitPoints, self.maxHitPoints, self.manaPoints, self.maxManaPoints, self.exp, self.maxExp, self.level, self.inventory.getSlot(15), self.inventory.getSlot(16)]);
                        self.hasEnteredGame = true;
                        self.isDead = false;

                        // set and send Inventory
                        for(var i = 1; i <= 14; i++) {
                            if(inventoryData["slot_" + i] === "") continue;
                            self.inventory.setSlot(i, inventoryData["slot_" + i]);
                            self.server.pushToPlayer(self, new Messages.InventoryUpdate(i, inventoryData["slot_" + i]));
                        }
                    } else {
                        self.connection.close("Invalid logindata message: " + message);
                    }
                });
            }
            else if (action === Types.Messages.WHO) {
                message.shift();
                self.mapServer.pushSpawnsToPlayer(self, message);
            }
            else if (action === Types.Messages.ZONE) {
                //self.zone_callback();
            }
            else if (action === Types.Messages.CHAT) {
                var msg = Utils.sanitize(message[1]);
                var chatMsg = Utils.createChatMsg(self.name, msg);
                // Sanitized messages may become empty. No need to broadcast empty chat messages.
                if (chatMsg && chatMsg !== "") {
                    self.broadcast(new Messages.Chat(chatMsg), false);
                }
                self.database.logChatMsg({username: self.name, msg: msg})
            }
            else if (action === Types.Messages.MOVE) {
                if (self.move_callback) {
                    var x = message[1],
                            y = message[2];
                    
                    if (self.mapServer.isValidPosition(x, y)) {
                        self.setPosition(x, y);
                        self.clearTarget();
                       
                        self.mapServer.broadcast(new Messages.Move(self));
                        self.move_callback(self.x, self.y);
                    }
                    
                }
            }
            else if (action === Types.Messages.LOOTMOVE) {
                if (self.lootmove_callback) {
                    self.setPosition(message[1], message[2]);

                    var item = self.mapServer.getEntityById(message[3]);
                    if (item) {
                        self.clearTarget();

                        self.mapServer.broadcast(new Messages.LootMove(self, item));
                        self.lootmove_callback(self.x, self.y);
                    }
                }
            }
            else if (action === Types.Messages.AGGRO) {
                if (self.move_callback) {
                    self.mapServer.handleMobHate(message[1], self.id, 5);
                }
            }
            else if (action === Types.Messages.ATTACK) {
                var mob = self.mapServer.getEntityById(message[1]);

                if (mob) {
                    self.setTarget(mob);
                    self.mapServer.broadcastAttacker(self);
                }
            }
            else if (action === Types.Messages.HIT) {
                var mob = self.mapServer.getEntityById(message[1]);
                if (mob) {
                    var dmg = Formulas.dmg(self.weaponLevel, mob.armorLevel);

                    if (dmg > 0) {
                        mob.receiveDamage(dmg, self.id);
                        self.mapServer.handleMobHate(mob.id, self.id, dmg);
                        self.mapServer.handleHurtEntity(mob, self, dmg);
                    }
                }
            }
            else if (action === Types.Messages.HURT) {
                var mob = self.mapServer.getEntityById(message[1]);
                if (mob && self.hitPoints > 0) {
                    self.hitPoints -= Formulas.dmg(mob.weaponLevel, self.armorLevel);
                    self.mapServer.handleHurtEntity(self);

                    if (self.hitPoints <= 0) {
                        self.isDead = true;
                        if (self.firepotionTimeout) {
                            clearTimeout(self.firepotionTimeout);
                        }
                    }
                }
            }
            else if (action === Types.Messages.LOOT) {
                var item = self.mapServer.getEntityById(message[1]);
                
                if (item) {
                    var kind = item.kind;

                    if (Types.isItem(kind)) {
                        //if(item.x === self.x && item.y === self.y) { // TODO:: include position check (Message to slow?)
                            var freeSlot = self.inventory.getFreeSlot();
                            if(freeSlot === undefined) return;
                            self.mapServer.broadcast(item.despawn());
                            self.mapServer.removeEntity(item);
                            self.inventory.setSlot(freeSlot, kind);
                            self.server.pushToPlayer(self, new Messages.InventoryUpdate(freeSlot, kind));
                        //}
                        
                        

//                        if (kind === Types.Entities.FIREPOTION) {
//                            self.updateHitPoints();
//                            self.broadcast(self.equip(Types.Entities.FIREFOX));
//                            self.firepotionTimeout = setTimeout(function () {
//                                self.broadcast(self.equip(self.armor)); // return to normal after 15 sec
//                                self.firepotionTimeout = null;
//                            }, 15000);
//                            self.send(new Messages.HitPoints(self.maxHitPoints).serialize());
//                        } else if (Types.isHealingItem(kind)) {
//                            var amount;
//
//                            switch (kind) {
//                                case Types.Entities.FLASK:
//                                    amount = 40;
//                                    break;
//                                case Types.Entities.BURGER:
//                                    amount = 100;
//                                    break;
//                            }
//
//                            if (!self.hasFullHealth()) {
//                                self.regenHealthBy(amount);
//                                self.server.pushToPlayer(self, self.health());
//                            }
//                        } else if (Types.isArmor(kind) || Types.isWeapon(kind)) {
//                            self.equipItem(item);
//                            self.broadcast(self.equip(kind));
//                        }
                    }
                }
            }
            else if (action === Types.Messages.TELEPORT) {
                var x = message[1],
                        y = message[2];

                if (self.mapServer.isValidPosition(x, y)) {
                    self.setPosition(x, y);
                    self.clearTarget();

                    self.broadcast(new Messages.Teleport(self));

                    self.mapServer.handlePlayerVanish(self);
                    self.mapServer.pushRelevantEntityListTo(self);
                }
            }
            else if (action === Types.Messages.OPEN) {
                var chest = self.mapServer.getEntityById(message[1]);
                if (chest && chest instanceof Chest) {
                    self.mapServer.handleOpenedChest(chest, self);
                }
            }
            else if (action === Types.Messages.CHECK) {
                var checkpoint = self.mapServer.map.getCheckpoint(message[1]);
                if (checkpoint) {
                    self.lastCheckpoint = checkpoint;
                }
            } 
            else if (action === Types.Messages.USEITEM) {
                var slot = message[1];
                var itemId = self.inventory.getSlot(slot);
                if(Types.isUsableItem(parseInt(itemId.split(':')[0]))) {
                    var amount = 0;
                    switch (parseInt(itemId.split(':')[0])) {
                        case Types.Entities.FLASK:
                            amount = 40;
                            break;
                        case Types.Entities.BURGER:
                            amount = 100;
                            break;
                    }
                    if (!self.hasFullHealth()) {
                        self.inventory.setSlot(slot, "");
                        self.regenHealthBy(amount);
                        self.server.pushToPlayer(self, self.health());
                        self.server.pushToPlayer(self, new Messages.InventoryUpdate(slot, ""));
                    }
                }
            }
            else if (action === Types.Messages.DELETEITEM) {
                var slot = message[1];
                self.inventory.setSlot(slot, "");
                self.server.pushToPlayer(self, new Messages.InventoryUpdate(slot, ""));
            }
            else if (action === Types.Messages.EQUIPITEM) {
                var slot = message[1];
                var itemId = self.inventory.getSlot(slot);
                if(Types.isEquipmentItem(parseInt(itemId.split(':')[0]))) {
                    if(Types.isArmor(parseInt(itemId.split(':')[0]))) {
                        self.armorLevel = Properties.getArmorLevel(parseInt(itemId.split(':')[0]));
                        self.inventory.switchSlots(slot, 16);
                        self.updateMaxHitPoints();
                        self.server.pushToPlayer(self, new Messages.HitPoints(self.maxHitPoints));
                        self.server.pushToPlayer(self, new Messages.InventoryUpdate(16, itemId));
                    } else {
                        self.weaponLevel = Properties.getWeaponLevel(parseInt(itemId.split(':')[0]));
                        self.inventory.switchSlots(slot, 15);
                        self.server.pushToPlayer(self, new Messages.InventoryUpdate(15, itemId));
                    }
                    self.server.pushToPlayer(self, new Messages.InventoryUpdate(slot, self.inventory.getSlot(slot)));
                    self.server.pushToPlayer(self, self.equip(parseInt(itemId.split(':')[0]))); // TODO:: include in function InventoryUpdate on clients
                }
            }
            else if (action === Types.Messages.SWITCHITEM) {
                var slotA = message[1];
                var slotB = message[2];
                self.inventory.switchSlots(slotA, slotB);
                self.server.pushToPlayer(self, new Messages.InventoryUpdate(slotA, self.inventory.getSlot(slotA)));
                self.server.pushToPlayer(self, new Messages.InventoryUpdate(slotB, self.inventory.getSlot(slotB)));
            }
            else {
                if (self.message_callback) {
                    self.message_callback(message);
                }
            }
        });

        this.connection.onClose(function () {
            if (self.firepotionTimeout) {
                clearTimeout(self.firepotionTimeout);
            }
            clearTimeout(self.disconnectTimeout);
            if (self.exit_callback) {
                self.exit_callback();
            }
        });

        this.connection.sendUTF8("go"); // Notify client that the HELLO/WELCOME handshake can start
    },
    destroy: function () {
        var self = this;

        this.forEachAttacker(function (mob) {
            mob.clearTarget();
        });
        this.attackers = {};

        this.forEachHater(function (mob) {
            mob.forgetPlayer(self.id);
        });
        this.haters = {};
    },
    canPlay: function (username, password, callback) {
        return this.database.canPlay(username, password, callback);
    },
    save: function () {
        this.database.savePlayerData(this);
    },
    getState: function () {
        var basestate = this._getBaseState(),
                state = [this.name, this.orientation, parseInt(this.inventory.getSlot(16).split(':')[0]), parseInt(this.inventory.getSlot(15).split(':')[0]), this.level];

        if (this.target) {
            state.push(this.target);
        }

        return basestate.concat(state);
    },
    send: function (message) {
        this.connection.send(message);
    },
    broadcast: function (message, ignoreSelf) {
        if (this.broadcast_callback) {
            this.broadcast_callback(message, ignoreSelf === undefined ? true : ignoreSelf);
        }
    },
    broadcastToZone: function (message, ignoreSelf) {
        if (this.broadcastzone_callback) {
            this.broadcastzone_callback(message, ignoreSelf === undefined ? true : ignoreSelf);
        }
    },
    onExit: function (callback) {
        this.exit_callback = callback;
    },
    onMove: function (callback) {
        this.move_callback = callback;
    },
    onLootMove: function (callback) {
        this.lootmove_callback = callback;
    },
    onZone: function (callback) {
        this.zone_callback = callback;
    },
    onOrient: function (callback) {
        this.orient_callback = callback;
    },
    onMessage: function (callback) {
        this.message_callback = callback;
    },
    onBroadcast: function (callback) {
        this.broadcast_callback = callback;
    },
    onBroadcastToZone: function (callback) {
        this.broadcastzone_callback = callback;
    },
    equip: function (item) {
        return new Messages.EquipItem(this, item);
    },
    addHater: function (mob) {
        if (mob) {
            if (!(mob.id in this.haters)) {
                this.haters[mob.id] = mob;
            }
        }
    },
    removeHater: function (mob) {
        if (mob && mob.id in this.haters) {
            delete this.haters[mob.id];
        }
    },
    forEachHater: function (callback) {
        _.each(this.haters, function (mob) {
            callback(mob);
        });
    },
    equipArmor: function (kind) {
        this.inventory.setSlot(16, kind);
        this.armorLevel = Properties.getArmorLevel(parseInt(kind.split(':')[0]));
    },
    equipWeapon: function (kind) {
        this.inventory.setSlot(15, kind);
        this.weaponLevel = Properties.getWeaponLevel(parseInt(kind.split(':')[0]));
    },
    equipItem: function (item) {
        if (item) {
            log.debug(this.name + " equips " + Types.getKindAsString(item.kind));

            if (Types.isArmor(item.kind)) {
                this.equipArmor(item.kind);
                this.updateHitPoints();
                this.send(new Messages.HitPoints(this.maxHitPoints).serialize());
            } else if (Types.isWeapon(item.kind)) {
                this.equipWeapon(item.kind);
            }
        }
    },
    tryLevelUp: function (points) {
        this.exp += points;
        if (this.maxExp <= this.exp) {
            this.updateExpPoints((this.exp - this.maxExp), (this.level + 1));
            this.server.pushToPlayer(this, new Messages.Level(this.exp, this.maxExp, this.level));
        }
    },
    updateHitPoints: function () {
        this.resetHitPoints(Formulas.hp(this.armorLevel));
    },
    updateMaxHitPoints: function () {
        this.setMaxHitPoints(Formulas.hp(this.armorLevel));
    },
    updateManaPoints: function (currentMana) {
        this.resetManaPoints(currentMana);
    },
    updateExpPoints: function (currentExp, level) {
        this.resetExpPoints(currentExp, level);
    },
    updatePosition: function () {
        if (this.requestpos_callback) {
            var pos = this.requestpos_callback();
            this.setPosition(pos.x, pos.y);
        }
    },
    onRequestPosition: function (callback) {
        this.requestpos_callback = callback;
    },
    resetTimeout: function () {
        clearTimeout(this.disconnectTimeout);
        this.disconnectTimeout = setTimeout(this.timeout.bind(this), 1000 * 60 * 15); // 15 min.
    },
    timeout: function () {
        this.connection.sendUTF8("timeout");
        this.connection.close("Player was idle for too long");
    }
});