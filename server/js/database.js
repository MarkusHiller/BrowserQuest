var cls = require("./lib/class"),
        mysql = require('mysql'),
        md5 = require("MD5");

var DB = exports = module.exports = cls.Class.extend({
    init: function () {
        var host = 'localhost',
                user = 'root',
                password = '',
                database = 'browserquest';

        this.connectionOptions = {
            host: host,
            user: user,
            password: password,
            database: database
        };
        
//        this.databaseSchema = {
//            database: 'browserquest',
//            tables: [
//                {
//                    name: 'users',
//                    felds: [
//                        {name: 'ID', type: 'INT'},
//                        {name: 'username', type: 'VARCHAR(32)'}
//                    ]
//                }
//            ]
//        };
    },
    canPlay: function (name, password, callback) {
        var self = this;
        var pwHash = md5(password);
        var connection = mysql.createConnection(this.connectionOptions);
        var playerData,
                inventoryData;
        connection.query('SELECT * from users WHERE username = "' + name + '" AND password = "' + pwHash + '"', function (err, rows, fields) {
            if (!err) {
                playerData = rows[0];
                connection.query('SELECT * from inventories WHERE username = "' + name + '"', function (err, rows, fields) {
                    if (!err) {
                        inventoryData = rows[0];
                        callback(playerData, inventoryData);
                    } else {
                        log.debug('Error while performing Query. ' + err);
                    }
                    connection.end();
                });
            } else {
                log.debug('Error while performing Query. ' + err);
                connection.end();
            }
        });
    },
    tryRegisterUser: function (obj, callback) {
        var hasError = false;
        var pwHash = md5(obj.password);
        var values = {
            username: obj.username,
            password: pwHash,
            email: obj.email
        };
        var inventoryValues = {
            username: obj.username
        };
        var connection = mysql.createConnection(this.connectionOptions);
        connection.query('INSERT INTO users SET ?', values, function (err, result) {
            if (!err) {
                connection.query('INSERT INTO inventories SET ?', inventoryValues, function (err, result) {
                    if (!err) {
                        callback("register_success");
                    } else {
                        callback("register_fail");
                        log.debug('Error while performing Query. ' + err);
                    }
                    connection.end();
                });
            } else {
                log.debug('Error while performing Query. ' + err);
                connection.end();
            }
        });    
    },
    getNews: function (callback) {
        var connection = mysql.createConnection(this.connectionOptions);
        connection.query('SELECT * from news', function (err, rows, fields) {
            if (!err) {
                callback(rows);
            } else {
                log.debug('Error while performing Query. ' + err);
            }
        });
        connection.end();
    },
    savePlayerData: function (player) {
        var values = {
            pos_x: player.x,
            pos_y: player.y,
            hp: player.hitPoints,
            mp: player.manaPoints,
            exp: player.exp,
            level: player.level
        };
        var connection = mysql.createConnection(this.connectionOptions);
        connection.query('UPDATE users SET ? WHERE username = "' + player.name + '"', values, function (err, result) {
            if (!err) {
                log.debug("Player " + player.name + " saved.");
            } else {
                log.debug('Error while performing Query. ' + err);
            }
        });
        var inventory = player.inventory;
        var inventoryData = {
            slot_1: inventory.getSlot(1),
            slot_2: inventory.getSlot(2),
            slot_3: inventory.getSlot(3),
            slot_4: inventory.getSlot(4),
            slot_5: inventory.getSlot(5),
            slot_6: inventory.getSlot(6),
            slot_7: inventory.getSlot(7),
            slot_8: inventory.getSlot(8),
            slot_9: inventory.getSlot(9),
            slot_10: inventory.getSlot(10),
            slot_11: inventory.getSlot(11),
            slot_12: inventory.getSlot(12),
            slot_13: inventory.getSlot(13),
            slot_14: inventory.getSlot(14),
            slot_15: inventory.getSlot(15),
            slot_16: inventory.getSlot(16),
            slot_17: inventory.getSlot(17),
            slot_18: inventory.getSlot(18)
        };
        connection.query('UPDATE inventories SET ? WHERE username = "' + player.name + '"', inventoryData, function (err, result) {
            if (!err) {
                log.debug("Inventory from " + player.name + " saved.");
            } else {
                log.debug('Error while performing Query. ' + err);
            }
        });
        connection.end();
    },
    logChatMsg: function(values) {
        var connection = mysql.createConnection(this.connectionOptions);
        connection.query('INSERT INTO chatlog SET ?', values, function (err, result) {
            if (err) {
                log.debug('Error while performing Query. ' + err);     
            }
        });
        connection.end();
    }
});