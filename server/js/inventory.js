
var cls = require("./lib/class"),
        Messages = require('./message'),
        Utils = require('./utils');

module.exports = Inventory = cls.Class.extend({
    init: function () {
        var self = this;

        this.slots = ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "60", "21", "", ""];
//        this.weapon = "60";
//        this.helm = "clotharmor";
//        this.body = ""; // TODO:: rename to chest
//        this.shoes = "";
    },
    setSlot: function (slot, itemId) {
//        if (slot === 15) {
//            this.weapon = itemId;
//        } else if (slot === 16) {
//            this.helm = itemId;
//        } else {
            this.slots[(slot - 1)] = "" + itemId; // forced string converting
        //}
    },
    getSlot: function (slot) {
        return this.slots[(slot - 1)];
    },
    getFreeSlot: function () {
        var slot;
        for (var i = 0; i <= 13; i++) {
            if (this.slots[i] === "") {
                slot = (i + 1);
                break;
            }
        }
        return slot;
    },
    switchSlots: function(slotA, slotB) {
        var itemA = this.getSlot(slotA);
        var itemB = this.getSlot(slotB);
        this.setSlot(slotA, itemB);
        this.setSlot(slotB, itemA);
    }

});