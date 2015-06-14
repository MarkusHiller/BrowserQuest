define([
    'jquery',
    'storage'
],
        function ($, Storage) {

            var App = Class.extend({
                init: function () {
                    this.currentPage = 1;
                    this.blinkInterval = null;
                    this.isParchmentReady = true;
                    this.ready = false;
                    //this.storage = new Storage();
                    //this.watchNameInputInterval = setInterval(this.toggleButton.bind(this), 100);
                    this.$playButton = $('.play');
                    this.$registerButton = $('.register');
                    this.$playDiv = $('.play div');
                    this.$registerDiv = $('.register div');
                    this.frontPage = 'login';

//                    if (localStorage && localStorage.data) {
//                        this.frontPage = 'loadcharacter';
//                    }
                },
                setGame: function (game) {
                    this.game = game;
                    this.isMobile = this.game.renderer.mobile;
                    this.isTablet = this.game.renderer.tablet;
                    this.isDesktop = !(this.isMobile || this.isTablet);
                    this.supportsWorkers = !!window.Worker;
                    this.ready = true;
                },
                center: function () {
                    window.scrollTo(0, 1);
                },
                canStartGame: function () {
                    if (this.isDesktop) {
                        return (this.game && this.game.map && this.game.map.isLoaded);
                    } else {
                        return this.game;
                    }
                },
                tryStartingGame: function (loginData, starting_callback) {
                    var self = this,
                            $play = this.$playButton;

                    if (loginData.username !== '') {
                        if (!this.ready || !this.canStartGame()) {
                            if (!this.isMobile) {
                                // on desktop and tablets, add a spinner to the play button
                                $play.addClass('loading');
                            }
                            this.$playDiv.unbind('click');
                            var watchCanStart = setInterval(function () {
                                log.debug("waiting...");
                                if (self.canStartGame()) {
                                    setTimeout(function () {
                                        if (!self.isMobile) {
                                            $play.removeClass('loading');
                                        }
                                    }, 1500);
                                    clearInterval(watchCanStart);
                                    self.startGame(loginData, starting_callback);
                                }
                            }, 100);
                        } else {
                            this.$playDiv.unbind('click');
                            this.startGame(loginData, starting_callback);
                        }
                    }
                },
                startGame: function (loginData, starting_callback) {
                    var self = this;

                    if (starting_callback) {
                        starting_callback();
                    }
                    this.hideIntro(function () {
                        if (!self.isDesktop) {
                            // On mobile and tablet we load the map after the player has clicked
                            // on the PLAY button instead of loading it in a web worker.
                            self.game.loadMap();
                        }
                        self.start(loginData);
                    });
                },
                start: function (loginData) {
                    var self = this;
                    //firstTimePlaying = !self.storage.hasAlreadyPlayed();

                    if (loginData.username && loginData.password && !this.game.started) {
                        var optionsSet = false,
                                config = this.config;

                        //>>includeStart("devHost", pragmas.devHost);
                        if (config.local) {
                            log.debug("Starting game with local dev config.");
                            this.game.setServerOptions(config.local.host, config.local.port, loginData);
                        } else {
                            log.debug("Starting game with default dev config.");
                            this.game.setServerOptions(config.dev.host, config.dev.port, loginData);
                        }
                        optionsSet = true;
                        //>>includeEnd("devHost");

                        //>>includeStart("prodHost", pragmas.prodHost);
                        if (!optionsSet) {
                            log.debug("Starting game with build config.");
                            this.game.setServerOptions(config.build.host, config.build.port, loginData);
                        }
                        //>>includeEnd("prodHost");

                        this.center();
                        this.game.run(function () {
                            $('body').addClass('started');
//                            if (firstTimePlaying) {
//                                self.toggleInstructions();
//                            }
                        });
                    }
                },
                tryRegisterUser: function (registerData) {
                    var self = this,
                            $register = this.$registerButton;

                    if (registerData.username !== "" && registerData.password !== "" && registerData.email !== "") {
                        if (!this.isMobile) {
                            // on desktop and tablets, add a spinner to the play button
                            $register.addClass('loading');
                        }
                        this.$registerDiv.unbind('click');
                        $.ajax({
                            url: "http://localhost:8000/register?callback=?", //TODO:: use config route
                            data: registerData,
                            jsonp: 'callback',
                            dataType: 'jsonp',
                            success: success
                        }).fail(function (data) {
                            self.toggleScrollContent('register_fail');
                            log.debug("register fail: " + data);
                        });

                        function success(data) {
                            self.toggleScrollContent(data.result);
                            log.debug("register suc: " + data);
                        }
                    }
                },
                getNews: function (step) {
                    var newsId;

                    $.ajax({
                        url: "http://localhost:8000/news?callback=?", //TODO:: use config route
                        jsonp: 'callback',
                        dataType: 'jsonp',
                        success: success
                    });

                    function success(data) {
                        this.news = data;
                        this.currentNews = _.last(this.news).ID;
                        $('#news_title').text(_.last(this.news).date + ' - ' + _.last(this.news).title);
                        $('#news_body').text(_.last(this.news).body);
                    }
                },
                setMouseCoordinates: function (event) {
                    var gamePos = $('#container').offset(),
                            scale = this.game.renderer.getScaleFactor(),
                            width = this.game.renderer.getWidth(),
                            height = this.game.renderer.getHeight(),
                            mouse = this.game.mouse;

                    mouse.x = event.pageX - gamePos.left - (this.isMobile ? 0 : 5 * scale);
                    mouse.y = event.pageY - gamePos.top - (this.isMobile ? 0 : 7 * scale);

                    if (mouse.x <= 0) {
                        mouse.x = 0;
                    } else if (mouse.x >= width) {
                        mouse.x = width - 1;
                    }

                    if (mouse.y <= 0) {
                        mouse.y = 0;
                    } else if (mouse.y >= height) {
                        mouse.y = height - 1;
                    }
                },
                initHealthBar: function () {
                    var scale = this.game.renderer.getScaleFactor(),
                            healthMaxWidth = $("#healthbar").width() - (12 * scale);

                    this.game.onPlayerHealthChange(function (hp, maxHp) {
                        var barWidth = Math.round((healthMaxWidth / maxHp) * (hp > 0 ? hp : 0));
                        $("#hitpoints").css('width', barWidth + "px");
                    });

                    this.game.onPlayerHurt(this.blinkHealthBar.bind(this));
                },
                initExpBar: function () {
                    var scale = this.game.renderer.getScaleFactor(),
                            expMaxWidth = $("#expbar").width();

                    this.game.onPlayerExpChange(function (exp, maxExp) {
                        var expbarWidth = Math.round((expMaxWidth / maxExp) * (exp > 0 ? exp : 0));
                        $("#exp").css('width', expbarWidth + "px");
                    });
                },
                blinkHealthBar: function () {
                    var $hitpoints = $('#hitpoints');

                    $hitpoints.addClass('white');
                    setTimeout(function () {
                        $hitpoints.removeClass('white');
                    }, 500);
                },
                toggleButton: function (id) {
                    var $button = $('#' + id + ' .button'),
                            isFilled = true;
                    _.forEach($('#' + id + ' input'), function (inputFeld) {
                        if (inputFeld.value === "") {
                            isFilled = false;
                        }
                    });

                    if (isFilled) {
                        $button.removeClass('disabled');
                    } else {
                        $button.addClass('disabled');
                    }
                },
                hideIntro: function (hidden_callback) {
                    //clearInterval(this.watchNameInputInterval);
                    $('body').removeClass('intro');
                    setTimeout(function () {
                        $('body').addClass('game');
                        hidden_callback();
                    }, 1000);
                },
                showInventory: function () {
                    if (this.game.started) {
                        $('#inventory').addClass('active');
                    }
                },
                hideInventory: function () {
                    if (this.game.started) {
                        $('#inventory').removeClass('active');
                    }
                },
                showChat: function () {
                    if (this.game.started) {
                        $('#chatbox').addClass('active');
                        $('#chatinput').focus();
                        $('#chatbutton').addClass('active');
                    }
                },
                hideChat: function () {
                    if (this.game.started) {
                        $('#chatbox').removeClass('active');
                        $('#chatinput').blur();
                        $('#chatbutton').removeClass('active');
                    }
                },
                toggleInstructions: function () {
                    if ($('#achievements').hasClass('active')) {
                        this.toggleAchievements();
                        $('#achievementsbutton').removeClass('active');
                    }
                    $('#instructions').toggleClass('active');
                },
                toggleAchievements: function () {
                    if ($('#instructions').hasClass('active')) {
                        this.toggleInstructions();
                        $('#helpbutton').removeClass('active');
                    }
                    this.resetPage();
                    $('#achievements').toggleClass('active');
                },
                resetPage: function () {
                    var self = this,
                            $achievements = $('#achievements');

                    if ($achievements.hasClass('active')) {
                        $achievements.bind(TRANSITIONEND, function () {
                            $achievements.removeClass('page' + self.currentPage).addClass('page1');
                            self.currentPage = 1;
                            $achievements.unbind(TRANSITIONEND);
                        });
                    }
                },
                initInventoryIcons: function() {
                    var scale = this.game.renderer.getScaleFactor();
                    for(var i = 0; i <= 17; i++) {
                        $('#slot_' + ( i + 1 )).css('background-image', 'url("")');
                        if(i <= 4) {
                            $('#fast_slot_' + (i + 1)).css('background-image', 'url("")');
                        }
                    }
                    var weaponId = this.game.player.inventory.getSlot(15);
                    var weaponString = Types.getKindAsString(parseInt(weaponId.split(":")[0]));
                    var weaponPath = getIconPath(weaponString);
                    var helmId = this.game.player.inventory.getSlot(16);
                    var helmString = Types.getKindAsString(parseInt(helmId.split(":")[0]));
                    var helmPath = getIconPath(helmString);
                    
                    $('#slot_15').css('background-image', 'url("' + weaponPath + '")');
                    $('#slot_16').css('background-image', 'url("' + helmPath + '")');
                    
                    function getIconPath(spriteName) {
                        return spriteName === undefined ? '' : 'img/' + scale + '/item-' + spriteName + '.png';
                    }
                },
                updateInventorySlotIcon: function(slot) {
                    var scale = this.game.renderer.getScaleFactor();
                    var item,
                        itemId;
                    
                    itemId = this.game.player.inventory.getSlot(slot);
                    item = Types.getKindAsString(parseInt(itemId.split(":")[0]));
                    $('#slot_' + slot).css('background-image', 'url("' + getIconPath(item) + '")');
                    if(slot <= 5) {
                        $('#fast_slot_' + slot).css('background-image', 'url("' + getIconPath(item) + '")');
                    }
                    
                    function getIconPath(spriteName) {
                        return spriteName === undefined ? '' : 'img/' + scale + '/item-' + spriteName + '.png';
                    }
                },
                hideWindows: function () {
                    if ($('#achievements').hasClass('active')) {
                        this.toggleAchievements();
                        $('#achievementsbutton').removeClass('active');
                    }
                    if ($('#instructions').hasClass('active')) {
                        this.toggleInstructions();
                        $('#helpbutton').removeClass('active');
                    }
                    if ($('body').hasClass('credits')) {
                        this.closeInGameScroll('credits');
                    }
                    if ($('body').hasClass('legal')) {
                        this.closeInGameScroll('legal');
                    }
                    if ($('body').hasClass('about')) {
                        this.closeInGameScroll('about');
                    }
                },
                showAchievementNotification: function (id, name) {
                    var $notif = $('#achievement-notification'),
                            $name = $notif.find('.name'),
                            $button = $('#achievementsbutton');

                    $notif.removeClass().addClass('active achievement' + id);
                    $name.text(name);
//                    if (this.game.storage.getAchievementCount() === 1) {
//                        this.blinkInterval = setInterval(function () {
//                            $button.toggleClass('blink');
//                        }, 500);
//                    }
                    setTimeout(function () {
                        $notif.removeClass('active');
                        $button.removeClass('blink');
                    }, 5000);
                },
                displayUnlockedAchievement: function (id) {
                    var $achievement = $('#achievements li.achievement' + id);

                    var achievement = this.game.getAchievementById(id);
                    if (achievement && achievement.hidden) {
                        this.setAchievementData($achievement, achievement.name, achievement.desc);
                    }
                    $achievement.addClass('unlocked');
                },
                unlockAchievement: function (id, name) {
                    this.showAchievementNotification(id, name);
                    this.displayUnlockedAchievement(id);

                    var nb = parseInt($('#unlocked-achievements').text());
                    $('#unlocked-achievements').text(nb + 1);
                },
                initAchievementList: function (achievements) {
                    var self = this,
                            $lists = $('#lists'),
                            $page = $('#page-tmpl'),
                            $achievement = $('#achievement-tmpl'),
                            page = 0,
                            count = 0,
                            $p = null;

                    _.each(achievements, function (achievement) {
                        count++;

                        var $a = $achievement.clone();
                        $a.removeAttr('id');
                        $a.addClass('achievement' + count);
                        if (!achievement.hidden) {
                            self.setAchievementData($a, achievement.name, achievement.desc);
                        }
                        $a.find('.twitter').attr('href', 'http://twitter.com/share?url=http%3A%2F%2Fbrowserquest.mozilla.org&text=I%20unlocked%20the%20%27' + achievement.name + '%27%20achievement%20on%20Mozilla%27s%20%23BrowserQuest%21&related=glecollinet:Creators%20of%20BrowserQuest%2Cwhatthefranck');
                        $a.show();
                        $a.find('a').click(function () {
                            var url = $(this).attr('href');

                            self.openPopup('twitter', url);
                            return false;
                        });

                        if ((count - 1) % 4 === 0) {
                            page++;
                            $p = $page.clone();
                            $p.attr('id', 'page' + page);
                            $p.show();
                            $lists.append($p);
                        }
                        $p.append($a);
                    });

                    $('#total-achievements').text($('#achievements').find('li').length);
                },
                initUnlockedAchievements: function (ids) {
                    var self = this;

                    _.each(ids, function (id) {
                        self.displayUnlockedAchievement(id);
                    });
                    $('#unlocked-achievements').text(ids.length);
                },
                setAchievementData: function ($el, name, desc) {
                    $el.find('.achievement-name').html(name);
                    $el.find('.achievement-description').html(desc);
                },
                toggleScrollContent: function (content) {
                    var currentState = $('#parchment').attr('class');

                    if (this.game.started) {
                        $('#parchment').removeClass().addClass(content);

                        $('body').removeClass('credits legal about').toggleClass(content);

                        if (!this.game.player) {
                            $('body').toggleClass('death');
                        }

                        if (content !== 'about') {
                            $('#helpbutton').removeClass('active');
                        }
                    } else {
                        if (currentState !== 'animate') {
                            if (currentState === content) {
                                this.animateParchment(currentState, this.frontPage);
                            } else {
                                this.animateParchment(currentState, content);
                            }
                        }
                    }
                },
                closeInGameScroll: function (content) {
                    $('body').removeClass(content);
                    $('#parchment').removeClass(content);
                    if (!this.game.player) {
                        $('body').addClass('death');
                    }
                    if (content === 'about') {
                        $('#helpbutton').removeClass('active');
                    }
                },
                togglePopulationInfo: function () {
                    $('#population').toggleClass('visible');
                },
                openPopup: function (type, url) {
                    var h = $(window).height(),
                            w = $(window).width(),
                            popupHeight,
                            popupWidth,
                            top,
                            left;

                    switch (type) {
                        case 'twitter':
                            popupHeight = 450;
                            popupWidth = 550;
                            break;
                        case 'facebook':
                            popupHeight = 400;
                            popupWidth = 580;
                            break;
                    }

                    top = (h / 2) - (popupHeight / 2);
                    left = (w / 2) - (popupWidth / 2);

                    newwindow = window.open(url, 'name', 'height=' + popupHeight + ',width=' + popupWidth + ',top=' + top + ',left=' + left);
                    if (window.focus) {
                        newwindow.focus()
                    }
                },
                animateParchment: function (origin, destination) {
                    var self = this,
                            $parchment = $('#parchment'),
                            duration = 1;

                    if (this.isMobile) {
                        $parchment.removeClass(origin).addClass(destination);
                    } else {
                        if (this.isParchmentReady) {
                            if (this.isTablet) {
                                duration = 0;
                            }
                            this.isParchmentReady = !this.isParchmentReady;

                            $parchment.toggleClass('animate');
                            $parchment.removeClass(origin);

                            setTimeout(function () {
                                $('#parchment').toggleClass('animate');
                                $parchment.addClass(destination);
                            }, duration * 1000);

                            setTimeout(function () {
                                self.isParchmentReady = !self.isParchmentReady;
                            }, duration * 1000);
                        }
                    }
                },
                animateMessages: function () {
                    var $messages = $('#notifications div');

                    $messages.addClass('top');
                },
                resetMessagesPosition: function () {
                    var message = $('#message2').text();

                    $('#notifications div').removeClass('top');
                    $('#message2').text('');
                    $('#message1').text(message);
                },
                showMessage: function (message) {
                    var $wrapper = $('#notifications div'),
                            $message = $('#notifications #message2');

                    this.animateMessages();
                    $message.text(message);
                    if (this.messageTimer) {
                        this.resetMessageTimer();
                    }

                    this.messageTimer = setTimeout(function () {
                        $wrapper.addClass('top');
                    }, 5000);
                },
                resetMessageTimer: function () {
                    clearTimeout(this.messageTimer);
                },
                resizeUi: function () {
                    if (this.game) {
                        if (this.game.started) {
                            this.game.resize();
                            this.initHealthBar();
                            this.initExpBar();
                            this.game.updateBars();
                        } else {
                            var newScale = this.game.renderer.getScaleFactor();
                            this.game.renderer.rescale(newScale);
                        }
                    }
                }
            });

            return App;
        });