
define(function () {

    var Inventory = Class.extend({
        init: function () {
            var self = this;
            this.slots = ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""];
        },
        getSlot: function(slot) {
            return this.slots[(slot - 1)];
        },
        updateSlot: function (slotId, item) {
            this.slots[(slotId - 1)] = "" + item; // forced string converting
        },
        isUsableItem: function(slot) {
            var itemId = this.getSlot(slot);
            return Types.isUsableItem(parseInt(itemId.split(':')[0]));
        },
        isEquipmentItem: function(slot) {
            var itemId = this.getSlot(slot);
            return Types.isEquipmentItem(parseInt(itemId.split(':')[0]));
        },
        hasItem: function(slot) {
            return this.getSlot(slot) !== "";
        },
        getItemContext: function(slot) {
            var context = [];
            var itemId = this.getSlot(slot);
            if(itemId === "") return context;
            if(this.isUsableItem(slot)) {
                context.push("Use");
            } else if (this.isEquipmentItem(slot) && slot <= 14) {
                context.push("Equip");
            }
            //context.push("Move");
            context.push("Delete");
            return context;
        }
    });

    return Inventory;
});
