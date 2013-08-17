/**
 *      yahui
 *
 *      yet another HomeMatic user interface
 *
 *      Copyright (c) 2013 http://hobbyquaker.github.io
 *
 *      CC BY-NC 3.0
 *
 *      Kommerzielle Nutzung nicht gestattet!
 *
 */


var yahui = {
    version: "0.9.3",
    prefix: "",
    images: [],
    sortOrder: {},
    socket: {},
    links: [
        {text:"Variablen", subtext:"", url: "#variables", img: "dummy.png", inline: true},
        {text:"Programme", subtext:"", url: "#programs", img: "dummy.png", inline: true},
        {text:"HomeMatic WebUI", subtext:"", url: "http://homematic/", img: "homematic.png", inline: false},
        {text:"CUxD", subtext:"", url: "http://homematic/addons/cuxd", img: "cuxd.png", inline: false},
        {text:"CUxD-Highcharts", subtext:"", url: "http://homematic/addons/cuxchart/menu.html", img: "cuxcharts.png", inline: true},
        {text:"yr.no Wetter", subtext:"", url: "http://www.yr.no/place/Germany/Baden-W%C3%BCrttemberg/Stuttgart/meteogram.png", img: "yr.png", inline: true}
    ]
};


$(document).ready(function () {

    var body = $("body");

    var url = $.mobile.path.parseUrl(location.href);

    $(".yahui-version").html(yahui.version);
    $(".yahui-prefix").html(yahui.prefix);


    // Diese 3 Objekte beinhalten die CCU Daten.
    // Unter http://hostname:8080/ccu.io/ k�nnen diese Objekte inspiziert werden.
    var regaObjects, datapoints, regaIndex;

    // Verbindung zu CCU.IO herstellen.
    yahui.socket = io.connect( $(location).attr('protocol') + '//' +  $(location).attr('host'));

    // Von CCU.IO empfangene Events verarbeiten
    yahui.socket.on('event', function(obj) {
        //console.log(obj);
        // id = obj[0], value = obj[1], timestamp = obj[2], acknowledge = obj[3]

        // Datenpunkt-Objekt aktualisieren
        datapoints[obj[0]] = [obj[1], obj[2], obj[3]];

        // UI Widgets aktualisieren
        updateWidgets(obj[0], obj[1], obj[2], obj[3]);
    });

    // Abfragen welche Bild-Dateien im Ordner yahui/images/user/ vorhanden sind
    yahui.socket.emit('readdir', "www/yahui/images/user", function(dirArr) {
        //console.log(dirArr);
        for (var i = 0; i < dirArr.length; i++) {
            var id = parseInt(dirArr[i].replace(/\..*$/, ""), 10);
            yahui.images[id] = dirArr[i];
        }
        //console.log(yahui.images);
    });

    // Sortierung laden
    yahui.socket.emit('readFile', 'yahui-sort.json', function (data) {
        if (data) { yahui.sortOrder = data; }
        //console.log(yahui.sortOrder);

        // ---------- "Hier geht's los" ----------- //
        getDatapoints();
        renderLinks();
    });


    // Sind wir im Edit-Mode?
    if (url.search == "?edit") {
        // Edit Modus!
        $.ajaxSetup({
            cache: true
        });
        $.getScript("js/yahui-edit.js")
            .done(function(script, textStatus) {
                //console.log("edit mode");
            })
            .fail(function(jqxhr, settings, exception) {
            });
    }

    // Laedt die Werte und Timestamps aller Datenpunkte
    function getDatapoints() {
        yahui.socket.emit('getDatapoints', function(obj) {
            datapoints = obj;
            // Weiter gehts mit den Rega Objekten
            getObjects();
        });
    }

    // Laedt Metainformationen zu Rega Objekten
    function getObjects() {
        yahui.socket.emit('getObjects', function(obj) {
		console.log("received objects");
		console.log(obj);
            regaObjects = obj;

            // Starten wir mit einer Page? Wenn ja schnell Rendern.
            if ( url.hash.search(/^#page_/) !== -1 ) {
                var pageId = (url.hash.slice(6));
                if (!$("div#page_"+pageId).html()) {
                    renderPage(pageId, true);
                }
            }

            // jqMobile initialisieren
            $.mobile.initializePage();

            // Weiter gehts mit dem Laden des Index
            getIndex();
        });
    }

    // Laedt Index von ccu.io fuer komfortables auffinden von Objekten
    function getIndex() {
        yahui.socket.emit('getIndex', function(obj) {
            regaIndex = obj;

            // Nun sind alle 3 Objekte (regaIndex, regaObjects und datapoints) von ccu.io geladen,

            // Menüseiten Rendern
            renderMenu("FAVORITE", "ul#listFavs");
            renderMenu("ENUM_ROOMS", "ul#listRooms");
            renderMenu("ENUM_FUNCTIONS", "ul#listFunctions");

            // Variablen und Programmseite rendern
            renderVariables();

            // "wir sind fertig".

        });
    }

    // Men�-Seite (Favoriten, R�ume und Gewerke) aufbauen
    function renderMenu(en, selector) {
        //console.log("renderMenu "+en);
        var domObj = $(selector);
        var sortOrder = [];
        var index = [];
        var img;
        var name, link;
        switch (en) {
            case "ENUM_ROOMS":
                defimg = "images/default/room.png";
                name = "R�ume";
                sortOrder = yahui.sortOrder["listRooms"];
                break;
            case "ENUM_FUNCTIONS":
                defimg = "images/default/function.png";
                name = "Gewerke";
                sortOrder = yahui.sortOrder["listFunctions"];
                break;
            case "FAVORITE":
                defimg = "images/default/favorite.png";
                sortOrder = yahui.sortOrder["listFavs"];
                name = "Favoriten";
                break;

        }

        var alreadyRendered = [];
        if (sortOrder) {
            //console.log("SORT "+en)
            for (var j = 0; j < sortOrder.length; j++) {

                domObj.append(renderMenuItem(sortOrder[j]));
                alreadyRendered.push(parseInt(sortOrder[j], 10));
            }
        }

        //console.log("AR ");
        //console.log(alreadyRendered);
        for (var i = 0; i < regaIndex[en].length; i++) {
            //console.log("... "+regaIndex[en][i]);
            if (alreadyRendered.indexOf(regaIndex[en][i]) == -1) {
                //console.log("..! "+regaIndex[en][i]);
                domObj.append(renderMenuItem(regaIndex[en][i]));
            }
        }

        if (domObj.hasClass('ui-listview')) {
            domObj.listview('refresh');
        } else {
            domObj.trigger("create");
        }
    }

    function renderMenuItem(enId) {
        var enObj = (regaObjects[enId]);
        var defimg = "images/default/page.png";

        // User Image vorhanden?
        if (yahui.images[enId]) {
            img = "images/user/" + yahui.images[enId];
        } else {
            img = defimg;
        }

        return "<li data-hm-id='"+enId+"'><a href='#page_"+enId+"'>" +
            "<img src='"+img+"'>" +
            "<h2>"+enObj.Name+ "</h2>"+
            "<p>"+(enObj.EnumInfo?enObj.EnumInfo:"")+"</p>" +
            "</a></li>";
    }

    // Pages bei Bedarf rendern
    $(document).bind( "pagebeforechange", function( e, data ) {
        if ( typeof data.toPage === "string" ) {
            var u = $.mobile.path.parseUrl( data.toPage );
            // Kommt die Zeichenkette #page_ im Hash vor?
            if ( u.hash.search(/^#page_/) !== -1 ) {
                var pageId = (u.hash.slice(6));
                if (!$("div#page_"+pageId).html()) {
                    renderPage(pageId);
                }
            }
        }
    });

    // Link-Seite aufbauen
    function renderLinks() {




        for (var i = 0; i < yahui.links.length; i++) {
            var link = yahui.links[i];

            var item = "<li><a href='"+link.url+"'>" +
                "<img src='images/user/"+link.img+"'>" +
                "<h2>"+link.text+ "</h2>"+
                "<p>"+link.subtext+"</p>" +
                "</a></li>";

            $("ul#listLinks").append(item);
        }


    }

    // Baut eine Page auf
    function renderPage(pageId, prepend) {
        //console.log("renderPage("+pageId+")");
        var regaObj = (regaObjects[pageId]);
        var name, link;
        switch (regaObj.TypeName) {
        case "FAVORITE":
            name = "Favoriten";
            link = "#favs";
            break;
        case "ENUM_ROOMS":
            name = "Räume";
            link = "#rooms";
            break;
        case "ENUM_FUNCTIONS":
            name = "Gewerke";
            link = "#funcs";
            break;
        default:
            name = "Zurück";
            link = "#";
        }

        var page = '<div id="page_'+pageId+'" data-role="page">' +
            '<div data-role="header" data-position="fixed" data-id="f2" data-theme="b">' +
            '<a href="'+link+'" data-role="button" data-icon="arrow-l" data-theme="b">'+name+'</a>' +
            '<h1>' +yahui.prefix+regaObj.Name + '</h1>' +
            //'<a href="?edit" data-icon="gear">Edit</a>' +
            '</div><div data-role="content">' +
            '<ul data-role="listview" id="list_'+pageId+'"></ul></div></div>';
        if (prepend) {
            body.prepend(page);
        } else {
            body.append(page);
        }
        var list = $("ul#list_"+pageId);
        for (var l in regaObj.Channels) {
            var chId = regaObj.Channels[l];
            renderWidget(list, chId);
        }
    }

    function renderVariables() {
        var page = '<div id="variables" data-role="page">' +
            '<div data-role="header" data-position="fixed" data-id="f2" data-theme="b">' +
            '<a href="#links" data-role="button" data-icon="arrow-l" data-theme="b">Erweiterungen</a>' +
            '<h1>Variablen</h1>' +
            //'<a href="?edit" data-icon="gear">Edit</a>' +
            '</div><div data-role="content">' +
            '<ul data-role="listview" id="list_variables"></ul></div></div>';
        body.prepend(page);
        var list = $("ul#list_variables");
        for (var l = 0; l < regaIndex.VARDP.length; l++) {
            var chId = regaIndex.VARDP[l];
            renderWidget(list, chId);
        }
        renderPrograms();
    }

    function renderPrograms() {
        var page = '<div id="programs" data-role="page">' +
            '<div data-role="header" data-position="fixed" data-id="f2" data-theme="b">' +
            '<a href="#links" data-role="button" data-icon="arrow-l" data-theme="b">Erweiterungen</a>' +
            '<h1>Programme</h1>' +
            //'<a href="?edit" data-icon="gear">Edit</a>' +
            '</div><div data-role="content">' +
            '<ul data-role="listview" id="list_programs"></ul></div></div>';
        body.prepend(page);
        var list = $("ul#list_programs");
        for (var l = 0; l < regaIndex.PROGRAM.length; l++) {
            var chId = regaIndex.PROGRAM[l];
            renderWidget(list, chId);
        }
    }

    // erzeugt ein Bedien-/Anzeige-Element
    function renderWidget(list, id) {
        var el = regaObjects[id];
        var since = "";
        var lowbat = "";
        var elId = list.attr("id") + "_" + id;

        var img, defimg = "images/default/widget.png";
        if (yahui.images[id]) {
            img = "images/user/" + yahui.images[id];
        } else {
            img = defimg;
        }
        //console.log("renderWidget("+id+") "+el.TypeName+" "+el.Name);
        switch (el.TypeName) {
        case "CHANNEL":
            if (el.DPs.LOWBAT && datapoints[el.DPs.LOWBAT].Value) {
                lowbat = '<img class="yahui-lowbat" src="images/default/lowbat.png"/>';
            }
            switch (el.HssType) {

                case "DIMMER":
                    defimg = "images/default/dimmer.png";
                    var levelId = regaObjects[id].DPs.LEVEL;
                    var workingId = regaObjects[id].DPs.WORKING;
                    var directionId = regaObjects[id].DPs.DIRECTION;
                    content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                        '<div class="yahui-a">'+el.Name+'</div>' +
                        '<div class="yahui-b">' +
                        '<select id="switch_'+elId+'" data-hm-id="'+levelId+'" name="switch_'+elId+'" data-role="slider">' +
                        '<option value="0">Aus</option>' +
                        '<option value="1"'+((datapoints[levelId][0] != 0) ?' selected':'')+'>An</option>' +
                        '</select>'+lowbat+'<span data-hm-id="'+directionId+'" class="yahui-direction"></span></div><div class="yahui-c">' +
                        '<input id="'+elId+'" type="range" data-hm-factor="100" data-hm-id="'+levelId +
                        '" name="slider_'+elId+'" id="slider_'+elId+'" min="0" max="100" value="'+(datapoints[levelId][0]*100)+'"/></div></li>';

                    list.append(content);

                    setTimeout(function () {
                        $("#"+elId).on( 'slidestop', function( event ) {
                            //console.log("slide "+event.target.value / (event.target.dataset.hmFactor?event.target.dataset.hmFactor:1)+" "+event.target.dataset.hmId);
                            yahui.socket.emit("setState", [parseInt(event.target.dataset.hmId,10), event.target.value / (event.target.dataset.hmFactor?event.target.dataset.hmFactor:1)]);
                        });
                        $("#switch_"+elId).on( 'slidestop', function( event ) {
                            //console.log("slide "+event.target.value+" "+event.target.dataset.hmId);
                            yahui.socket.emit("setState", [parseInt(event.target.dataset.hmId,10), parseInt(event.target.value,10)]);
                        });
                    }, 500);


                    break;
                case "BLIND":
                    defimg = "images/default/blind.png";
                    img = (img ? img : defimg);
                    var levelId = regaObjects[id].DPs.LEVEL;
                    var workingId = regaObjects[id].DPs.WORKING;
		            content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                        '<div class="yahui-a">'+el.Name+'</div>' +
                        '<div class="yahui-b"><select data-hm-id="'+levelId+'" name="switch_state" data-role="slider">' +
                        '<option value="0">Zu</option>' +
                        '<option value="1"'+((datapoints[levelId][0] != 0) ?' selected':'')+'>Auf</option>' +
                        '</select></div><div class="yahui-c">' +
                        '<input type="range" data-hm-factor="100" data-hm-id="'+levelId +
                        '" name="slider-1" id="slider-1" min="0" max="100" value="'+(datapoints[levelId][0]*100)+'"/></div></li>';

                    list.append(content);

                    setTimeout(function () {
                        $("#"+elId).on( 'slidestop', function( event ) {
                            //console.log("slide "+event.target.value / (event.target.dataset.hmFactor?event.target.dataset.hmFactor:1)+" "+event.target.dataset.hmId);
                            yahui.socket.emit("setState", [parseInt(event.target.dataset.hmId,10), event.target.value / (event.target.dataset.hmFactor?event.target.dataset.hmFactor:1)]);
                        });
                    }, 500);
                    break;
                case "KEY":
                case "VIRTUAL_KEY":
                    defimg = "images/default/key.png";
                    img = (img ? img : defimg);
                    var shortId = regaObjects[id].DPs.PRESS_SHORT;
                    var longId = regaObjects[id].DPs.PRESS_LONG;
                    content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                        '<div class="yahui-a">'+el.Name+'</div>' +
                        '<div class="yahui-b">' +
                        '<input type="button" data-hm-id="'+shortId+'" name="press_short" value="kurz" data-inline="true"/> ' +
                        '<input type="button" data-hm-id="'+longId+'" name="press_long" value="lang" data-inline="true"/>' +
                        lowbat +
                        '</div></li>';
                    list.append(content);
                    break;
                case "SWITCH":
                    defimg = "images/default/switch.png";
                    img = (img ? img : defimg);
                    var stateId = regaObjects[id].DPs.STATE;
                    content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                        '<div class="yahui-a">'+el.Name+'</div>' +
                        '<div class="yahui-b">' +
 
                        '<select id="switch_'+elId+'" data-hm-id="'+stateId+'" name="switch_'+elId+'" data-role="slider">' +
                        '<option value="0">Aus</option>' +
                        '<option value="1"'+((datapoints[stateId][0] != 0) ? ' selected' : '')+'>An</option>' +
                        '</select>' +
                        lowbat +
                        '</div></li>';
                    list.append(content);
                    setTimeout(function () {
                        $("#switch_"+elId).on( 'slidestop', function( event ) {
                            //console.log("slide "+event.target.value+" "+event.target.dataset.hmId);
                            yahui.socket.emit("setState", [parseInt(event.target.dataset.hmId,10), parseInt(event.target.value,10)]);
                        });
                    }, 500);
                    break;
                case "MOTION_DETECTOR":
                    since = " <span class='yahui-since'>seit <span class='hm-html-timestamp' data-hm-id='"+el.DPs.MOTION+"'>"+datapoints[el.DPs.MOTION][1]+"</span></span>";
                    defimg = "images/default/motion.png";
                    img = (img ? img : defimg);
                    content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                        '<div class="yahui-a">'+el.Name+'</div>' +
                        '<div class="yahui-b">' + lowbat +
                        '</div><div class="yahui-c"><h3>' +
                        '<span style="'+(datapoints[el.DPs.MOTION][0]?'display:none':'')+'" data-hm-id="'+el.DPs.MOTION+'" data-hm-state="false" style="">keine Bewegung</span>' +
                        '<span style="'+(datapoints[el.DPs.MOTION][0]?'':'display:none')+'" data-hm-id="'+el.DPs.MOTION+'" data-hm-state="true" style="">Bewegung</span>' +
                        since +
                        '</h3><p>Helligkeit: ' + datapoints[el.DPs.BRIGHTNESS][0] +
                        '</p></div></li>';
                    list.append(content);
                    break;
                case "CLIMATECONTROL_VENT_DRIVE":
                    //since = " <span class='yahui-since'>seit <span class='hm-html-timestamp' data-hm-id='"+el.DPs.VALVE_STATE+"'>"+datapoints[el.DPs.VALVE_STATE][1]+"</span></span>";
                    content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                        '<div class="yahui-a">'+el.Name+'</div>' +
                        '<div class="yahui-b">' + lowbat +
                        '</div><div class="yahui-c"><h3>' +
                        '<span style="" data-hm-id="'+el.DPs.VALVE_STATE+'" class="hm-html">'+datapoints[el.DPs.VALVE_STATE][0]+'</span>' +
                        regaObjects[el.DPs.VALVE_STATE].ValueUnit +
                        //since +
                        '</h3></div></li>';
                    list.append(content);
                    break;
                case "CLIMATECONTROL_REGULATOR":
                    //since = " <span class='yahui-since'>seit <span class='hm-html-timestamp' data-hm-id='"+el.DPs.VALVE_STATE+"'>"+datapoints[el.DPs.VALVE_STATE][1]+"</span></span>";
                    content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                        '<div class="yahui-a">'+el.Name+'</div>' +
                        '<div class="yahui-b">' + lowbat +
                        '</div><div class="yahui-c">' +
                        '<div style="display: inline-block; width: 70px;">' +
                        '<input id="input_'+id+'" size="3" type="number" pattern="[0-9\.]*" data-mini="false" id="input_'+id+'" class="hm-val" data-hm-id="'+el.DPs.SETPOINT+'" value="'+datapoints[el.DPs.SETPOINT][0]+'"  />' +
                        '</div> '+
                        regaObjects[el.DPs.SETPOINT].ValueUnit +
                        '</div></li>';
                    list.append(content);
                    setTimeout(function () {
                        $("#input_"+id).change(function( event ) {
                            //console.log("input "+event.target.value+" "+event.target.dataset.hmId);
                            //var id = event.target.dataset.hmId;
                            var val = $("#input_"+id).val();
                            //console.log("setState"+JSON.stringify([id, val]));
                            yahui.socket.emit("setState", [id, val]);
                        });
                    }, 500);
                    break;
                case "WINDOW_SWITCH_RECEIVER":
                    break;
                case "WEATHER":
                    defimg = "images/default/motion.png";
                    img = (img ? img : defimg);
                    if (el.DPs.DEW_POINT) {
                        // CUxD
                        content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                            '<div class="yahui-a">'+el.Name+'</div>' +
                            '<div class="yahui-b">' + lowbat +
                            '</div><div class="yahui-c"><h3>' +
                            '<span style="" data-hm-id="'+el.DPs.TEMPERATURE+'" class="hm-html">'+datapoints[el.DPs.TEMPERATURE][0]+'</span>' +
                            regaObjects[el.DPs.TEMPERATURE].ValueUnit +
                            ' <span class="yahui-since">(24h min <span data-hm-id="'+el.DPs.TEMP_MIN_24H+'" class="hm-html">'+datapoints[el.DPs.TEMP_MIN_24H][0]+'</span>' +
                            regaObjects[el.DPs.TEMP_MIN_24H].ValueUnit +
                            ' max <span data-hm-id="'+el.DPs.TEMP_MAX_24H+'" class="hm-html">'+datapoints[el.DPs.TEMP_MAX_24H][0]+'</span>' +
                            regaObjects[el.DPs.TEMP_MAX_24H].ValueUnit +
                            ')</span></h3><p>Luftfeuchte: <span style="" data-hm-id="'+el.DPs.HUMIDITY+'" class="hm-html">' + datapoints[el.DPs.HUMIDITY][0] +
                            '</span>' + regaObjects[el.DPs.HUMIDITY].ValueUnit +
                            ', Taupunkt: <span style="" data-hm-id="'+el.DPs.DEW_POINT+'" class="hm-html">' + datapoints[el.DPs.DEW_POINT][0] +
                            '</span>'+regaObjects[el.DPs.DEW_POINT].ValueUnit+'</p></div></li>';
                    } else {
                        // HomeMatic
                        content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                            '<div class="yahui-a">'+el.Name+'</div>' +
                            '<div class="yahui-b">' + lowbat +
                            '</div><div class="yahui-c"><h3>' +
                            '<span style="" data-hm-id="'+el.DPs.TEMPERATURE+'" class="hm-html">'+datapoints[el.DPs.TEMPERATURE][0]+'</span>' +
                            regaObjects[el.DPs.TEMPERATURE].ValueUnit +
                            '</h3><p>Luftfeuchte: <span style="" data-hm-id="'+el.DPs.HUMIDITY+'" class="hm-html">' + datapoints[el.DPs.HUMIDITY][0] +
                            '</span>' + regaObjects[el.DPs.HUMIDITY].ValueUnit +
                            '</p></div></li>';
                    }

                    list.append(content);
                    break;
                case "SMOKE_DETECTOR_TEAM":
                    //since = " <span class='yahui-since'>seit <span class='hm-html-timestamp' data-hm-id='"+el.DPs.STATE+"'>"+datapoints[el.DPs.STATE][1]+"</span></span>";
                    defimg = "images/default/smoke.png";
                    img = (img ? img : defimg);
                    content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                        '<div class="yahui-a">'+el.Name+'</div>' +
                        '<div class="yahui-b">' + lowbat +
                        '</div><div class="yahui-c"><h3>' +
                        '<span style="color: #080; '+(datapoints[el.DPs.STATE][0]?'display:none':'')+'" data-hm-id="'+el.DPs.STATE+'" data-hm-state="false">kein Rauch erkannt</span>' +
                        '<span style="color: #c00; '+(datapoints[el.DPs.STATE][0]?'':'display:none')+'" data-hm-id="'+el.DPs.STATE+'" data-hm-state="true">Alarm</span>' +
                        //since +
                        '</h3></div></li>';
                    list.append(content);
                    break;
                case "SHUTTER_CONTACT":
                    since = " <span class='yahui-since'>seit <span class='hm-html-timestamp' data-hm-id='"+el.DPs.STATE+"'>"+datapoints[el.DPs.STATE][1]+"</span></span>";
                    defimg = "images/default/motion.png";
                    img = (img ? img : defimg);
                    content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                        '<div class="yahui-a">'+el.Name+'</div>' +
                        '<div class="yahui-b">' + lowbat +
                        '</div><div class="yahui-c"><h3>' +
                        '<span style="color: #080; '+(datapoints[el.DPs.STATE][0]?'display:none':'')+'" data-hm-id="'+el.DPs.STATE+'" data-hm-state="false">geschlossen</span>' +
                        '<span style="color: #c00; '+(datapoints[el.DPs.STATE][0]?'':'display:none')+'" data-hm-id="'+el.DPs.STATE+'" data-hm-state="true">geöffnet</span>' +
                        since +
                        '</h3></div></li>';
                    list.append(content);
                    break;
                case "ROTARY_HANDLE_SENSOR":
                    since = " <span class='yahui-since'>seit <span class='hm-html-timestamp' data-hm-id='"+el.DPs.STATE+"'>"+datapoints[el.DPs.STATE][1]+"</span></span>";
                    defimg = "images/default/motion.png";
                    img = (img ? img : defimg);
                    content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                        '<div class="yahui-a">'+el.Name+'</div>' +
                        '<div class="yahui-b">' + lowbat +
                        '</div><div class="yahui-c"><h3>' +
                        '<span data-hm-id="'+el.DPs.STATE+'" data-hm-state="0" style="color: #080; '+(datapoints[el.DPs.STATE][0]!=0?'display:none':'')+'">geschlossen</span>' +
                        '<span data-hm-id="'+el.DPs.STATE+'" data-hm-state="1" style="color: #aa0; '+(datapoints[el.DPs.STATE][0]!=1?'display:none':'')+'">gekippt</span>' +
                        '<span data-hm-id="'+el.DPs.STATE+'" data-hm-state="2" style="color: #c00; '+(datapoints[el.DPs.STATE][0]!=2?'display:none':'')+'">geöffnet</span>' +
                        since + '</h3></div></li>';
                    list.append(content);
                    break;

                default:

                    img = (img ? img : defimg);
                    content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                        '<div class="yahui-a">'+el.Name+'</div>' +
                        '<div class="yahui-b" style="font-size:12px"><span style="display: inline-block; padding-top:5px;">' + el.HssType +
                        lowbat +
                        '</div><div class="yahui-c"><table class="yahui-datapoints">';
                    for (var dp in regaObjects[id].DPs) {
                        var dpId = regaObjects[id].DPs[dp];
                        var val = datapoints[dpId][0];

                        // Meter-Datenpunkt auf 3-Nachkommastellen formatieren.
                        if (regaObjects[dpId].Name.match(/\.METER$/)) {
                            val = val.toFixed(3);
                        }
                        if (regaObjects[dpId].Name.match(/\.LOWBAT$/)) {

                        } else {
                            content += "<tr><td>"+dp+"</td><td><span class='hm-html' data-hm-id='"+dpId+"'>"+val+"</span>"+regaObjects[dpId].ValueUnit+"</td></tr>";
                        }
                    }
                    content += "</table></div></li>";
                    list.append(content);
            }
            break;
        case "VARDP":
            console.log("VARDP "+id);
            // WebMatic ReadOnly-Flag -> (r) in Variablen-Beschreibung
            var readOnly;
            if (regaObjects[id].DPInfo) {
                readOnly = (regaObjects[id].DPInfo.match(/\([^\)]*r[^\)]*\)/) ? true : false );
            }
            img = (img ? img : defimg);
            if (readOnly) {
                content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                    '<div class="yahui-a">'+el.Name+'</div>' +
                    '<div class="yahui-bc">';
                switch (regaObjects[id].ValueType) {
                case 2:
                case 16:
                    var valueList = regaObjects[id].ValueList.split(";")
                    var val = datapoints[id][0];
                    if (val === true) { val = 1; }
                    if (val === false) { val = 0; }
                    content += "<span class='hm-html' data-hm-id='"+id+"'>"+valueList[val]+"</span>"+regaObjects[id].ValueUnit+"</div></li>";
                    break;

                default:
                    content += "<span class='hm-html' data-hm-id='"+id+"'>"+datapoints[id][0]+"</span>"+regaObjects[id].ValueUnit+"</div></li>";
                }
                list.append(content);



            } else {
                content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                    '<div class="yahui-a">'+el.Name+'</div>' +
                    '<div class="yahui-bc">';
                switch (regaObjects[id].ValueType) {
                    case 2: // Boolean
                    case 16: // Werteliste
                        var selected = "";
                        if (regaObjects[id].ValueList && regaObjects[id].ValueList != "") {
                            var valueList = regaObjects[id].ValueList.split(";")
                        }
                         var val = datapoints[id][0];
                        if (val == true) { val = 1; }
                        if (val == false) { val = 0; }
                        content += '<select id="select_'+elId+'" data-hm-id="'+id+'">';
                        for (var i = 0; i < valueList.length; i++) {
                            if (datapoints[id][0] == i) {
                                selected = " selected";
                            } else {
                                selected = "";
                            }
                            content += '<option value="'+i+'"'+selected+'>'+valueList[i]+'</option>';
                        }
                        content += '</select>'+regaObjects[id].ValueUnit+"</div></li>";
                        list.append(content);
                        setTimeout(function () {
                            $("#select_"+elId).on( 'change', function( event ) {
                                //console.log("select "+event.target.value+" "+event.target.dataset.hmId);
                                var val = parseInt($("#select_"+elId+" option:selected").val(), 10);

                                yahui.socket.emit("setState", [parseInt(event.target.dataset.hmId,10), val]);
                            });
                        }, 500);
                        break;

                    case 4: // Zahlenwert
                        var unit = regaObjects[id].ValueUnit;
                    case 20: // Zeichenkette
                        if (!unit) { unit = ""; }
                        var val = datapoints[id][0];
                        content += '<input type="text" id="input_'+id+'" class="hm-val" data-hm-id="'+id+'" value="'+String(datapoints[id][0]).replace(/"/g, "&quot;")+'"  />'+unit;
                        list.append(content);
                        setTimeout(function () {
                            $("#input_"+id).change(function( event ) {
                                //console.log("input "+event.target.value+" "+event.target.dataset.hmId);
                                //var id = event.target.dataset.hmId;
                                var val = $("#input_"+id).val();
                                //console.log("setState"+JSON.stringify([id, val]));
                                yahui.socket.emit("setState", [id, val]);
                            });
                        }, 500);
                        break;
                default:
                    content += "<span class='hm-html' data-hm-id='"+id+"'>"+datapoints[id][0]+"</span>"+regaObjects[id].ValueUnit+"</div></li>";
                    list.append(content);
                }

            }
            break;
        case "PROGRAM":

            img = (img ? img : defimg);
            content = '<li class="yahui-widget" data-hm-id="'+id+'"><img src="'+img+'">' +
                '<div class="yahui-a">'+el.Name+'</div>' +
                '<div class="yahui-bc">' +
                '<a href="#" class="yahui-program" data-hm-id="'+id+'" data-role="button" data-icon="arrow-r">Programm ausf&uuml;hren</a>' +
                "</div></li>";
            list.append(content);
            setTimeout(function () {
                $('a.yahui-program[data-hm-id="'+id+'"]').on('click', function( event ) {
                    //console.log("programExecute "+id);
                    yahui.socket.emit("programExecute", [id]);
                });
            }, 500);
            break;
        default:
        }


    }

    function updateWidgets(id, val, ts, ack) {

        $(".hm-html[data-hm-id='"+id+"']").each(function () {
            var $this = $(this);
            var datapoint   = regaObjects[id];
            switch (datapoint.ValueType) {
                case 2:
                case 16:
                    if (regaObjects[id].ValueList && regaObjects[id].ValueList != "") {
                        var valueList = regaObjects[id].ValueList.split(";")
                        if (val == true) { val = 1; }
                        if (val == false) { val = 0; }
                        $this.html(valueList[val]);
                    } else {
                        $this.html(val);
                    }
                    break;
                default:
                    $this.html(val);
            }
        });

        $(".hm-html-timestamp[data-hm-id='"+id+"']").each(function () {
            $(this).html(ts);
        });

        $("[data-hm-state][data-hm-id='"+id+"']").each(function () {
            var $this = $(this);
            var datapoint   = regaObjects[id];
            var state = $this.attr("data-hm-state");

            if (state === "false") {
                state = false;
            } else if (state === "true") {
                state = true;
            } else {
                state = parseInt(state, 10);
            }
            if (state == val) {
                $this.show();
            } else {
                $this.hide();
            }
        });

        $(".hm-val[data-hm-id='"+id+"']").each(function () {
            var $this = $(this);
            var datapoint   = regaObjects[id];
            switch (datapoint.ValueType) {
                case 2:
                case 16:
                    var valueList = regaObjects[id].ValueList.split(";")
                    if (val == true) { val = 1; }
                    if (val == false) { val = 0; }
                    $this.val(valueList[val]);
                    break;
                default:
                    // Todo Update verhindern wenn Focus, allerdings muss dann Update erfolgen wenn Focus wieder weg ist.
                    //if (!$this.parent().hasClass("ui-focus")) {
                    $this.val(val);
                //}
            }


        });



        $("input[data-type='range'][data-hm-id='"+id+"']").each(function () {
            var working = false;
            var direction = 0;
            // Eltern-Element aus Index suchen
            var channel     = regaObjects[regaObjects[id].Parent];
            if (channel) {
                if (channel.DPs.WORKING) {
                    working = datapoints[channel.DPs.WORKING][0];
                }
                if (channel.DPs.DIRECTION) {
                    direction = datapoints[channel.DPs.WORKING][0];
                }
            }
            // Eltern-Element aus Index suchen
            var channel     = regaObjects[regaObjects[id].Parent];
            if (channel) {
                if (channel.DPs.WORKING) {
                    working = datapoints[channel.DPs.WORKING][0];
                }
            }
            //console.log(channel.Name+" working="+working);
            if (!working) {
                var $this = $(this);
                var pos = val;
                if ($this.data("hm-factor")) {
                    pos = pos * $this.data("hm-factor");
                }
                $this.val(pos).slider('refresh');
            }
        });
        $("select[id^='switch'][data-role='slider'][data-hm-id='"+id+"']").each(function () {
            var $this = $(this);
            var working = false;
            var direction = 0;
            // Eltern-Element aus Index suchen
            var channel     = regaObjects[regaObjects[id].Parent];
            if (channel) {
                if (channel.DPs.WORKING) {
                    working = datapoints[channel.DPs.WORKING][0];
                }
                if (channel.DPs.DIRECTION) {
                    direction = datapoints[channel.DPs.WORKING][0];
                }
            }
            //console.log(channel.Name+" working="+working);
            if (!working) {
                if (!val) {
                    $this.find("option[value='1']").removeAttr("selected");
                    $this.find("option[value='0']").prop("selected", true);
                } else {
                    $this.find("option[value='0']").removeAttr("selected");
                    $this.find("option[value='1']").prop("selected", true);
                }
                $this.slider("refresh");
            }

        });

        $("select[id^=select][data-hm-id='"+id+"']").each(function() {
            //console.log("select change");
            var $this = $(this);
            $this.find("option").removeAttr("selected");
            $this.find("option[value='"+val+"']").prop("selected", true);
            $this.selectmenu("refresh");
        });
    }

});
