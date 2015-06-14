
define(['jquery', 'app'], function ($, App) {
    var app, game;

    var initApp = function () {
        $(document).ready(function () {
            app = new App();
            app.center();

            app.getNews();

            if (Detect.isWindows()) {
                // Workaround for graphical glitches on text
                $('body').addClass('windows');
            }

            if (Detect.isOpera()) {
                // Fix for no pointer events
                $('body').addClass('opera');
            }

            if (Detect.isFirefoxAndroid()) {
                // Remove chat placeholder
                $('#chatinput').removeAttr('placeholder');
            }

            $('body').click(function (event) {
                if ($('#parchment').hasClass('credits')) {
                    app.toggleScrollContent('credits');
                }

                if ($('#parchment').hasClass('privacy')) {
                    app.toggleScrollContent('privacy');
                }

                if ($('#parchment').hasClass('legal')) {
                    app.toggleScrollContent('legal');
                }

                if ($('#parchment').hasClass('about')) {
                    app.toggleScrollContent('about');
                }
            });

            $('.barbutton').click(function () {
                $(this).toggleClass('active');
            });

            $('#inventorybutton').click(function () {
                if ($('#inventorybutton').hasClass('active')) {
                    app.showInventory();
                } else {
                    app.hideInventory();
                }
            });

            $('#chatbutton').click(function () {
                if ($('#chatbutton').hasClass('active')) {
                    app.showChat();
                } else {
                    app.hideChat();
                }
            });

            $('#helpbutton').click(function () {
                if ($('body').hasClass('about')) {
                    app.closeInGameScroll('about');
                    $('#helpbutton').removeClass('active');
                } else {
                    app.toggleScrollContent('about');
                }
            });

            $('#achievementsbutton').click(function () {
                app.toggleAchievements();
                if (app.blinkInterval) {
                    clearInterval(app.blinkInterval);
                }
                $(this).removeClass('blink');
            });

            $('#instructions').click(function () {
                app.hideWindows();
            });

            $('#playercount').click(function () {
                app.togglePopulationInfo();
            });

            $('#population').click(function () {
                app.togglePopulationInfo();
            });

            $('.clickable').click(function (event) {
                if (event.currentTarget.id !== "item_context" && event.currentTarget.id !== "inventory") {
                    $('#item_context').hide();
                }
                event.stopPropagation();
            });

            $('#toggle-credits').click(function () {
                app.toggleScrollContent('credits');
            });

            $('#toggle-privacy').click(function () {
                app.toggleScrollContent('privacy');
                if (game.renderer.mobile) {
                    if ($('#parchment').hasClass('privacy')) {
                        $(this).text('close');
                    } else {
                        $(this).text('Privacy');
                    }
                }
                ;
            });

            $('#toggle-legal').click(function () {
                app.toggleScrollContent('legal');
                if (game.renderer.mobile) {
                    if ($('#parchment').hasClass('legal')) {
                        $(this).text('close');
                    } else {
                        $(this).text('Legal notices');
                    }
                }
                ;
            });

            $('#toggle-news').click(function () {
                app.toggleScrollContent('news');
                if (game.renderer.mobile) {
                    if ($('#parchment').hasClass('news')) {
                        $(this).text('close');
                    } else {
                        $(this).text('News');
                    }
                }
                ;
            });

            $('#create-new span').click(function () {
                app.animateParchment('loadcharacter', 'confirmation');
            });

            $('.delete').click(function () {
                //app.storage.clear();
                app.animateParchment('confirmation', 'login');
                $('body').removeClass('returning');
            });

            $('#cancel span').click(function () {
                app.animateParchment('confirmation', 'loadcharacter');
            });

            $('.ribbon').click(function () {
                app.toggleScrollContent('about');
            });

            $('.moveLogin').click(function () {
                app.toggleScrollContent('login');
            });

            $('.moveRegister').click(function () {
                app.toggleScrollContent('register_1');
            });

            $('#register_next div').click(function () {
                app.toggleScrollContent('register_2');
            });

            $('#login input').bind("keyup", function () {
                app.toggleButton('login');
            });

            $('#register_1 input').bind("keyup", function () {
                app.toggleButton('register_1');
            });

            $('#register_2 input').bind("keyup", function () {
                app.toggleButton('register_2');
            });

            $('#previous').click(function () {
                var $achievements = $('#achievements');

                if (app.currentPage === 1) {
                    return false;
                } else {
                    app.currentPage -= 1;
                    $achievements.removeClass().addClass('active page' + app.currentPage);
                }
            });

            $('#next').click(function () {
                var $achievements = $('#achievements'),
                        $lists = $('#lists'),
                        nbPages = $lists.children('ul').length;

                if (app.currentPage === nbPages) {
                    return false;
                } else {
                    app.currentPage += 1;
                    $achievements.removeClass().addClass('active page' + app.currentPage);
                }
            });

            $('#notifications div').bind(TRANSITIONEND, app.resetMessagesPosition.bind(app));

            $('.close').click(function () {
                app.hideWindows();
            });

            $('.twitter').click(function () {
                var url = $(this).attr('href');

                app.openPopup('twitter', url);
                return false;
            });

            $('.facebook').click(function () {
                var url = $(this).attr('href');

                app.openPopup('facebook', url);
                return false;
            });

//            var data = app.storage.data;
//            if (data.hasAlreadyPlayed) {
//                if (data.player.name && data.player.name !== "") {
//                    $('#playername').html(data.player.name);
//                    $('#playerimage').attr('src', data.player.image);
//                }
//            }

            $('.play div').click(function (event) {
                var loginData = {
                    username: $('#nameinput').attr('value'),
                    password: $('#passwordinput').attr('value')
                };

                app.tryStartingGame(loginData);
            });

            $('.register div').click(function (event) {
                var registerData = {
                    username: $('#newusername').attr('value'),
                    email: $('#newemail').attr('value'),
                    password: $('#newpasswordinput').attr('value'),
                    passwordconfirme: $('#confirmpasswordinput').attr('value')
                };
                if (registerData.password !== registerData.passwordconfirme) {
                    $('#confirmpasswordinput').addClass("invalid");
                } else {
                    $('#confirmpasswordinput').removeClass("invalid");
                    app.tryRegisterUser(registerData);
                }
            });

            document.addEventListener("touchstart", function () {
            }, false);

            $('#resize-check').bind("transitionend", app.resizeUi.bind(app));
            $('#resize-check').bind("webkitTransitionEnd", app.resizeUi.bind(app));
            $('#resize-check').bind("oTransitionEnd", app.resizeUi.bind(app));

            log.info("App initialized.");

            initGame();
        });
    };

    var initGame = function () {
        require(['game'], function (Game) {

            var canvas = document.getElementById("entities"),
                    background = document.getElementById("background"),
                    foreground = document.getElementById("foreground"),
                    input = document.getElementById("chatinput");

            game = new Game(app);
            game.setup('#bubbles', canvas, background, foreground, input);
            //game.setStorage(app.storage);
            app.setGame(game);

            if (app.isDesktop && app.supportsWorkers) {
                game.loadMap();
            }

            game.onGameStart(function () {
                app.initInventoryIcons();
            });

            game.onDisconnect(function (message) {
                $('#death').find('p').html(message + "<em>Please reload the page.</em>");
                $('#respawn').hide();
            });

            game.onPlayerDeath(function () {
                if ($('body').hasClass('credits')) {
                    $('body').removeClass('credits');
                }
                $('body').addClass('death');
            });

            game.onPlayerEquipmentChange(function () {
                app.initEquipmentIcons(); //TODO:: wrong function
            });

            game.onPlayerInvincible(function () {
                $('#hitpoints').toggleClass('invincible');
            });

            game.onNbPlayersChange(function (worldPlayers, totalPlayers) {
                var setWorldPlayersString = function (string) {
                    $("#instance-population").find("span:nth-child(2)").text(string);
                    $("#playercount").find("span:nth-child(2)").text(string);
                },
                        setTotalPlayersString = function (string) {
                            $("#world-population").find("span:nth-child(2)").text(string);
                        };

                $("#playercount").find("span.count").text(worldPlayers);

                $("#instance-population").find("span").text(worldPlayers);
                if (worldPlayers == 1) {
                    setWorldPlayersString("player");
                } else {
                    setWorldPlayersString("players");
                }

                $("#world-population").find("span").text(totalPlayers);
                if (totalPlayers == 1) {
                    setTotalPlayersString("player");
                } else {
                    setTotalPlayersString("players");
                }
            });

            game.onAchievementUnlock(function (id, name, description) {
                app.unlockAchievement(id, name);
            });

            game.onNotification(function (message) {
                app.showMessage(message);
            });

            app.initHealthBar();
            app.initExpBar();

            $('#nameinput').attr('value', '');
            $('#chatbox').attr('value', '');

            if (game.renderer.mobile || game.renderer.tablet) {
                $('#foreground').bind('touchstart', function (event) {
                    app.center();
                    app.setMouseCoordinates(event.originalEvent.touches[0]);
                    game.click();
                    app.hideWindows();
                });
            } else {
                $('#foreground').click(function (event) {
                    app.center();
                    app.setMouseCoordinates(event);
                    if (game) {
                        game.click();
                    }
                    app.hideWindows();
                });
            }

            $('body').unbind('click');
            $('body').click(function (event) {
                var hasClosedParchment = false;

                if ($('#parchment').hasClass('credits')) {
                    if (game.started) {
                        app.closeInGameScroll('credits');
                        hasClosedParchment = true;
                    } else {
                        app.toggleScrollContent('credits');
                    }
                }

                if ($('#parchment').hasClass('privacy')) {
                    if (game.started) {
                        app.closeInGameScroll('privacy');
                        hasClosedParchment = true;
                    } else {
                        app.toggleScrollContent('privacy');
                    }
                }

                if ($('#parchment').hasClass('legal')) {
                    if (game.started) {
                        app.closeInGameScroll('legal');
                        hasClosedParchment = true;
                    } else {
                        app.toggleScrollContent('legal');
                    }
                }

                if ($('#parchment').hasClass('about')) {
                    if (game.started) {
                        app.closeInGameScroll('about');
                        hasClosedParchment = true;
                    } else {
                        app.toggleScrollContent('about');
                    }
                }

                if (game.started && !game.renderer.mobile && game.player && !hasClosedParchment) {
                    game.click();
                }
            });

            $('#respawn').click(function (event) {
                //game.audioManager.playSound("revive");
                game.restart();
                $('body').removeClass('death');
            });

            $(document).mousemove(function (event) {
                app.setMouseCoordinates(event);
                if (game.started) {
                    game.movecursor();
                }
            });

            $(document).keydown(function (e) {
                var key = e.which,
                        $chat = $('#chatinput');

                if (key === 13) {
                    if ($('#chatbox').hasClass('active')) {
                        app.hideChat();
                    } else {
                        app.showChat();
                    }
                }
            });

            $('#chatinput').keydown(function (e) {
                var key = e.which,
                        $chat = $('#chatinput'),
                        placeholder = $(this).attr("placeholder");

                if (!(e.shiftKey && e.keyCode === 16) && e.keyCode !== 9) {
                    if ($(this).val() === placeholder) {
                        $(this).val('');
                        $(this).removeAttr('placeholder');
                        $(this).removeClass('placeholder');
                    }
                }

                if (key === 13) {
                    if ($chat.attr('value') !== '') {
                        if (game.player) {
                            game.say($chat.attr('value'));
                        }
                        $chat.attr('value', '');
                        app.hideChat();
                        $('#foreground').focus();
                        return false;
                    } else {
                        app.hideChat();
                        return false;
                    }
                }

                if (key === 27) {
                    app.hideChat();
                    return false;
                }
            });

            $('#chatinput').focus(function (e) {
                var placeholder = $(this).attr("placeholder");

                if (!Detect.isFirefoxAndroid()) {
                    $(this).val(placeholder);
                }

                if ($(this).val() === placeholder) {
                    this.setSelectionRange(0, 0);
                }
            });

            $('#nameinput').focusin(function () {
                $('#name-tooltip').addClass('visible');
            });

            $('#nameinput').focusout(function () {
                $('#name-tooltip').removeClass('visible');
            });

            $('#nameinput').keypress(function (event) {
                var $name = $('#nameinput'),
                        name = $name.attr('value');
                loginData = {
                    username: $('#nameinput').attr('value'),
                    password: $('#passwordinput').attr('value')
                };

                $('#name-tooltip').removeClass('visible');

                if (event.keyCode === 13) {
                    if (name !== '') {
                        app.tryStartingGame(loginData, function () {
                            $name.blur(); // exit keyboard on mobile
                        });
                        return false; // prevent form submit
                    } else {
                        return false; // prevent form submit
                    }
                }
            });

            $('#mutebutton').click(function () {
                //game.audioManager.toggle();
            });

            var contextIsOpen = false;
            $('.slot').click(function (event) {
                contextIsOpen = true;
                var slot = event.currentTarget.id.split('_');
                var contextObj = game.buildItemContext(slot[(slot.length - 1)]);
                if (contextObj !== "") {
                    $('#item_context').html("");
                    $('#item_context').append(contextObj);
                    $('#item_context').css({left: (event.clientX - event.offsetX + event.currentTarget.clientWidth), top: (event.clientY - event.offsetY)});
                    $('#item_context').show();
                }
            });
            
            var itemMove = false,
            $slotMove,
            oldSlotPos,
            fromSlotId;
            var mouseStartPos = [];
            $('.slot').bind("mousedown", function(e) {
                itemMove = true;
                mouseStartPos.x = e.clientX - e.offsetX - 2;
                mouseStartPos.y = e.clientY - e.offsetY - 2;
                $slotMove = $(e.currentTarget);
                oldSlotPos = $(e.currentTarget).position();
                var slot = e.currentTarget.id.split('_');
                fromSlotId = slot[(slot.length - 1)];
            });
            
            $(window).bind("mousemove", function(e) {
                if(itemMove) {
                    var newLeft = oldSlotPos.left + (e.clientX - mouseStartPos.x);
                    var newTop = oldSlotPos.top + (e.clientY - mouseStartPos.y);
                    $slotMove.css({left: newLeft, top: newTop});
                }
            });
            
            $(window).bind("mouseup", function(e) {
                if(contextIsOpen) {
                    contextIsOpen = false;
                    $('#item_context').hide();
                }
                
                if(itemMove === false) return;
                itemMove = false;
                if(e.target.id.indexOf('slot') !== -1){
                    var slot = e.target.id.split('_');
                    var slotId = slot[(slot.length - 1)];
                    if(fromSlotId !== slotId) {
                        if(fromSlotId > 14) {
                            game.tryEquipItem(slotId);
                        } else if(slotId > 14) {
                            game.tryEquipItem(fromSlotId);
                        } else {
                            game.trySwitchItems(fromSlotId, slotId);
                        }
                    }
                }
                $slotMove.css({left: oldSlotPos.left, top: oldSlotPos.top});
            });

            $(document).bind("keydown", function (e) {
                var key = e.which,
                        $chat = $('#chatinput');
// TODO:: Tastensteuerung implementieren
                if ($('#chatinput:focus').size() === 0 && $('#nameinput:focus').size() === 0) {
//                    if (key === 13) { // Enter
//                        if (game.ready) {
//                            $chat.focus();
//                            return false;
//                        }
//                    }
//                    if (key === 32) { // Space
//                        // game.togglePathingGrid();
//                        return false;
//                    }
//                    if (key === 70) { // F
//                        // game.toggleDebugInfo();
//                        return false;
//                    }
//                    if (key === 27) { // ESC
//                        app.hideWindows();
//                        _.each(game.player.attackers, function (attacker) {
//                            attacker.stop();
//                        });
//                        return false;
//                    }
//                    if (key === 65) { // a
//                        // game.player.hit();
//                        return false;
//                    }
                } else {
                    if (key === 13 && game.ready) {
                        $chat.focus();
                        return false;
                    }
                }

                if ($('body').hasClass('game')) {
                    // Fast-Slots
                    if (key >= 49 && key <= 53) {
                        game.tryUseItem((key - 48));
                    } else if (key === 87) { // W

                    } else if (key === 65) { // A

                    } else if (key === 83) { // S

                    } else if (key === 68) { // D

                    } else if (key === 69) { // E - Inventory
                        $('#inventorybutton').click();
                    }
                }
            });

            if (game.renderer.tablet) {
                $('body').addClass('tablet');
            }
        });
    };

    initApp();
});
