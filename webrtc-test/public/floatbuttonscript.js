var timeOut;

class Item {
    constructor(icon, fw, backgroundColor) {
        if(icon=="list"){
            this.$element = $(document.createElement("div"));
        }
        else{
            this.$element = $(document.createElement("button"));
        }
        this.icon = icon;
        this.fw = fw;
        this.$element.addClass("item");
        this.$element.attr("id",icon);
        this.$element.css("background-color", backgroundColor);
        var i = document.createElement("i");
        $(i).addClass(fw + " fa-lg");
        this.$element.append(i);
        this.prev = null;
        this.next = null;
        this.isMoving = false;
        var element = this;
        this.$element.on("mousemove", function() {
            clearTimeout(timeOut);
            timeOut = setTimeout(function() {
                if (element.next && element.isMoving) {
                    element.next.moveTo(element);
                } 
            }, 10);
        });
    }
    
    moveTo(item) {
        anime({
            targets: this.$element[0],
            left: item.$element.css("left"),
            top: item.$element.css("top"),
            duration: 700,
            elasticity: 500
        });
        if (this.next) {
            this.next.moveTo(item);
        }
    }

    updatePosition() {    
        anime({
            targets: this.$element[0],
            left: this.prev.$element.css("left"),
            top: this.prev.$element.css("top"),
            duration: 80
        });
        
        if (this.next) {
            this.next.updatePosition();
        }
    }
}

class Menu {
    constructor(menu) {
        this.$element = $(menu);
        this.size = 0;
        this.first = null;
        this.last = null;
        this.timeOut = null;
        this.hasMoved = false;
        this.status = "closed";
    }
    
    add(item) {
        var menu = this;
        if (this.first == null) {
            this.first = item;
            this.last = item;
            this.first.$element.on("mouseup", function() {
                if (menu.first.isMoving) {
                    menu.first.isMoving = false;        
                } else {
                    menu.click();
                }
            }); 
            item.$element.draggable(
                {
                    start: function() {
                        menu.close();
                        item.isMoving = true;
                    }  
                },
                {
                    drag: function() {
                        if (item.next) {
                            item.next.updatePosition();
                        }
                    }
                },
                {
                    stop: function() {
                        item.isMoving = false;
                        item.next.moveTo(item);
                    }
                }
            );
        } else {
            this.last.next = item;
            item.prev = this.last;
            this.last = item;
        }
        this.$element.after(item.$element);
        
        
    }
    
    open() {
        this.status = "open";
        var current = this.first.next;
        var iterator = 1;
        var head = this.first;
        console.log(parseInt(head.$element.css("left"), 10)+500);
        var sens = parseInt(head.$element.css("left"), 10)+500 < 0 ? 1 : -1;
        //var sens = head.$element.css("left") < head.$element.css("right") ? 1 : -1;
        while (current != null) {
            anime({
                targets: current.$element[0],
                left: parseInt(head.$element.css("left"), 10) + (sens * (iterator * 50)),
                top: head.$element.css("top"),
                duration: 500
            });
            iterator++;
            current = current.next;
        }    
    }
    
    close() {
        this.status = "closed";
        var current = this.first.next;
        var head = this.first;
        var iterator = 1;
        while (current != null) {
            anime({
                targets: current.$element[0],
                left: head.$element.css("left"),
                top: head.$element.css("top"),
                duration: 500
            });
            iterator++;
            current = current.next;
        }
    }
    
    click() {
        if (this.status == "closed") {
            this.open();
        } else {
            this.close();
        }
    }
    
}

var menu = new Menu("#myMenu");
var item1 = new Item("list", "fas fa-bars", "#8cc9f0");
var item2 = new Item("exit", "fas fa-sign-out-alt", "#FF5C5C");
var item3 = new Item("pallet", "fas fa-palette", "#5CD1FF");
var item4 = new Item("userlist", "far fa-address-book", "#FFF15C");
var item5 = new Item("setting", "fas fa-cog", "#64F592");

menu.add(item1);
menu.add(item2);
menu.add(item3);
menu.add(item4);
menu.add(item5);