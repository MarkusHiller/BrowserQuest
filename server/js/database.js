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
        
        
//        log.info("Database connected ...");
//        
//        this.connection.on('error', function (err) {
//            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
//                log.info("Database connection lost. Try to restrat ...");
//                this.connection = mysql.createConnection({
//                    host: host,
//                    user: user,
//                    password: password,
//                    database: database
//                });
//                this.connection.connect();
//                log.info("Database connected ...");
//            };
//        });
    },
    canPlay: function (name, password, callback) {
        var pwHash = md5(password);
        var connection = mysql.createConnection(this.connectionOptions);
        connection.query('SELECT * from users WHERE username = "' + name + '" AND password = "' + pwHash + '"', function (err, rows, fields) {
            if (!err) {
                callback(rows[0]);
            } else {
                log.debug('Error while performing Query. ' + err);
            }
        });
        connection.end();
    },
    tryRegisterUser: function (obj, callback) {
        var pwHash = md5(obj.password);
        var values = {username: obj.username, password: pwHash, email: obj.email};
        var connection = mysql.createConnection(this.connectionOptions);
        connection.query('INSERT INTO users SET ?', values, function (err, result) {
            if (!err) {
                callback("register_success");
            } else {
                log.debug('Error while performing Query. ' + err);
                callback("register_fail");
            }
        });
        connection.end();
    },
    savePlayerData: function (player) {
        var values = {
            pos_x: player.x,
            pos_y: player.y,
            armor: player.armor,
            weapon: player.weapon,
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
        connection.end();
    }
});