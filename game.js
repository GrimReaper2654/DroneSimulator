/*
------------------------------------------------------Changelog------------------------------------------------------
27/08/2023
 • commenced work
- Tom Qiu

28/09/2023
 • Official start of project
 • Disabled collision detection
- Tom Qiu

2/10/2023
 • added tank and drone
 • reenabled collision detection
 • added 'blaster' created by Tiger
- Tom Qiu

5/10/2023
 • added obstacle collision (1/4)
- Tom Qiu

5/10/2023
 • improved obstacle collision (2/4)
- Tom Qiu

6/10/2023
 • finished obstacle collision (4/4)
 • updated colour scheme
 • added line collision (used for melee weapons with long hitboxes)
 • added hp gauge
- Tom Qiu

7/10/2023
 • fixed shield colour (hp > maxhp)
 • added armour to tank
 • added explosions
- Tom Qiu

8/10/2023
 • created level 1 map
- Tiger

9/10/2023
 • centered wall parts
 • fixed obstacle collision (5/4)
- Tom Qiu

23/11/2023
 • resumed updating changelog
 • energy shields implemented
 • speed buff implemented
 • lowered TPS but increased FPS
 • reworked level system
 • added player script support
 • added checkpoints
 • improved enemy AI
 • created over 10 new levels for a total of 23 levels
 • created even more weapons
 • Bug where your own bullets collide with your shield is now a feature
 • Discovered bug where if you die on a checkpoint and there is one enemy remaining, you win the game
 • performance optimisations (the game runs smoother now)
- Tom Qiu

---------------------------------------------------------------------------------------------------------------------
*/

// The support functions that might not be necessary
function isin(a, b) { // check is a in b
    for (var i = 0; i < b.length; i += 1) {
        if (a == b[i]) {
            return true;
        }
    }
    return false;
};

function randchoice(list, remove = false) { // chose 1 from a list and update list
    let length = list.length;
    let choice = randint(0, length-1);
    if (remove) {
        let chosen = list.splice(choice, 1);
        return [chosen, list];
    }
    return list[choice];
};

function randint(min, max, notequalto=false) { // Randint returns random interger between min and max (both included)
    if (max - min <= 1) {
        return min;
    }
    var gen = Math.floor(Math.random() * (max - min + 1)) + min;
    var i = 0; // 
    while (gen != min && gen != max && notequalto && i < 100) { // loop max 100 times
        gen = Math.floor(Math.random() * (max - min + 1)) + min;
        i += 1;
        console.log('calculating...');
    }
    if (i >= 100) {
        console.log('ERROR: could not generate suitable number');
    }
    return gen;
};

function replacehtml(text) {
    document.getElementById("game").innerHTML = text;
};

function addImage(img, x, y, cx, cy, scale, r, absolute, opacity=1) {
    var c = document.getElementById('main');
    var ctx = c.getContext("2d");
    ctx.globalAlpha = opacity;
    if (absolute) {
        ctx.setTransform(scale, 0, 0, scale, x, y); // sets scale and origin
        ctx.rotate(r);
        ctx.drawImage(img, -cx, -cy);
    } else {
        ctx.setTransform(scale, 0, 0, scale, x-player.x+display.x/2, y-player.y+display.y/2); // position relative to player
        ctx.rotate(r);
        ctx.drawImage(img, -cx, -cy);
    }
    ctx.globalAlpha = 1.0;
};

function clearCanvas(canvas) {
    var c = document.getElementById(canvas);
    var ctx = c.getContext("2d");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, display.x, display.y);
    ctx.restore();
};

function drawLine(pos, r, length, style, absolute) {
    var c = document.getElementById("main");
    var ctx = c.getContext("2d");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (style) {
        ctx.strokeStyle = style.colour;
        ctx.lineWidth = style.width*data.constants.zoom;
        ctx.globalAlpha = style.opacity;
    }
    ctx.beginPath();
    if (absolute) {
        ctx.moveTo(pos.x*data.constants.zoom, pos.y*data.constants.zoom);
        ctx.lineTo((pos.x + length * Math.cos(r))*data.constants.zoom, (pos.y + length * Math.sin(r))*data.constants.zoom);
    } else {
        ctx.moveTo((pos.x-player.x)*data.constants.zoom+display.x/2, (pos.y-player.y)*data.constants.zoom+display.y/2);
        ctx.lineTo((pos.x-player.x + length * Math.cos(r))*data.constants.zoom+display.x/2, (pos.y-player.y + length * Math.sin(r))*data.constants.zoom+display.y/2);
    }
    ctx.stroke();
    ctx.restore();
};

function renderLine(pos, r, length, style) {
    let ns = undefined;
    switch (style) {
        case 'red':
            ns = data.red;
            break;
        case 'green':
            ns = data.green;
            break;
        case 'blue':
            ns = data.blue;
            break;
        case 'black':
            ns = data.black;
            break;
        case 'white':
        default:
            ns = data.white;
            break;
    }
    drawLine(pos, r-Math.PI/2, length, ns, false);
};

function sufficient(ability, cargo) {
    var sufficient = true
    for (var i=0; i < Object.keys(ability.cost).length; i += 1) {
        if (cargo[Object.keys(ability.cost)[i]] < ability.cost[Object.keys(ability.cost)[i]]) {
            sufficient = false;
        }
    }
    if (sufficient) {
        if (ability.reload) {
            ability.reload = ability.reloadTime;
        }
        for (var i=0; i < Object.keys(ability.cost).length; i += 1) {
            cargo[Object.keys(ability.cost)[i]] -= ability.cost[Object.keys(ability.cost)[i]];
        }
    }
    return [sufficient, ability, cargo];
};

function getDist(sPos, tPos) { 
    // Mathematics METHods
    var dx = tPos.x - sPos.x;
    var dy = tPos.y - sPos.y;
    var dist = Math.sqrt(dx*dx+dy*dy);
    return dist;
};

function correctAngle(a) {
    a = a%(Math.PI*2);
    return a;
};

function adjustAngle(a) {
    if (a > Math.PI) {
        a -= 2*Math.PI;
    }
    return a;
};

function rotateAngle(r, rTarget, increment) {
    if (Math.abs(r) > Math.PI*4 || Math.abs(rTarget) > Math.PI*4) {
        throw "Error: You f*cked up the angle thing again...";
        console.log(r, rTarget);
        r = correctAngle(r);
        rTarget = correctAngle(rTarget);
    }
    if (r == rTarget) {
        return correctAngle(r);
    }else if (rTarget - r <= Math.PI && rTarget - r > 0) {
        if (rTarget - r < increment) {
            r = rTarget;
        } else {
            r += increment;
        }
        return r;
    } else if (r - rTarget < Math.PI && r - rTarget > 0) {
        if (r - rTarget < increment) {
            r = rTarget;
        } else {
            r -= increment;
        }
        return correctAngle(r);
    } else {
        if (r < rTarget) {
            r += Math.PI*2;
        } else {
            rTarget += Math.PI*2;
        }
        return correctAngle(rotateAngle(r, rTarget, increment));
    }
};

function aim(initial, final) {
    if (initial == final) { 
        return 0;
    }
    let diff = {x: final.x - initial.x, y: initial.y - final.y};
    if (diff.x == 0) {
        if (diff.y > 0) {
            return 0;
        } else {
            return Math.PI;
        }
    } else if (diff.y == 0) {
        if (diff.x > 0) {
            return Math.PI/2;
        } else {
            return 3*Math.PI/2;
        }
    }
    let angle = Math.atan(Math.abs(diff.y / diff.x));
    if (diff.x > 0 && diff.y > 0) {
        return Math.PI/2 - angle;
    } else if (diff.x > 0 && diff.y < 0) {
        return Math.PI/2 + angle;
    } else if (diff.x < 0 && diff.y < 0) {
        return 3*Math.PI/2 - angle;
    } else {
        return 3*Math.PI/2 + angle;
    }
};

function offsetPoints(points, offset) {
    for (let i = 0; i < points.length; i++){
        points[i].x += offset.x;
        points[i].y += offset.y;
    }
    return points;
};

function roman(number) {
    if (number <= 0 || number >= 4000) {
        var symbols = ['0','1','2','3','4','5','6','7','8','9','¡','£','¢','∞','§','¶','œ','ß','∂','∫','∆','√','µ','†','¥','ø'];
        return `${randchoice(symbols)}${randchoice(symbols)}${randchoice(symbols)}`;
    }
    
    const romanNumerals = {
        M: 1000,
        CM: 900,
        D: 500,
        CD: 400,
        C: 100,
        XC: 90,
        L: 50,
        XL: 40,
        X: 10,
        IX: 9,
        V: 5,
        IV: 4,
        I: 1
    };
    
    let romanNumeral = '';
    
    for (let key in romanNumerals) {
        while (number >= romanNumerals[key]) {
            romanNumeral += key;
            number -= romanNumerals[key];
        }
    }
    return romanNumeral;
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

function toColour(colour) {
    return `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${colour.a})`;
};

function drawCircle(x, y, radius, fill, stroke, strokeWidth, opacity, absolute) { // draw a circle
    var canvas = document.getElementById('main');
    var ctx = canvas.getContext("2d");
    ctx.resetTransform();
    ctx.beginPath();
    ctx.globalAlpha = opacity;
    if (absolute) {
        ctx.arc(x*data.constants.zoom, y*data.constants.zoom, radius*data.constants.zoom, 0, 2 * Math.PI, false);
    } else {
        ctx.arc((-player.x+x)*data.constants.zoom+display.x/2, (-player.y+y)*data.constants.zoom+display.y/2, radius*data.constants.zoom, 0, 2 * Math.PI, false);
    }
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.lineWidth = strokeWidth*data.constants.zoom;
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
};

function displaytxt(txt, pos) {
    var canvas = document.getElementById("canvasOverlay");
    var ctx = canvas.getContext("2d");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Set the font and text color
    ctx.font = "20px Verdana";
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    // Display the points on the canvas
    ctx.fillText(txt, pos.x*data.constants.zoom, pos.y*data.constants.zoom);
    ctx.stroke();
    ctx.restore();
};

function rotatePolygon(point, r) {
    let points = JSON.parse(JSON.stringify(point));
    for (let i = 0; i < points.length; i++) {
        points[i].x = point[i].x * Math.cos(r) - point[i].y * Math.sin(r); 
        points[i].y = point[i].x * Math.sin(r) + point[i].y * Math.cos(r); 
    }
    return points
};

function drawPolygon(point, offset, r, fill, stroke, absolute, debug=false) {
    let points = JSON.parse(JSON.stringify(point));
    if (points.length < 3) {
        throw "Error: Your polygon needs to have at least 3 points dumbass";
    }
    points = rotatePolygon(points, r)
    var canvas = document.getElementById('main');
    var ctx = canvas.getContext("2d");
    ctx.resetTransform();
    ctx.beginPath();
    if (absolute) {
        ctx.moveTo((points[0].x + offset.x)*data.constants.zoom, (points[0].y + offset.y)*data.constants.zoom);
        if (debug) {displaytxt(`(${Math.round((points[0].x + offset.x)*data.constants.zoom)}, ${Math.round((points[0].y + offset.y)*data.constants.zoom)})`, {x: (points[0].x + offset.x)*data.constants.zoom, y: (points[0].y + offset.y)*data.constants.zoom});}
    } else {
        ctx.moveTo((points[0].x-player.x + offset.x)*data.constants.zoom+display.x/2, (points[0].y-player.y + offset.y)*data.constants.zoom+display.y/2);
        if (debug) {displaytxt(`(${Math.round((points[0].x-player.x + offset.x)*data.constants.zoom+display.x/2)}, ${Math.round((points[0].y-player.y + offset.y)*data.constants.zoom+display.y/2)})`, {x: (points[0].x-player.x + offset.x)*data.constants.zoom+display.x/2, y: (points[0].y-player.y + offset.y)*data.constants.zoom+display.y/2});}
        //if (debug) {displaytxt(`(${Math.round(points[0].x-player.x+display.x/2 + offset.x)}, ${Math.round(points[0].y-player.y+display.y/2 + offset.y)})`, {x: points[0].x-player.x+display.x/2 + offset.x, y: points[0].y-player.y+display.y/2 + offset.y});}
    }
    for (let i = 1; i < points.length; i++) {
        if (absolute) {
            ctx.lineTo((points[i].x + offset.x)*data.constants.zoom, (points[i].y + offset.y)*data.constants.zoom);
            if (debug) {displaytxt(`(${Math.round((points[i].x + offset.x)*data.constants.zoom)}, ${Math.round((points[i].y + offset.y)*data.constants.zoom)})`, {x: (points[i].x + offset.x)*data.constants.zoom, y: (points[i].y + offset.y)*data.constants.zoom});}
        } else {
            ctx.lineTo((points[i].x-player.x + offset.x)*data.constants.zoom+display.x/2, (points[i].y-player.y + offset.y)*data.constants.zoom+display.y/2);
            if (debug) {displaytxt(`(${Math.round((points[i].x-player.x + offset.x)*data.constants.zoom+display.x/2)}, ${Math.round((points[i].y-player.y + offset.y)*data.constants.zoom+display.y/2)})`, {x: (points[i].x-player.x + offset.x)*data.constants.zoom+display.x/2, y: (points[i].y-player.y + offset.y)*data.constants.zoom+display.y/2});}
            //if (debug) {displaytxt(`(${Math.round(points[i].x-player.x+display.x/2 + offset.x)}, ${Math.round(points[i].y-player.y+display.y/2 + offset.y)})`, {x: points[i].x-player.x+display.x/2 + offset.x, y: points[i].y-player.y+display.y/2 + offset.y});}
        }
    }
    ctx.closePath();
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.lineWidth = stroke.width*data.constants.zoom;
        ctx.strokeStyle = stroke.colour;
        ctx.stroke();
    }
};

function drawLight(x, y, radius) {
    var canvas = document.getElementById('main');
    var ctx = canvas.getContext("2d");
    ctx.beginPath();
    if (false) {
        ctx.arc(x*data.constants.zoom, y*data.constants.zoom, radius*data.constants.zoom, 0, 2 * Math.PI, false);
    } else {
        ctx.arc((player.x+x)*data.constants.zoom+display.x/2, (player.y+y)*data.constants.zoom+display.y/2, radius*data.constants.zoom, 0, 2 * Math.PI, false);
    }
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;

    ctx.fill();
};

function calculateDamage(bullet, ship) { // TODO: Might need reworking
    if (bullet.dmg > 0 && bullet.team != ship.team) {
        if (bullet.dmg > ship.shield.shieldCap) {
            bullet.dmg -= ship.shield.shield*(ship.shield.shield/bullet.dmg);
            ship.shield.shield = 0;
            ship.shield.cooldown = 300;
        } else {
            if (bullet.dmg < ship.shield.shield*0.1) {
                ship.shield.shield -= bullet.dmg/2;
                bullet.dmg = 0;
            } else if (bullet.dmg < ship.shield.shield*0.75) {
                ship.shield.shield -= bullet.dmg;
                bullet.dmg = 0;
                ship.shield.cooldown += 5;
            } else {
                bullet.dmg -= ship.shield.shield*0.75;
                ship.shield.shield *= 0.25;
                ship.shield.cooldown += 15;
            }
        }
        if (ship.shield.cooldown > 300) {
            ship.shield.cooldown = 300;
        }
        if (ship.shield.shield < 0) {
            ship.shield.shield = 0;
        }
        if (bullet.dmg < 0) {
            bullet.dmg = 0;
        }
        if (ship.upgrades) {
            if (ship.upgrades[19]) {
                bullet.dmg *= (1-(ship.upgrades[19].level-1)*0.1);
            }
        }
        ship.hp -= bullet.dmg;
        if (0-ship.hp > bullet.dmg*0.5) {
            bullet.v *= (0-ship.hp)/bullet.dmg;
            bullet.dmg = 0-ship.hp;
        } else {
            bullet.dmg = 0;
        }
    }
    return [bullet, ship];
};

function bar(image, pos, size, step) {
    for (var i = 0; i < size; i += 1) {
        addImage('main', data.img[image], pos.x+i*step, pos.y, data.dim[image].x, data.dim[image].x, 1, 0)
    }
};

function healthBar(size, ship, step) {
    var length = size * step;
    var pos = {x: ship.x-length/2, y: ship.y + data.center[ship.type].y*1.5};
    var top = Math.round(ship.shield.shield / ship.shield.shieldCap * size);
    var bottom = Math.round(ship.hp / data.construction[ship.type].hp * size);
    bar('GREYCIRCLE', pos, size, step);
    bar('BLUECIRCLE', pos, top, step);
    bar('SILVERCIRCLE', pos, bottom, step);
};

function PlayerUiBar(level, max, pos, dim, fillColour, border) {
    var c = document.getElementById("main");
    var ctx = c.getContext("2d");

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (border != -1) {
        ctx.fillStyle = '#696969';
        ctx.fillRect(pos.x, pos.y, dim.x, dim.y);
    } else {
        border = 0;
    }
  
    const fillPercentage = level / max;
    ctx.fillStyle = fillColour;
    ctx.fillRect(pos.x+border, pos.y+border, fillPercentage * (dim.x-border*2), dim.y-border*2);

    ctx.restore();
};

function grid(spacing, reference) { // TODO: update colours
    /*
    var start = (player.y - display.y / 2) < 0 ? Math.ceil((player.y - display.y / 2) / spacing) * spacing : Math.floor((player.y - display.y / 2) / spacing) * spacing - spacing * 2;
    var end = (player.y + display.y / 2) < 0 ? Math.ceil((player.y + display.y / 2) / spacing) * spacing : Math.floor((player.y + display.y / 2) / spacing) * spacing + spacing * 2;
    for (let i = -display.x/data.constants.zoom; i <= end/data.constants.zoom; i += spacing) {
        drawLine({x: spacing ,y: i}, r=0, display.x/data.constants.zoom+spacing*2, {colour:'#000000',width:10,opacity:0.05}, false);
    }
    start = (player.x - display.x / 2) < 0 ? Math.ceil((player.x - display.x / 2) / spacing) * spacing : Math.floor((player.x - display.x / 2) / spacing) * spacing - spacing * 2;
    end = (player.x + display.x / 2) < 0 ? Math.ceil((player.x + display.x / 2) / spacing) * spacing : Math.floor((player.x + display.x / 2) / spacing) * spacing + spacing * 2;
    for (var i = start/data.constants.zoom; i < end/data.constants.zoom; i += spacing) {
        drawLine({x: i, y: -spacing}, r=Math.PI/2, display.y/data.constants.zoom+spacing*2, {colour:'#000000',width:10,opacity:0.05}, false);
    }*/
    for (let i = 0; i >= reference.x - (display.x/2 + spacing*5)/data.constants.zoom; i -= spacing) {
        drawLine({x: i, y: reference.y + (display.y/2 + spacing)/data.constants.zoom}, 3*Math.PI/2, (display.y + spacing*2)/data.constants.zoom, {colour:'#000000',width:10,opacity:0.05}, false);
    }
    for (let i = 0; i <= reference.x + (display.x/2 + spacing*5)/data.constants.zoom; i += spacing) {
        drawLine({x: i, y: reference.y + (display.y/2 + spacing)/data.constants.zoom}, 3*Math.PI/2, (display.y + spacing*2)/data.constants.zoom, {colour:'#000000',width:10,opacity:0.05}, false);
    }
    for (let i = 0; i >= reference.y - (display.y/2 + spacing*5)/data.constants.zoom; i -= spacing) {
        drawLine({x: reference.x + (display.x/2 + spacing)/data.constants.zoom, y: i}, Math.PI, (display.x + spacing*2)/data.constants.zoom, {colour:'#000000',width:10,opacity:0.05}, false);
    }
    for (let i = 0; i <= reference.y + (display.y/2 + spacing*5)/data.constants.zoom; i += spacing) {
        drawLine({x: reference.x + (display.x/2 + spacing)/data.constants.zoom, y: i}, Math.PI, (display.x + spacing*2)/data.constants.zoom, {colour:'#000000',width:10,opacity:0.05}, false);
    }
};

function renderExplosion(explosion) {
    drawCircle(explosion.x-explosion.r, explosion.y-explosion.r, explosion.r, '#fccbb1', '#f7b28d', 0.1, 0.2*explosion.transparancy, false);
    drawCircle(explosion.x-explosion.r, explosion.y-explosion.r, explosion.r, false, '#f7b28d', 5, 0.2);
    drawCircle(explosion.x-explosion.r, explosion.y-explosion.r, Math.max(explosion.r-20, 0), false, '#fcd8d2', 20, 0.1*explosion.transparancy, false);
    drawCircle(explosion.x-explosion.r, explosion.y-explosion.r, Math.max(explosion.r-15, 0), false, '#fcd8d2', 15, 0.1*explosion.transparancy, false);
    drawCircle(explosion.x-explosion.r, explosion.y-explosion.r, Math.max(explosion.r-10, 0), false, '#fcd8d2', 10, 0.1*explosion.transparancy, false);
    drawCircle(explosion.x-explosion.r, explosion.y-explosion.r, Math.max(explosion.r-5, 0), false, '#fcd8d2', 5, 0.1*explosion.transparancy, false);
    drawLight(explosion.x-explosion.r, explosion.y-explosion.r, explosion.r*1.1);
};

function handleExplosion(explosion) {
    //console.log(explosion);
    if (explosion.r >= explosion.maxR) {
        explosion.transparancy *= 0.75;
        explosion.r *= 1.2;
        explosion.active = false;
    }
    if (explosion.r < explosion.maxR) {
        explosion.active = true;
        explosion.r += explosion.expandSpeed;
        if (explosion.r > explosion.maxR) {
            explosion.r = explosion.maxR;
        }
    }
    if (explosion.transparancy > 0.25) {
        return explosion;
    } return false;
};

function normalDistribution(mean, sDiv) {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random(); 
    while (v === 0) v = Math.random(); 
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + z * sDiv;
};

function raySegmentIntersection(pointIn, segmentIn) {
    let point = vMath(pointIn, 1.1, 'multiply');
    let segment = {start: vMath(segmentIn.start, 1.1, 'multiply'), end: vMath(segmentIn.end, 1.1, 'multiply')};
    let A1 = adjustAngle(correctAngle(aim(point, segment.start)));
    let A2 = adjustAngle(correctAngle(aim(point, segment.end)));
    if ((A1 >= 0 && A2 <= 0 || A2 >= 0 && A1 <= 0) && Math.abs(A1) + Math.abs(A2) < Math.PI) {
        return true;
    }
    return false;
};

function pointInPolygon(point, polygon) {
    let inside = false;
    let cnt = 0;
    if (raySegmentIntersection(point, {start: polygon[0], end: polygon[polygon.length-1]})) {
        inside = !inside;
        cnt++;
    }
    for (let i = 0; i < polygon.length-1; i++) {
        if (raySegmentIntersection(point, {start: polygon[i], end: polygon[i+1]})) {
            inside = !inside;
            cnt++;
        }
    }
    return inside;
};

function vMath(v1, v2, mode) { 
    switch (mode) {
        case '||':
        case 'magnitude':
            return Math.sqrt(v1.x**2+v1.y**2);
        case '+': 
        case 'addition':
        case 'add':
            return {x: v1.x+v2.x, y: v1.y+v2.y};
        case '-': 
        case 'subtraction':
        case 'subtract':
            return {x: v1.x-v2.x, y: v1.y-v2.y};
        case '*': 
        case 'x': 
        case 'scalar multiplication':
        case 'multiplication':
        case 'multiply': // v2 is now a scalar
            return {x: v1.x*v2, y: v1.y*v2};
        case '/': 
        case 'division':
        case 'divide': // v2 is now a scalar
            return {x: v1.x/v2, y: v1.y/v2};
        case '•': 
        case '.': 
        case 'dot product': 
            return v1.x * v2.x + v1.y * v2.y;
        case 'cross product': // chat gpt, I believe in you (I doubt this is correct)
            return v1.x * v2.y - v1.y * v2.x;
        case 'projection':
        case 'vector resolute':
        return vMath(v2, vMath(v1, v2, '.')/vMath(v2, null, '||')**2, 'x');
        default:
            throw 'what are you trying to do to to that poor vector?';
    }
};

function toComponent(m, r) {
    return {x: m * Math.sin(r), y: -m * Math.cos(r)};
};

function toPol(i, j) {
    return {m: Math.sqrt(i**2+j**2), r: aim({x: 0, y: 0}, {x: i, y: j})};
};

function circleToPolygon(pos, r, sides) {
    let step = Math.PI*2/sides;
    let polygon = [];
    for(let i = 0; i < sides; i++) {
        polygon.push(vMath(toComponent(r, step*i),pos,'add'));
    }
    return polygon;
};

function pressKey(key) {
    orders.push({id: 'key', value: true});
}

function releaseKey(key) {
    orders.push({id: 'key', value: false});
}

const noAI = `
let orders = [];
return orders;
`;

const basicTurretAI = `
let orders = [];
let target = entities[0];
orders.push({id: 'aim', value: {x: target.x, y: target.y}});
orders.push({id: 'click', value: true});
return orders;
`;

const basicTankAI = `
let orders = [];
let target = entities[0];
orders.push({id: 'aim', value: {x: target.x, y: target.y}});
orders.push({id: 'click', value: true});
let nr = adjustAngle(correctAngle(aim(unit, target)-unit.r));
if (Math.abs(nr) > Math.PI/48) {
    if (nr > 0) {
        orders.push({id: 'd', value: true});
        orders.push({id: 'a', value: false});
    } else {
        orders.push({id: 'a', value: true});
        orders.push({id: 'd', value: false});
    }
}
let dist = getDist(unit, target);
if (Math.abs(nr) < Math.PI/6 && dist > 750) {
    orders.push({id: 'w', value: true});
    orders.push({id: 's', value: false});
}
if (dist < 500) {
    orders.push({id: 's', value: true});
    orders.push({id: 'w', value: false});
}
return orders;
`;

const basicMovingTargetAI = `
let orders = [];
let target = entities[0];
if (unit.x > 1500) {
    orders.push({id: 'a', value: true});
    orders.push({id: 'd', value: false});
} else if (unit.x < -1500) {
    orders.push({id: 'a', value: false});
    orders.push({id: 'd', value: true});
}
return orders;
`;

const betterTurretAI = `
let orders = [];
let target = undefined;
for (let i = 0; i < entities.length; i++) {
    if (entities[i].team != unit.team) {
        if (target == undefined || getDist(unit, entities[i]) < getDist(unit, target)) {
            target = entities[i];
        }
    }
}
if (target) {
    orders.push({id: 'aim', value: {x: target.x, y: target.y}});
    orders.push({id: 'click', value: true});
} else {
    orders.push({id: 'aim', value: {x: unit.x, y: unit.y}});
    orders.push({id: 'click', value: false});
}
return orders;
`;

const shieldAI = `
let orders = [];
let target = undefined;
for (let i = 0; i < entities.length; i++) {
    if (entities[i].team != unit.team) {
        if (target == undefined || getDist(unit, entities[i]) < getDist(unit, target)) {
            target = entities[i];
        }
    }
}
if (target) {
    let caim = toPol(target.x-unit.x, target.y-unit.y);
    caim.r -= Math.PI/2;
    let naim = vMath(toComponent(caim.m, caim.r), unit, '+');
    orders.push({id: 'aim', value: naim});
} else {
    orders.push({id: 'aim', value: {x: unit.x, y: unit.y}});
}

return orders;
`;

// Aim assist program
const advancedTurretAI = `
let orders = [];
let target = undefined;
for (let i = 0; i < entities.length; i++) {
    if (entities[i].team != unit.team) {
        if (target == undefined || getDist(unit, entities[i]) < getDist(unit, target)) {
            target = entities[i];
        }
    }
}
if (target) {
    let dist = getDist(unit, target);
    const bulletVelocity=30;
    let time = dist/bulletVelocity;
    let enemymotionx = time*target.vx;
    let enemymotiony = time*target.vy;
    let playermotionx = unit.v*Math.cos(unit.r);
    let playermotiony = unit.v*Math.sin(unit.r);
    drawLine(unit, aim(unit, {x: target.x+enemymotionx+playermotionx, y: target.y+enemymotiony+playermotiony})-Math.PI/2, 5000, data.red.stroke, false);
    orders.push({id: 'aim', value: {x: target.x+enemymotionx+playermotionx, y: target.y+enemymotiony+playermotiony}});
    if (dist < 3500) {
        orders.push({id: 'click', value: true});
    } else {
        orders.push({id: 'click', value: false});
    }
} else {
    orders.push({id: 'aim', value: {x: unit.x, y: unit.y}});
    orders.push({id: 'click', value: false});
}
return orders;
`;

const sniperTurretAI = `
let orders = [];
let target = undefined;
for (let i = 0; i < entities.length; i++) {
    if (entities[i].team != unit.team) {
        if (target == undefined || getDist(unit, entities[i]) < getDist(unit, target)) {
            target = entities[i];
        }
    }
}
if (target) {
    let dist = getDist(unit, target);
    const bulletVelocity=50;
    let time = dist/bulletVelocity;
    let enemymotionx = time*target.vx;
    let enemymotiony = time*target.vy;
    let playermotionx = unit.v*Math.cos(unit.r);
    let playermotiony = unit.v*Math.sin(unit.r);
    drawLine(unit, aim(unit, {x: target.x+enemymotionx+playermotionx, y: target.y+enemymotiony+playermotiony})-Math.PI/2, 5000, data.red.stroke, false);
    orders.push({id: 'aim', value: {x: target.x+enemymotionx+playermotionx, y: target.y+enemymotiony+playermotiony}});
    if (dist < 3500) {
        orders.push({id: 'click', value: true});
    } else {
        orders.push({id: 'click', value: false});
    }
} else {
    orders.push({id: 'aim', value: {x: unit.x, y: unit.y}});
    orders.push({id: 'click', value: false});
}
console.log(orders);
return orders;
`;

const aimAssistAI = `
let orders = [];
let target = undefined;
for (let i = 0; i < entities.length; i++) {
    if (entities[i].team != unit.team) {
        if (target == undefined || getDist(unit, entities[i]) < getDist(unit, target)) {
            target = entities[i];
        }
    }
}
if (target) {
    let dist = getDist(unit, target);
    const bulletVelocity=10;
    let time = dist/bulletVelocity;
    let enemymotionx = time*target.vx;
    let enemymotiony = time*target.vy;
    let playermotionx = unit.v*Math.cos(unit.r);
    let playermotiony = unit.v*Math.sin(unit.r);
    drawLine(unit, aim(unit, {x: target.x+enemymotionx+playermotionx, y: target.y+enemymotiony+playermotiony})-Math.PI/2, 5000, data.green.stroke, false);
    orders.push({id: 'aim', value: {x: target.x+enemymotionx+playermotionx, y: target.y+enemymotiony+playermotiony}});
    if (dist < 5000) {
        orders.push({id: 'click', value: true});
    } else {
        orders.push({id: 'click', value: false});
    }
} else {
    orders.push({id: 'aim', value: {x: unit.x, y: unit.y}});
    orders.push({id: 'click', value: false});
}
return orders;
`;

const leftArmAssistAI = `
let orders = [];
let target = undefined;
for (let i = 0; i < entities.length; i++) {
    if (entities[i].team != unit.team) {
        if (target == undefined || getDist(unit, entities[i]) < getDist(unit, target)) {
            target = entities[i];
        }
    }
}
if (target) {
    let dist = getDist(unit, target);
    const bulletVelocity=30;
    let offset = toPol(-100, 0);
    offset.r += aim(unit, {x: target.x, y: target.y});
    offset = toComponent(offset.m, offset.r);
    let newpos = vMath(unit, offset, '+');
    let time = dist/bulletVelocity;
    let enemymotionx = time*target.vx;
    let enemymotiony = time*target.vy;
    let playermotionx = unit.v*Math.cos(unit.r);
    let playermotiony = unit.v*Math.sin(unit.r);
    let aimr = aim(newpos, {x: target.x+enemymotionx+playermotionx, y: target.y+enemymotiony+playermotiony});
    renderLine(unit, aimr, 5000, 'green');
    orders.push({id: 'aim', value: vMath(unit, toComponent(dist, aimr), '+')});
    if (dist < 5000) {
        orders.push({id: 'click', value: true});
    } else {
        orders.push({id: 'click', value: false});
    }
} else {
    orders.push({id: 'aim', value: {x: unit.x, y: unit.y}});
    orders.push({id: 'click', value: false});
}
return orders;
`;

const rightArmAssistAI = `
let orders = [];
let target = undefined;
for (let i = 0; i < entities.length; i++) {
    if (entities[i].team != unit.team) {
        if (target == undefined || getDist(unit, entities[i]) < getDist(unit, target)) {
            target = entities[i];
        }
    }
}
if (target) {
    let dist = getDist(unit, target);
    const bulletVelocity=30;
    let offset = toPol(100, 0);
    offset.r += aim(unit, {x: target.x, y: target.y});
    offset = toComponent(offset.m, offset.r);
    let newpos = vMath(unit, offset, '+');
    let time = dist/bulletVelocity;
    let enemymotionx = time*target.vx;
    let enemymotiony = time*target.vy;
    let playermotionx = unit.v*Math.cos(unit.r);
    let playermotiony = unit.v*Math.sin(unit.r);
    let aimr = aim(newpos, {x: target.x+enemymotionx+playermotionx, y: target.y+enemymotiony+playermotiony});
    renderLine(unit, aimr, 5000, 'green');
    orders.push({id: 'aim', value: vMath(unit, toComponent(dist, aimr), '+')});
    if (dist < 5000) {
        orders.push({id: 'click', value: true});
    } else {
        orders.push({id: 'click', value: false});
    }
} else {
    orders.push({id: 'aim', value: {x: unit.x, y: unit.y}});
    orders.push({id: 'click', value: false});
}
return orders;
`;

const scriptMovementI = `
let orders = [];
orders.push({id: 'w', value: true});
return orders;
`;

const scriptMovementII = `
let orders = [];
if (unit.y > -2000) {
    orders.push({id: 'w', value: true});
} else {
    orders.push({id: 'w', value: false});
    orders.push({id: 'd', value: true});
}
return orders;
`;

const scriptAimingI = `
let orders = [];
let target = entities[1];

if (target) {
    let dist = getDist(unit, target);

    let offset = toPol(100, 0);
    offset.r += aim(unit, {x: target.x, y: target.y});
    offset = toComponent(offset.m, offset.r);
    let newpos = vMath(unit, offset, '+');
    let aimr = aim(newpos, {x: target.x, y: target.y});

    orders.push({id: 'aim', value: vMath(unit, toComponent(dist, aimr), '+')});
    orders.push({id: 'click', value: true});
}
return orders;
`;

const scriptAimingII = `
let orders = [];
let target = entities[1];

if (target) {
    orders.push({id: 'aim', value: target});
    orders.push({id: 'click', value: true});
    orders.push({id: 'w', value: true});
} else {
    orders.push({id: 'w', value: false});
    orders.push({id: 's', value: true});
    orders.push({id: 'click', value: false});
}

return orders;
`;

const scriptAimingIII = `
let orders = [];
let target = entities[1];

if (target) {
    let dist = getDist(unit, target);

    let offset = toPol(-100, 0);
    offset.r += aim(unit, {x: target.x, y: target.y});
    offset = toComponent(offset.m, offset.r);
    let newpos = vMath(unit, offset, '+');
    let aimr = aim(newpos, {x: target.x, y: target.y});

    orders.push({id: 'aim', value: vMath(unit, toComponent(dist, aimr), '+')});
    orders.push({id: 'click', value: true});
    orders.push({id: 'w', value: true});
} else {
    orders.push({id: 'w', value: false});
    orders.push({id: 's', value: true});
    orders.push({id: 'click', value: false});
}

return orders;
`;

const scriptAimingIV = `
let orders = [];
let target = undefined;
for (let i = 0; i < entities.length; i++) {
    if (entities[i].team != unit.team) {
        if (target == undefined || getDist(unit, entities[i]) < getDist(unit, target)) {
            target = entities[i];
        }
    }
}
if (target) {
    let dist = getDist(unit, target);
    const bulletVelocity=55;
    let offset = toPol(-100, 0);
    offset.r += aim(unit, {x: target.x, y: target.y});
    offset = toComponent(offset.m, offset.r);
    let newpos = vMath(unit, offset, '+');
    let time = dist/bulletVelocity;
    let enemymotionx = time*target.vx;
    let enemymotiony = time*target.vy;
    let playermotionx = unit.v*Math.cos(unit.r);
    let playermotiony = unit.v*Math.sin(unit.r);
    let aimr = aim(newpos, {x: target.x+enemymotionx+playermotionx, y: target.y+enemymotiony+playermotiony});
    orders.push({id: 'aim', value: vMath(unit, toComponent(dist, aimr), '+')});
    orders.push({id: 'click', value: true});
    orders.push({id: 'w', value: true});
} else {
    orders.push({id: 'w', value: false});
    orders.push({id: 's', value: true});
    orders.push({id: 'click', value: false});
}

return orders;
`;

const scriptCombatI = `
let orders = [];
let target = entities[1];

if (target) {
    orders.push({id: 'aim', value: {x: target.x, y: target.y}});
    orders.push({id: 'click', value: true});
}
return orders;
`;

const scriptCombatII = `
let orders = [];
let target = entities[1];
if (target) {let dist = getDist(unit, target);
    let offset = toPol(-100, 0);
    offset.r += aim(unit, {x: target.x, y: target.y});
    offset = toComponent(offset.m, offset.r);
    let newpos = vMath(unit, offset, '+');
    let aimr = aim(newpos, {x: target.x, y: target.y});
    orders.push({id: 'aim', value: vMath(unit, toComponent(dist, aimr), '+')});
    orders.push({id: 'click', value: true});orders.push({id: 'd', value: true});
} else {
    orders.push({id: 'aim', value: {x: unit.x, y: unit.y+1}});
    orders.push({id: 'click', value: false});
    orders.push({id: 'd', value: false});
    orders.push({id: 'a', value: true});
}
return orders;
`;

// The return of the excessively overcomplicated data storage system
const data = {
    constants: {
        zoom: 0.5,
        TPS: 60,
        FPS: 60,
    },
    mech: {
        x: 0,
        y: 0,
        r: 0, // direction of motion
        vx: 0,
        vy: 0,
        mouseR: 0, // current Aim
        lastMoved: 69,
        v: 5, // normal walking speed
        vr: 540 / 60 / 180 * Math.PI, // rotation of tracks (feet)
        tr: 360 / 60 / 180 * Math.PI, // rotation of turret (main body)
        keyboard: [],
        aimPos: {x: 69, y: 69},
        collisionR: 500,
        groundCollisionR: 80,
        tallCollisionR: 150,
        directControl: false,
        noClip: false,
        type: 'mech',
        alive: true,
        parts: [
            {
                id: 'LowerBodyContainer',
                facing: 'body',
                type: 'circle', 
                rOffset: 0,
                size: 35,
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(140, 140, 140, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'foot1',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -10, y: 60},
                            {x: 10, y: 60},
                            {x: 15, y: 50},
                            {x: 15, y: -50},
                            {x: 10, y: -60},
                            {x: -10, y: -60},
                            {x: -15, y: -50},
                            {x: -15, y: 50},
                        ],
                        offset: {x: -30, y: -5},
                        style: {
                            fill: 'rgba(130, 130, 130, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'foot2',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -10, y: 60},
                            {x: 10, y: 60},
                            {x: 15, y: 50},
                            {x: 15, y: -50},
                            {x: 10, y: -60},
                            {x: -10, y: -60},
                            {x: -15, y: -50},
                            {x: -15, y: 50},
                        ],
                        offset: {x: 30, y: -5},
                        style: {
                            fill: 'rgba(130, 130, 130, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lowerBody',
                        facing: 'body',
                        type: 'circle', 
                        rOffset: 0,
                        size: 35,
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(140, 140, 140, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
                groundCollision: true,
            },
            {
                id: 'mainBodycontainer',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -60, y: 40},
                    {x: 60, y: 40},
                    {x: 70, y: 30},
                    {x: 70, y: -30},
                    {x: 60, y: -40},
                    {x: -60, y: -40},
                    {x: -70, y: -30},
                    {x: -70, y: 30},
                ],
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(210, 210, 210, 1)',
                    stroke: {colour: '#696969', width: 10},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                collideDmg: 0,
                isHit: 0,
                connected: [
                    {
                        id: 'armLeft',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -20, y: 50},
                            {x: 20, y: 50},
                            {x: 25, y: 40},
                            {x: 25, y: -60},
                            {x: 20, y: -70},
                            {x: -20, y: -70},
                            {x: -25, y: -60},
                            {x: -25, y: 40},
                        ],
                        offset: {x: -100, y: 0},
                        style: {
                            fill: 'rgba(200, 200, 200, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: true,
                        hp: 3000,
                        maxHp: 3000,
                        collideDmg: 500,
                        isHit: 0,
                        connected: [
                            {
                                id: 'leftArmMain',
                                type: 'circle', 
                                facing: 'body',
                                rOffset: 0,
                                size: 0,
                                offset: {x: 0, y: 0},
                                style: {
                                    fill: 'rgba(0, 0, 0, 0)',
                                    stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            },
                            {
                                id: 'leftArmSide',
                                type: 'circle', 
                                facing: 'body',
                                rOffset: 0,
                                size: 0,
                                offset: {x: 0, y: 0},
                                style: {
                                    fill: 'rgba(0, 0, 0, 0)',
                                    stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            },
                        ],
                    },
                    {
                        id: 'armRight',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -20, y: 50},
                            {x: 20, y: 50},
                            {x: 25, y: 40},
                            {x: 25, y: -60},
                            {x: 20, y: -70},
                            {x: -20, y: -70},
                            {x: -25, y: -60},
                            {x: -25, y: 40},
                        ],
                        offset: {x: 100, y: 0},
                        style: {
                            fill: 'rgba(200, 200, 200, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: true,
                        hp: 3000,
                        maxHp: 3000,
                        collideDmg: 500,
                        isHit: 0,
                        connected: [
                            {
                                id: 'rightArmMain',
                                type: 'circle', 
                                facing: 'body',
                                rOffset: 0,
                                size: 0,
                                offset: {x: 0, y: 0},
                                style: {
                                    fill: 'rgba(0, 0, 0, 0)',
                                    stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            },
                            {
                                id: 'rightArmSide',
                                type: 'circle', 
                                facing: 'body',
                                rOffset: 0,
                                size: 0,
                                offset: {x: 0, y: 0},
                                style: {
                                    fill: 'rgba(0, 0, 0, 0)',
                                    stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            },
                        ],
                    },
                    {
                        id: 'mainBody',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -60, y: 40},
                            {x: 60, y: 40},
                            {x: 70, y: 30},
                            {x: 70, y: -30},
                            {x: 60, y: -40},
                            {x: -60, y: -40},
                            {x: -70, y: -30},
                            {x: -70, y: 30},
                        ],
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: true,
                        hp: 5000,
                        maxHp: 5000,
                        collideDmg: 500,
                        isHit: 0,
                        core: true,
                        connected: [
                            {
                                id: 'back',
                                type: 'circle', 
                                facing: 'body',
                                rOffset: 0,
                                size: 0,
                                offset: {x: 0, y: 0},
                                style: {
                                    fill: 'rgba(0, 0, 0, 0)',
                                    stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            },
                        ],
                    },
                    {
                        id: 'head',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 25,
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(69, 69, 69, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [
                            {
                                id: 'headTurret',
                                type: 'circle', 
                                facing: 'body',
                                rOffset: 0,
                                size: 0,
                                offset: {x: 0, y: 0},
                                style: {
                                    fill: 'rgba(0, 0, 0, 0)',
                                    stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            },
                        ],
                    },
                ],
            },
        ],
        effects: [],
    },
    tank: {
        x: 0,
        y: 0,
        r: 0, // direction of motion
        vx: 0,
        vy: 0,
        mouseR: 0, // current Aim
        v: 3, // top speed
        vr: 15 / 60 / 180 * Math.PI, // rotation of tracks (feet)
        tr: 45 / 60 / 180 * Math.PI, // rotation of turret (main body)
        keyboard: [],
        aimPos: {x: 69, y: 69},
        collisionR: 500,
        groundCollisionR: 120,
        tallCollisionR: 180,
        reverse: false,
        directControl: false,
        noClip: false,
        type: 'tank',
        alive: true,
        parts: [
            {
                id: 'mainBodyContainer',
                facing: 'body',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -90, y: -90},
                    {x: 90, y: -90},
                    {x: 90, y: 100},
                    {x: -90, y: 100},
                ],
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(210, 210, 210, 1)',
                    stroke: {colour: '#696969', width: 10},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'frontArmour',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -90, y: -15},
                            {x: 0, y: -30},
                            {x: 90, y: -15},
                            {x: 90, y: 10},
                            {x: -90, y: 10},
                        ],
                        offset: {x: 0, y: -100},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: true,
                        hp: 25000,
                        maxHp: 25000,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'tracks1',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -15, y: 130},
                            {x: 15, y: 130},
                            {x: 25, y: 120},
                            {x: 25, y: -120},
                            {x: 15, y: -130},
                            {x: -15, y: -130},
                            {x: -25, y: -120},
                            {x: -25, y: 120},
                        ],
                        offset: {x: -90, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                        groundCollision: true,
                    },
                    {
                        id: 'tracks2',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -15, y: 130},
                            {x: 15, y: 130},
                            {x: 25, y: 120},
                            {x: 25, y: -120},
                            {x: 15, y: -130},
                            {x: -15, y: -130},
                            {x: -25, y: -120},
                            {x: -25, y: 120},
                        ],
                        offset: {x: 90, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                        groundCollision: true,
                    },
                    {
                        id: 'armour1.5',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 130},
                            {x: 5, y: 130},
                            {x: 15, y: 125},
                            {x: 15, y: 85},
                            {x: 5, y: 80},
                            {x: -5, y: 80},
                            {x: -15, y: 85},
                            {x: -15, y: 125},
                        ],
                        offset: {x: -100, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour1.4',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 30},
                            {x: 5, y: 30},
                            {x: 15, y: 35},
                            {x: 15, y: 85},
                            {x: 5, y: 80},
                            {x: -5, y: 80},
                            {x: -15, y: 85},
                            {x: -15, y: 35},
                        ],
                        offset: {x: -100, y: -2},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour1.3',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 30},
                            {x: 5, y: 30},
                            {x: 15, y: 35},
                            {x: 15, y: -15},
                            {x: 5, y: -20},
                            {x: -5, y: -20},
                            {x: -15, y: -15},
                            {x: -15, y: 35},
                        ],
                        offset: {x: -100, y: -4},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour1.2',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: -70},
                            {x: 5, y: -70},
                            {x: 15, y: -65},
                            {x: 15, y: -15},
                            {x: 5, y: -20},
                            {x: -5, y: -20},
                            {x: -15, y: -15},
                            {x: -15, y: -65},
                        ],
                        offset: {x: -100, y: -6},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour1.1',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: -70},
                            {x: 5, y: -70},
                            {x: 15, y: -65},
                            {x: 15, y: -115},
                            {x: 5, y: -120},
                            {x: -5, y: -120},
                            {x: -15, y: -115},
                            {x: -15, y: -65},
                        ],
                        offset: {x: -100, y: -8},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.5',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 130},
                            {x: 5, y: 130},
                            {x: 15, y: 125},
                            {x: 15, y: 85},
                            {x: 5, y: 80},
                            {x: -5, y: 80},
                            {x: -15, y: 85},
                            {x: -15, y: 125},
                        ],
                        offset: {x: 100, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.4',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 30},
                            {x: 5, y: 30},
                            {x: 15, y: 35},
                            {x: 15, y: 85},
                            {x: 5, y: 80},
                            {x: -5, y: 80},
                            {x: -15, y: 85},
                            {x: -15, y: 35},
                        ],
                        offset: {x: 100, y: -2},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.3',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 30},
                            {x: 5, y: 30},
                            {x: 15, y: 35},
                            {x: 15, y: -15},
                            {x: 5, y: -20},
                            {x: -5, y: -20},
                            {x: -15, y: -15},
                            {x: -15, y: 35},
                        ],
                        offset: {x: 100, y: -4},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.2',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: -70},
                            {x: 5, y: -70},
                            {x: 15, y: -65},
                            {x: 15, y: -15},
                            {x: 5, y: -20},
                            {x: -5, y: -20},
                            {x: -15, y: -15},
                            {x: -15, y: -65},
                        ],
                        offset: {x: 100, y: -6},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.1',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: -70},
                            {x: 5, y: -70},
                            {x: 15, y: -65},
                            {x: 15, y: -115},
                            {x: 5, y: -120},
                            {x: -5, y: -120},
                            {x: -15, y: -115},
                            {x: -15, y: -65},
                        ],
                        offset: {x: 100, y: -8},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'rightSide',
                        type: 'circle', 
                        facing: 'body',
                        rOffset: 0,
                        size: 0,
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'leftSide',
                        type: 'circle', 
                        facing: 'body',
                        rOffset: 0,
                        size: 0,
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'main hitbox',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -90, y: -90},
                            {x: 90, y: -90},
                            {x: 90, y: 100},
                            {x: -90, y: 100},
                        ],
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 0)',
                            stroke: {colour: 'rgba(210, 210, 210, 0)', width: 10},
                        },
                        collision: true,
                        core: true,
                        hp: 5000,
                        maxHp: 5000,
                        isHit: 0,
                        connected: [],
                    }
                ],
            },
            {
                id: 'turretBody',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -50, y: 60},
                    {x: 50, y: 60},
                    {x: 50, y: -45},
                    {x: 25, y: -70},
                    {x: -25, y: -70},
                    {x: -50, y: -45},
                ],
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(210, 210, 210, 1)',
                    stroke: {colour: '#696969', width: 10},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'main',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -12, y: 100},
                            {x: -12, y: 0},
                            {x: 12, y: 0},
                            {x: 12, y: 100},
                        ],
                        offset: {x: 0, y: -170},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            }
        ],
        effects: [],
    },
    truck: {
        x: 0,
        y: 0,
        r: 0, // direction of motion
        vx: 0,
        vy: 0,
        mouseR: 0, // current Aim
        v: 6, // top speed
        vr: 30 / 60 / 180 * Math.PI, 
        tr: 45 / 60 / 180 * Math.PI, 
        keyboard: [],
        aimPos: {x: 69, y: 69},
        collisionR: 500,
        groundCollisionR: 120,
        tallCollisionR: 180,
        reverse: false,
        directControl: false,
        noClip: false,
        type: 'tank',
        alive: true,
        parts: [
            {
                id: 'mainBodyContainer',
                facing: 'body',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -90, y: -100},
                    {x: 90, y: -100},
                    {x: 90, y: 100},
                    {x: -90, y: 100},
                ],
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(210, 210, 210, 1)',
                    stroke: {colour: '#696969', width: 10},
                },
                collision: true,
                core: true,
                hp: 5000,
                maxHp: 5000,
                isHit: 0,
                connected: [
                    {
                        id: 'frontArmour',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -90, y: -10},
                            {x: 0, y: -25},
                            {x: 90, y: -10},
                            {x: 90, y: 0},
                            {x: -90, y: 0},
                        ],
                        offset: {x: 0, y: -100},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: true,
                        hp: 25000,
                        maxHp: 25000,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'tracks1',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -15, y: 130},
                            {x: 15, y: 130},
                            {x: 25, y: 120},
                            {x: 25, y: -120},
                            {x: 15, y: -130},
                            {x: -15, y: -130},
                            {x: -25, y: -120},
                            {x: -25, y: 120},
                        ],
                        offset: {x: -90, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                        groundCollision: true,
                    },
                    {
                        id: 'tracks2',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -15, y: 130},
                            {x: 15, y: 130},
                            {x: 25, y: 120},
                            {x: 25, y: -120},
                            {x: 15, y: -130},
                            {x: -15, y: -130},
                            {x: -25, y: -120},
                            {x: -25, y: 120},
                        ],
                        offset: {x: 90, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                        groundCollision: true,
                    },
                    {
                        id: 'armour1.5',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 130},
                            {x: 5, y: 130},
                            {x: 15, y: 125},
                            {x: 15, y: 85},
                            {x: 5, y: 80},
                            {x: -5, y: 80},
                            {x: -15, y: 85},
                            {x: -15, y: 125},
                        ],
                        offset: {x: -100, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour1.4',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 30},
                            {x: 5, y: 30},
                            {x: 15, y: 35},
                            {x: 15, y: 85},
                            {x: 5, y: 80},
                            {x: -5, y: 80},
                            {x: -15, y: 85},
                            {x: -15, y: 35},
                        ],
                        offset: {x: -100, y: -2},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour1.3',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 30},
                            {x: 5, y: 30},
                            {x: 15, y: 35},
                            {x: 15, y: -15},
                            {x: 5, y: -20},
                            {x: -5, y: -20},
                            {x: -15, y: -15},
                            {x: -15, y: 35},
                        ],
                        offset: {x: -100, y: -4},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour1.2',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: -70},
                            {x: 5, y: -70},
                            {x: 15, y: -65},
                            {x: 15, y: -15},
                            {x: 5, y: -20},
                            {x: -5, y: -20},
                            {x: -15, y: -15},
                            {x: -15, y: -65},
                        ],
                        offset: {x: -100, y: -6},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour1.1',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: -70},
                            {x: 5, y: -70},
                            {x: 15, y: -65},
                            {x: 15, y: -115},
                            {x: 5, y: -120},
                            {x: -5, y: -120},
                            {x: -15, y: -115},
                            {x: -15, y: -65},
                        ],
                        offset: {x: -100, y: -8},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.5',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 130},
                            {x: 5, y: 130},
                            {x: 15, y: 125},
                            {x: 15, y: 85},
                            {x: 5, y: 80},
                            {x: -5, y: 80},
                            {x: -15, y: 85},
                            {x: -15, y: 125},
                        ],
                        offset: {x: 100, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.4',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 30},
                            {x: 5, y: 30},
                            {x: 15, y: 35},
                            {x: 15, y: 85},
                            {x: 5, y: 80},
                            {x: -5, y: 80},
                            {x: -15, y: 85},
                            {x: -15, y: 35},
                        ],
                        offset: {x: 100, y: -2},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.3',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 30},
                            {x: 5, y: 30},
                            {x: 15, y: 35},
                            {x: 15, y: -15},
                            {x: 5, y: -20},
                            {x: -5, y: -20},
                            {x: -15, y: -15},
                            {x: -15, y: 35},
                        ],
                        offset: {x: 100, y: -4},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.2',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: -70},
                            {x: 5, y: -70},
                            {x: 15, y: -65},
                            {x: 15, y: -15},
                            {x: 5, y: -20},
                            {x: -5, y: -20},
                            {x: -15, y: -15},
                            {x: -15, y: -65},
                        ],
                        offset: {x: 100, y: -6},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.1',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: -70},
                            {x: 5, y: -70},
                            {x: 15, y: -65},
                            {x: 15, y: -115},
                            {x: 5, y: -120},
                            {x: -5, y: -120},
                            {x: -15, y: -115},
                            {x: -15, y: -65},
                        ],
                        offset: {x: 100, y: -8},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 2500,
                        maxHp: 2500,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'rightSide',
                        type: 'circle', 
                        facing: 'body',
                        rOffset: 0,
                        size: 0,
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'leftSide',
                        type: 'circle', 
                        facing: 'body',
                        rOffset: 0,
                        size: 0,
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
            {
                id: 'turretBody',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -50, y: 60},
                    {x: 50, y: 60},
                    {x: 50, y: -45},
                    {x: 25, y: -70},
                    {x: -25, y: -70},
                    {x: -50, y: -45},
                ],
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(210, 210, 210, 1)',
                    stroke: {colour: '#696969', width: 10},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'main',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -12, y: 100},
                            {x: -12, y: 0},
                            {x: 12, y: 0},
                            {x: 12, y: 100},
                        ],
                        offset: {x: 0, y: -170},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            }
        ],
        effects: [],
    },
    tonk: {
        x: 0,
        y: 0,
        r: 0, // direction of motion
        vx: 0,
        vy: 0,
        mouseR: 0, // current Aim
        v: 4, // top speed
        vr: 45 / 60 / 180 * Math.PI, // rotation of tracks (feet)
        tr: 150 / 60 / 180 * Math.PI, // rotation of turret (main body)
        keyboard: [],
        aimPos: {x: 69, y: 69},
        collisionR: 600,
        groundCollisionR: 120,
        tallCollisionR: 180,
        reverse: false,
        directControl: false,
        noClip: false,
        type: 'tank',
        alive: true,
        parts: [
            {
                id: 'mainBodyContainer',
                facing: 'body',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -90, y: -100},
                    {x: 90, y: -100},
                    {x: 90, y: 100},
                    {x: -90, y: 100},
                ],
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(210, 210, 210, 1)',
                    stroke: {colour: '#696969', width: 10},
                },
                collision: true,
                core: true,
                hp: 50000,
                maxHp: 50000,
                isHit: 0,
                connected: [
                    {
                        id: 'frontArmour',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -90, y: -10},
                            {x: 0, y: -25},
                            {x: 90, y: -10},
                            {x: 90, y: 0},
                            {x: -90, y: 0},
                        ],
                        offset: {x: 0, y: -100},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: true,
                        hp: 75000,
                        maxHp: 75000,
                        isHit: 0,
                        connected: [
                            {
                                id: 'bulldozer',
                                facing: 'body',
                                type: 'polygon', 
                                rOffset: 0,
                                size: [
                                    {x: -100, y: 0},
                                    {x: 100, y: 0},
                                    {x: 100, y: -50},
                                    {x: 75, y: -30},
                                    {x: -75, y: -30},
                                    {x: -100, y: -50},
                                ],
                                offset: {x: 0, y: -150},
                                style: {
                                    fill: 'rgba(200, 200, 200, 1)',
                                    stroke: {colour: '#696969', width: 10},
                                },
                                collision: true,
                                hp: 150000,
                                maxHp: 150000,
                                isHit: 0,
                                connected: [
                                    {
                                        id: 'support1',
                                        facing: 'body',
                                        type: 'polygon', 
                                        rOffset: 0,
                                        size: [
                                            {x: -10, y: 0},
                                            {x: 10, y: 0},
                                            {x: 10, y: 30},
                                            {x: -10, y: 30},
                                        ],
                                        offset: {x: -30, y: -150},
                                        style: {
                                            fill: 'rgba(200, 200, 200, 1)',
                                            stroke: {colour: '#696969', width: 10},
                                        },
                                        collision: false,
                                        hp: 1,
                                        maxHp: 1,
                                        isHit: 0,
                                        connected: [],
                                    },
                                    {
                                        id: 'support2',
                                        facing: 'body',
                                        type: 'polygon', 
                                        rOffset: 0,
                                        size: [
                                            {x: -10, y: 0},
                                            {x: 10, y: 0},
                                            {x: 10, y: 30},
                                            {x: -10, y: 30},
                                        ],
                                        offset: {x: 30, y: -150},
                                        style: {
                                            fill: 'rgba(200, 200, 200, 1)',
                                            stroke: {colour: '#696969', width: 10},
                                        },
                                        collision: false,
                                        hp: 1,
                                        maxHp: 1,
                                        isHit: 0,
                                        connected: [],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        id: 'tracks1',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -15, y: 130},
                            {x: 15, y: 130},
                            {x: 25, y: 120},
                            {x: 25, y: -120},
                            {x: 15, y: -130},
                            {x: -15, y: -130},
                            {x: -25, y: -120},
                            {x: -25, y: 120},
                        ],
                        offset: {x: -90, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                        groundCollision: true,
                    },
                    {
                        id: 'tracks2',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -15, y: 130},
                            {x: 15, y: 130},
                            {x: 25, y: 120},
                            {x: 25, y: -120},
                            {x: 15, y: -130},
                            {x: -15, y: -130},
                            {x: -25, y: -120},
                            {x: -25, y: 120},
                        ],
                        offset: {x: 90, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                        groundCollision: true,
                    },
                    {
                        id: 'armour1.5',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 130},
                            {x: 5, y: 130},
                            {x: 15, y: 125},
                            {x: 15, y: 85},
                            {x: 5, y: 80},
                            {x: -5, y: 80},
                            {x: -15, y: 85},
                            {x: -15, y: 125},
                        ],
                        offset: {x: -100, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 10000,
                        maxHp: 10000,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour1.4',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 30},
                            {x: 5, y: 30},
                            {x: 15, y: 35},
                            {x: 15, y: 85},
                            {x: 5, y: 80},
                            {x: -5, y: 80},
                            {x: -15, y: 85},
                            {x: -15, y: 35},
                        ],
                        offset: {x: -100, y: -2},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 10000,
                        maxHp: 10000,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour1.3',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 30},
                            {x: 5, y: 30},
                            {x: 15, y: 35},
                            {x: 15, y: -15},
                            {x: 5, y: -20},
                            {x: -5, y: -20},
                            {x: -15, y: -15},
                            {x: -15, y: 35},
                        ],
                        offset: {x: -100, y: -4},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 10000,
                        maxHp: 10000,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour1.2',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: -70},
                            {x: 5, y: -70},
                            {x: 15, y: -65},
                            {x: 15, y: -15},
                            {x: 5, y: -20},
                            {x: -5, y: -20},
                            {x: -15, y: -15},
                            {x: -15, y: -65},
                        ],
                        offset: {x: -100, y: -6},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 10000,
                        maxHp: 10000,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour1.1',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: -70},
                            {x: 5, y: -70},
                            {x: 15, y: -65},
                            {x: 15, y: -115},
                            {x: 5, y: -120},
                            {x: -5, y: -120},
                            {x: -15, y: -115},
                            {x: -15, y: -65},
                        ],
                        offset: {x: -100, y: -8},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 10000,
                        maxHp: 10000,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.5',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 130},
                            {x: 5, y: 130},
                            {x: 15, y: 125},
                            {x: 15, y: 85},
                            {x: 5, y: 80},
                            {x: -5, y: 80},
                            {x: -15, y: 85},
                            {x: -15, y: 125},
                        ],
                        offset: {x: 100, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 10000,
                        maxHp: 10000,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.4',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 30},
                            {x: 5, y: 30},
                            {x: 15, y: 35},
                            {x: 15, y: 85},
                            {x: 5, y: 80},
                            {x: -5, y: 80},
                            {x: -15, y: 85},
                            {x: -15, y: 35},
                        ],
                        offset: {x: 100, y: -2},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 10000,
                        maxHp: 10000,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.3',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: 30},
                            {x: 5, y: 30},
                            {x: 15, y: 35},
                            {x: 15, y: -15},
                            {x: 5, y: -20},
                            {x: -5, y: -20},
                            {x: -15, y: -15},
                            {x: -15, y: 35},
                        ],
                        offset: {x: 100, y: -4},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 10000,
                        maxHp: 10000,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.2',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: -70},
                            {x: 5, y: -70},
                            {x: 15, y: -65},
                            {x: 15, y: -15},
                            {x: 5, y: -20},
                            {x: -5, y: -20},
                            {x: -15, y: -15},
                            {x: -15, y: -65},
                        ],
                        offset: {x: 100, y: -6},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 10000,
                        maxHp: 10000,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'armour2.1',
                        type: 'polygon', 
                        facing: 'body',
                        rOffset: 0,
                        size: [
                            {x: -5, y: -70},
                            {x: 5, y: -70},
                            {x: 15, y: -65},
                            {x: 15, y: -115},
                            {x: 5, y: -120},
                            {x: -5, y: -120},
                            {x: -15, y: -115},
                            {x: -15, y: -65},
                        ],
                        offset: {x: 100, y: -8},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: true,
                        hp: 10000,
                        maxHp: 10000,
                        isHit: 0,
                        connected: [],
                        groundCollision: false,
                    },
                    {
                        id: 'rightSide',
                        type: 'circle', 
                        facing: 'body',
                        rOffset: 0,
                        size: 0,
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'leftSide',
                        type: 'circle', 
                        facing: 'body',
                        rOffset: 0,
                        size: 0,
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
            {
                id: 'turretBody',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -50, y: 60},
                    {x: 50, y: 60},
                    {x: 50, y: -45},
                    {x: 25, y: -70},
                    {x: -25, y: -70},
                    {x: -50, y: -45},
                ],
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(210, 210, 210, 1)',
                    stroke: {colour: '#696969', width: 10},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'main',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -12, y: 100},
                            {x: -12, y: 0},
                            {x: 12, y: 0},
                            {x: 12, y: 100},
                        ],
                        offset: {x: 0, y: -170},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            }
        ],
        effects: [],
    },
    drone: {
        x: 0,
        y: 0,
        r: 0, // direction of motion
        vx: 0,
        vy: 0,
        mouseR: 0, // current Aim
        v: 7.5, // top speed
        tr: 360 / 60 / 180 * Math.PI, // rotation of turret (main body)
        keyboard: [],
        aimPos: {x: 69, y: 69},
        collisionR: 500,
        groundCollisionR: -1,
        tallCollisionR: 110,
        isMoving: false,
        directControl: false,
        noClip: false,
        type: 'drone',
        alive: true,
        parts: [
            {
                id: 'mainBodyContainer',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -75, y: -75},
                    {x: 75, y: -75},
                    {x: 75, y: 75},
                    {x: -75, y: 75},
                ],
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(210, 210, 210, 1)',
                    stroke: {colour: '#696969', width: 10},
                },
                collision: true,
                core: true,
                hp: 1500,
                maxHp: 1000,
                isHit: 0,
                connected: [
                    {
                        id: 'defaultSniper',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -10, y: 0},
                            {x: 10, y: 0},
                            {x: 10, y: 120},
                            {x: -10, y: 120},
                        ],
                        offset: {x: 0, y: -200},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 0,
                            reload: {c: 0, t: 30},
                            spread: Math.PI/480,
                            bullet: {
                                type: 'polygon', 
                                cType: 'point', 
                                size: [
                                    {x: -8, y: 5},
                                    {x: 0, y: -20},
                                    {x: 8, y: 5},
                                ],
                                style: {
                                    fill: {r: 255, g: 100, b: 100, a: 1},
                                    stroke: {colour: {r: 255, g: 69, b: 69, a: 1}, width: 3},
                                },
                                decay: {
                                    life: 180, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    size: 1
                                },
                                dmg: 750,
                                v: 60,
                                vDrag: 1,
                                vr: 0,
                                rDrag: 0,
                                friendly: true,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
        ],
        effects: [],
    },
    target: {
        x: 0,
        y: 0,
        r: 0, // direction of motion
        vx: 0,
        vy: 0,
        mouseR: 0, // current Aim
        v: 4, // top speed
        tr: 0, // rotation of turret (main body)
        keyboard: [],
        aimPos: {x: 69, y: 69},
        collisionR: 500,
        groundCollisionR: 0,
        tallCollisionR: 0,
        isMoving: false,
        directControl: false,
        noClip: false,
        type: 'staticTurret',
        alive: true,
        parts: [
            {
                id: 'buttonBody',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -25, y: -50},
                    {x: 25, y: -50},
                    {x: 25, y: 50},
                    {x: -25, y: 50},
                ],
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(180, 180, 180, 1)',
                    stroke: {colour: '#696969', width: 10},
                },
                collision: true,
                core: true,
                hp: 1000,
                maxHp: 1000,
                isHit: 0,
                connected: [],
            },
        ],
        effects: [],
    },
    turret: {
        x: 0,
        y: 0,
        r: 0, // direction of motion
        vx: 0,
        vy: 0,
        mouseR: 0, // current Aim
        v: 0, // top speed
        tr: 180 / 60 / 180 * Math.PI, // rotation of turret (main body)
        keyboard: [],
        aimPos: {x: 69, y: 69},
        collisionR: 500,
        groundCollisionR: -1,
        tallCollisionR: -1,
        isMoving: false,
        directControl: false,
        noClip: false,
        type: 'staticTurret',
        alive: true,
        parts: [
            {
                id: 'Base1',
                facing: 'body',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -75, y: 125},
                    {x: 75, y: 125},
                    {x: 75, y: -125},
                    {x: -75, y: -125},
                ],
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 10},
                },
                collision: false,
                core: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'Base2',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {y: -75, x: 125},
                            {y: 75, x: 125},
                            {y: 75, x: -125},
                            {y: -75, x: -125},
                        ],
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        core: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Base3',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {y: -75, x: 75},
                            {y: 75, x: 75},
                            {y: 75, x: -75},
                            {y: -75, x: -75},
                        ],
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        core: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'turretBody',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -50*1.5, y: 60*1.5},
                            {x: 50*1.5, y: 60*1.5},
                            {x: 50*1.5, y: -45*1.5},
                            {x: 25*1.5, y: -70*1.5},
                            {x: -25*1.5, y: -70*1.5},
                            {x: -50*1.5, y: -45*1.5},
                        ],
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(210, 210, 210, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        core: true,
                        collision: true,
                        hp: 3000,
                        maxHp: 3000,
                        isHit: 0,
                        connected: [
                            {
                                id: 'armour1',
                                facing: 'turret',
                                type: 'polygon', 
                                rOffset: 0,
                                size: [
                                    {x: -15, y: 200},
                                    {x: -15, y: 30},
                                    {x: 15, y: 30},
                                    {x: 15, y: 200},
                                ],
                                offset: {x: 95, y: -100},
                                style: {
                                    fill: 'rgba(210, 210, 210, 1)',
                                    stroke: {colour: '#696969', width: 10},
                                },
                                collision: true,
                                hp: 1000,
                                maxHp: 1000,
                                isHit: 0,
                                connected: [],
                            },
                            {
                                id: 'armour2',
                                facing: 'turret',
                                type: 'polygon', 
                                rOffset: 0,
                                size: [
                                    {x: -15, y: 200},
                                    {x: -15, y: 30},
                                    {x: 15, y: 30},
                                    {x: 15, y: 200},
                                ],
                                offset: {x: -95, y: -100},
                                style: {
                                    fill: 'rgba(210, 210, 210, 1)',
                                    stroke: {colour: '#696969', width: 10},
                                },
                                collision: true,
                                hp: 1000,
                                maxHp: 1000,
                                isHit: 0,
                                connected: [],
                            },
                            {
                                id: 'armour3',
                                facing: 'turret',
                                type: 'polygon', 
                                rOffset: 0,
                                size: [
                                    {x: -100, y: 15},
                                    {x: -100, y: -15},
                                    {x: 100, y: -15},
                                    {x: 100, y: 15},
                                ],
                                offset: {x: 0, y: 110},
                                style: {
                                    fill: 'rgba(210, 210, 210, 1)',
                                    stroke: {colour: '#696969', width: 10},
                                },
                                collision: true,
                                hp: 1000,
                                maxHp: 1000,
                                isHit: 0,
                                connected: [],
                            },
                            {
                                id: 'mainGun',
                                type: 'circle', 
                                facing: 'body',
                                rOffset: 0,
                                size: 0,
                                offset: {x: 0, y: 0},
                                style: {
                                    fill: 'rgba(0, 0, 0, 0)',
                                    stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            },
                        ],
                    }
                ],
            },
        ],
        effects: [],
    },
    costs: {
        mech: 2500,
        tank: 2000,
        drone: 2000,
        script: 5000,
        scriptExtension: 1000, // extends unit script lengrh by 1000 characters
        mainScriptExtension: 2000, // extends unit script lengrh by 1000 characters
    },
    template: {
        physics: {
            x: 0,     // x coordinate
            y: 0,     // y coordinate
            vx: 0,    // x component of velocity
            vy: 0,    // y component of velocity
            ax: 0,    // x component of acceleration
            ay: 0,    // y component of acceleration
            r: 0,     // rotation
            vr: 0,    // angular velocity
            ar: 0,    // angular acceleration
            vDrag: 1, // drag (multiply by velocities to slow them down)
            rDrag: 1, // angular drag (multiply by velocities to slow them down)
            maxV: 25, // terminal velocity (25pixels/tick)
            maxRV: Math.PI/15, // terminal angular velocity (720˚/second)
        },
        particle: {
            type: 'circle', // circle or polygon
            size: 10, // radius if circle, array of points if polygon
            style: {
                fill: {r: 255, g: 255, b: 255, a: 1},
                stroke: {colour: {r: 255, g: 255, b: 255, a: 1}, width: 2},
            },
            decay: {
                life: Infinity, // how many ticks the particle persists for
                fillStyle: {r: 0, g: 0, b: 0, a: 0}, // add to fill style
                strokeStyle: {r: 0, g: 0, b: 0, a: 0}, // add to stroke style
                size: 1 // multiply size by this
            }
        },
        memory: {
            team: '', // which team the unit belongs to
            id: '', // the name of the unit
            memory: '', // the stored data of the unit, should store enemies to target and where to move to
            transmission: [], // data recieved from the main combat logic, should be given targets to attack or formations to move in
            script: '', // the script to be executed by the unit every tick
            orders: [], // all the actions that the unit will execute
        },
        team: {
            id: '', // the team name
            money: 10000, // money avalaible to purchace units and resources
            script: '', // the script that purchaces new units and sends commands to existing units
            memory: '', // the main data storage of every team, should store advanced tactics and strategies
            transmission: [], // data recieved from units
            resources: {
                scripts: 3, // number of different scripts avalaible, scripts-1 = number of different types of units
                mainScriptLength: 2000, // main logic has limit of 1000 characters
                UnitScriptLength: 5000, // unit scripts have a limit of 4000 characters
            },
            scripts: { // scripts owned by the team

            },
            spawn: {x: 0, y: 0}, // where new units will be spawned
            orders: [], // orders to be executed by the team (spawn stuff)
        },
        weapons: {
            DebugWeapon: {
                id: 'debugWeapon',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -10, y: 0},
                    {x: 10, y: 0},
                    {x: 10, y: 30},
                    {x: -10, y: 30},
                ],
                offset: {x: 0, y: -100},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 0, t: 6},
                    spread: 0,
                    bullet: {
                        type: 'circle', 
                        cType: 'point', 
                        size: 8,
                        style: {
                            fill: {r: 100, g: 100, b: 100, a: 1},
                            stroke: {colour: {r: 69, g: 69, b: 69, a: 1}, width: 3},
                        },
                        decay: {
                            life: 999999999, 
                            fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            size: 1
                        },
                        dmg: 1,
                        v: 0,
                        vr: 0,
                        vDrag: 0.99,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [],
            },
            none: {
                id: 'none',
                facing: 'body',
                type: 'circle', 
                rOffset: 0,
                size: 0,
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(0, 0, 0, 0)',
                    stroke: {colour: 'rgba(0, 0, 0, 0)', width: 0},
                },
                collision: false,
                hp: 0,
                maxHp: 0,
                isHit: 0,
                connected: [],
            },
            noneSideMounted: {
                id: 'none',
                facing: 'body',
                type: 'circle', 
                rOffset: 0,
                size: 0,
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(0, 0, 0, 0)',
                    stroke: {colour: 'rgba(0, 0, 0, 0)', width: 0},
                },
                collision: false,
                hp: 0,
                maxHp: 0,
                isHit: 0,
                connected: [],
            },
            Shield: {
                id: 'shield',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: 0, y: 100},
                    {x: 0, y: 125},
                    {x: -40, y: 75},
                    {x: -40, y: -75},
                    {x: 0, y: -125},
                    {x: 0, y: -100},
                    {x: -15, y: -75},
                    {x: -15, y: 75},
                ],
                offset: {x: -40, y: 0},
                style: {
                    fill: 'rgba(200, 200, 200, 1)',
                    stroke: {colour: '#696969', width: 10},
                },
                collision: true,
                hp: 15000,
                maxHp: 15000,
                isHit: 0,
                connected: [
                    {
                        id: 'handle',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -10, y: 20},
                            {x: -10, y: -30},
                            {x: 15, y: -30},
                            {x: 15, y: 20},
                        ],
                        offset: {x: -40, y: 0},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    }
                ],
            },
            ShieldSideMounted: {
                id: 'shield',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: 0, y: 100},
                    {x: 0, y: 125},
                    {x: -35, y: 75},
                    {x: -35, y: -75},
                    {x: 0, y: -125},
                    {x: 0, y: -100},
                    {x: -15, y: -75},
                    {x: -15, y: 75},
                ],
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(200, 200, 200, 1)',
                    stroke: {colour: '#696969', width: 10},
                },
                collision: true,
                hp: 10000,
                maxHp: 10000,
                isHit: 0,
                connected: [
                    {
                        id: 'handle',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -10, y: 20},
                            {x: -10, y: -30},
                            {x: 25, y: -30},
                            {x: 25, y: 20},
                        ],
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    }
                ],
            },
            Engine: {
                id: 'enginecontainer',
                facing: 'turret',
                type: 'circle', 
                rOffset: 0,
                size: 0,
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(200, 200, 200, 0)',
                    stroke: {colour: 'rgba(200, 200, 200, 0)', width: 10},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'main',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: Math.PI/3,
                        size: [
                            {x: -8, y: -10},
                            {x: -8, y: -50},
                            {x: 8, y: -50},
                            {x: 8, y: -10},
                        ],
                        offset: {x: -40, y: -10},
                        style: {
                            fill: 'rgba(160, 160, 160, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'main',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: Math.PI/3,
                        size: [
                            {x: -8, y: -10},
                            {x: -8, y: -50},
                            {x: 8, y: -50},
                            {x: 8, y: -10},
                        ],
                        offset: {x: -40, y: 10},
                        style: {
                            fill: 'rgba(160, 160, 160, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'main',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: Math.PI/3,
                        size: [
                            {x: -8, y: -10},
                            {x: -8, y: -50},
                            {x: 8, y: -50},
                            {x: 8, y: -10},
                        ],
                        offset: {x: -40, y: 30},
                        style: {
                            fill: 'rgba(160, 160, 160, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'main',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: Math.PI/3,
                        size: [
                            {x: -8, y: -10},
                            {x: -8, y: -50},
                            {x: 8, y: -50},
                            {x: 8, y: -10},
                        ],
                        offset: {x: -40, y: 50},
                        style: {
                            fill: 'rgba(160, 160, 160, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'main',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 10, y: 40},
                            {x: -10, y: -50},
                            {x: 15, y: -55},
                            {x: 15, y: 40},
                        ],
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    }
                ],
            },
            EngineSideMounted: {
                id: 'enginecontainer',
                facing: 'turret',
                type: 'circle', 
                rOffset: 0,
                size: 0,
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(200, 200, 200, 0)',
                    stroke: {colour: 'rgba(200, 200, 200, 0)', width: 10},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'main',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: Math.PI/3,
                        size: [
                            {x: -8, y: -10},
                            {x: -8, y: -50},
                            {x: 8, y: -50},
                            {x: 8, y: -10},
                        ],
                        offset: {x: -40, y: -10},
                        style: {
                            fill: 'rgba(160, 160, 160, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'main',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: Math.PI/3,
                        size: [
                            {x: -8, y: -10},
                            {x: -8, y: -50},
                            {x: 8, y: -50},
                            {x: 8, y: -10},
                        ],
                        offset: {x: -40, y: 10},
                        style: {
                            fill: 'rgba(160, 160, 160, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'main',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: Math.PI/3,
                        size: [
                            {x: -8, y: -10},
                            {x: -8, y: -50},
                            {x: 8, y: -50},
                            {x: 8, y: -10},
                        ],
                        offset: {x: -40, y: 30},
                        style: {
                            fill: 'rgba(160, 160, 160, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'main',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: Math.PI/3,
                        size: [
                            {x: -8, y: -10},
                            {x: -8, y: -50},
                            {x: 8, y: -50},
                            {x: 8, y: -10},
                        ],
                        offset: {x: -40, y: 50},
                        style: {
                            fill: 'rgba(160, 160, 160, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'main',
                        facing: 'body',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 10, y: 40},
                            {x: -10, y: -50},
                            {x: 15, y: -55},
                            {x: 15, y: 40},
                        ],
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    }
                ],
            },
            Exhausts: {
                id: 'container',
                facing: 'turret',
                type: 'circle', 
                rOffset: 0,
                size: 0,
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(200, 200, 200, 0)',
                    stroke: {colour: 'rgba(200, 200, 200, 0)', width: 10},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'left exhaust',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -25, y: 0},
                            {x: 25, y: 0},
                            {x: 25, y: 26},
                            {x: 15, y: 36},
                            {x: -15, y: 36},
                            {x: -25, y: 26},
                        ],
                        offset: {x: -40, y: 20},
                        style: {
                            fill: 'rgba(160, 160, 160, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [
                            {
                                id: 'left exhaust deco',
                                facing: 'turret',
                                type: 'circle', 
                                rOffset: 0,
                                size: 12,
                                offset: {x: -40, y: 38},
                                style: {
                                    fill: 'rgba(80, 80, 80, 1)',
                                    stroke: {colour: 'rgba(80, 80, 80, 1)', width: 1},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            }, 
                            {
                                id: 'left exhaust deco2',
                                facing: 'turret',
                                type: 'polygon', 
                                rOffset: Math.PI/6,
                                size: [
                                    {x: -8, y: 0},
                                    {x: 8, y: 0},
                                    {x: 8, y: 30},
                                    {x: -8, y: 30},
                                ],
                                offset: {x: -40, y: 38},
                                style: {
                                    fill: 'rgba(80, 80, 80, 1)',
                                    stroke: {colour: 'rgba(80, 80, 80, 1)', width: 1},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            }
                        ],
                    },
                    {
                        id: 'right exhaust',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -25, y: 0},
                            {x: 25, y: 0},
                            {x: 25, y: 26},
                            {x: 15, y: 36},
                            {x: -15, y: 36},
                            {x: -25, y: 26},
                        ],
                        offset: {x: 40, y: 20},
                        style: {
                            fill: 'rgba(160, 160, 160, 1)',
                            stroke: {colour: '#696969', width: 10},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [
                            {
                                id: 'right exhaust deco',
                                facing: 'turret',
                                type: 'circle', 
                                rOffset: 0,
                                size: 12,
                                offset: {x: 40, y: 38},
                                style: {
                                    fill: 'rgba(80, 80, 80, 1)',
                                    stroke: {colour: 'rgba(80, 80, 80, 1)', width: 1},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            }, 
                            {
                                id: 'right exhaust deco2',
                                facing: 'turret',
                                type: 'polygon', 
                                rOffset: -Math.PI/6,
                                size: [
                                    {x: -8, y: 0},
                                    {x: 8, y: 0},
                                    {x: 8, y: 30},
                                    {x: -8, y: 30},
                                ],
                                offset: {x: 40, y: 38},
                                style: {
                                    fill: 'rgba(80, 80, 80, 1)',
                                    stroke: {colour: 'rgba(80, 80, 80, 1)', width: 1},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            }
                        ],
                    }
                ],
            },
            GattlingGun: {
                id: 'GattlingGunContainer',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -30, y: 0},
                    {x: 30, y: 0},
                    {x: 30, y: 20},
                    {x: -30, y: 20},
                ],
                offset: {x: 0, y: -90},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'GattlingGunBarrel1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -10, y: 0},
                            {x: 10, y: 0},
                            {x: 10, y: 100},
                            {x: -10, y: 100},
                        ],
                        offset: {x: 15, y: -190},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'GattlingGunBarrel2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -10, y: 0},
                            {x: 10, y: 0},
                            {x: 10, y: 100},
                            {x: -10, y: 100},
                        ],
                        offset: {x: -15, y: -190},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'GattlingGunMainBarrel',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -10, y: 0},
                            {x: 10, y: 0},
                            {x: 10, y: 110},
                            {x: -10, y: 110},
                        ],
                        offset: {x: 0, y: -200},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 0,
                            reload: {c: 45, t: 1},
                            spread: Math.PI/24,
                            bullet: {
                                type: 'circle', 
                                cType: 'point', 
                                size: 5,
                                style: {
                                    fill: {r: 100, g: 100, b: 100, a: 1},
                                    stroke: {colour: {r: 69, g: 69, b: 69, a: 1}, width: 2},
                                },
                                decay: {
                                    life: 100, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    size: 1
                                },
                                dmg: 20,
                                v: 25,
                                vDrag: 0.99,
                                vr: 0,
                                rDrag: 0,
                                friendly: true,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'GattlingGunPart',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -30, y: 0},
                            {x: 30, y: 0},
                            {x: 30, y: 10},
                            {x: -30, y: 10},
                        ],
                        offset: {x: 0, y: -150},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
            BasicGun: {
                id: 'basicGun',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -10, y: 0},
                    {x: 10, y: 0},
                    {x: 10, y: 30},
                    {x: -10, y: 30},
                ],
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 6, t: 25},
                    spread: Math.PI/48/2,
                    bullet: {
                        type: 'circle', 
                        cType: 'point', 
                        size: 8,
                        style: {
                            fill: {r: 100, g: 100, b: 100, a: 1},
                            stroke: {colour: {r: 69, g: 69, b: 69, a: 1}, width: 3},
                        },
                        decay: {
                            life: 100, 
                            fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            size: 1
                        },
                        dmg: 50,
                        v: 20,
                        vDrag: 0.99,
                        vr: 0,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [],
            },
            GunTurret: {
                id: 'gunTurretBase',
                facing: 'body',
                type: 'circle', 
                rOffset: 0,
                size: 15,
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'basicGun',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -8, y: 0},
                            {x: 8, y: 0},
                            {x: 8, y: 60},
                            {x: -8, y: 60},
                        ],
                        offset: {x: 0, y: -50},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 0,
                            reload: {c: 6, t: 20},
                            spread: Math.PI/48/2,
                            bullet: {
                                type: 'circle', 
                                cType: 'point', 
                                size: 6,
                                style: {
                                    fill: {r: 100, g: 100, b: 100, a: 1},
                                    stroke: {colour: {r: 69, g: 69, b: 69, a: 1}, width: 3},
                                },
                                decay: {
                                    life: 100, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    size: 1
                                },
                                dmg: 50,
                                v: 30,
                                vDrag: 0.99,
                                vr: 0,
                                rDrag: 0,
                                friendly: true,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'gunTurretBase',
                        facing: 'body',
                        type: 'circle', 
                        rOffset: 0,
                        size: 15,
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    }
                ],
            },
            LightMachineGun: {
                id: 'LightMachineGun',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -10, y: 0},
                    {x: 10, y: 0},
                    {x: 10, y: 30},
                    {x: -10, y: 30},
                ],
                offset: {x: 0, y: -100},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 6, t: 15},
                    spread: Math.PI/48/4,
                    bullet: {
                        type: 'circle', 
                        cType: 'point', 
                        size: 8,
                        style: {
                            fill: {r: 100, g: 100, b: 100, a: 1},
                            stroke: {colour: {r: 69, g: 69, b: 69, a: 1}, width: 3},
                        },
                        decay: {
                            life: 120, 
                            fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            size: 1
                        },
                        dmg: 100,
                        v: 20,
                        vDrag: 0.99,
                        vr: 0,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [],
            },
            CannonSideMounted: {
                id: 'cannonSideMounted',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 5*Math.PI/180,
                size: [
                    {x: -10, y: -10},
                    {x: 10, y: -10},
                    {x: 10, y: 70},
                    {x: -10, y: 70},
                ],
                offset: {x: 5, y: -90},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 6, t: 15},
                    spread: Math.PI/48/4,
                    bullet: {
                        type: 'circle', 
                        cType: 'point', 
                        size: 8,
                        style: {
                            fill: {r: 100, g: 100, b: 100, a: 1},
                            stroke: {colour: {r: 69, g: 69, b: 69, a: 1}, width: 3},
                        },
                        decay: {
                            life: 120, 
                            fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            size: 1
                        },
                        dmg: 100,
                        v: 20,
                        vDrag: 0.99,
                        vr: 0,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'mount',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 30, y: -20},
                            {x: 30, y: 20},
                            {x: 0, y: 15},
                            {x: 0, y: -15},
                        ],
                        offset: {x: -10, y: -10},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
            PlasmaMachineGun: {
                id: 'PlasmaMachineGun',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -8, y: 0},
                    {x: 8, y: 0},
                    {x: 8, y: 100},
                    {x: -8, y: 100},
                ],
                offset: {x: 0, y: -170},
                style: {
                    fill: 'rgba(120, 120, 120, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 6, t: 30},
                    spread: Math.PI/36,
                    bullet: {
                        type: 'circle', 
                        cType: 'point', 
                        size: 6,
                        style: {
                            fill: {r: 100, g: 100, b: 255, a: 1},
                            stroke: {colour: {r: 50, g: 50, b: 150, a: 1}, width: 1},
                        },
                        decay: {
                            life: 250, 
                            fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            size: 1
                        },
                        dmg: 500,
                        v: 15,
                        vDrag: 1,
                        vr: 0,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'MachineGunBarrel',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -10, y: -40},
                            {x: 10, y: -40},
                            {x: 10, y: 30},
                            {x: -10, y: 30},
                        ],
                        offset: {x: 0, y: -100},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.1',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 0, y: -80},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.2',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 0, y: -92},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.3',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 0, y: -104},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.4',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 0, y: -116},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.5',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 0, y: -128},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
            PlasmaMachineGunSideMounted: {
                id: 'PlasmaMachineGun',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -8, y: 0},
                    {x: 8, y: 0},
                    {x: 8, y: 100},
                    {x: -8, y: 100},
                ],
                offset: {x: 0, y: -150},
                style: {
                    fill: 'rgba(120, 120, 120, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 6, t: 30},
                    spread: Math.PI/36,
                    bullet: {
                        type: 'circle', 
                        cType: 'point', 
                        size: 6,
                        style: {
                            fill: {r: 100, g: 100, b: 255, a: 1},
                            stroke: {colour: {r: 50, g: 50, b: 150, a: 1}, width: 1},
                        },
                        decay: {
                            life: 250, 
                            fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            size: 1
                        },
                        dmg: 500,
                        v: 15,
                        vDrag: 1,
                        vr: 0,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'MachineGunBarrel',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -10, y: -40},
                            {x: 10, y: -40},
                            {x: 10, y: 30},
                            {x: -10, y: 30},
                        ],
                        offset: {x: 0, y: -80},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.1',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 0, y: -60},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.2',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 0, y: -72},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.3',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 0, y: -84},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.4',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 0, y: -96},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.5',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 0, y: -108},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'mount',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 30, y: -20},
                            {x: 30, y: 20},
                            {x: 0, y: 15},
                            {x: 0, y: -15},
                        ],
                        offset: {x: -10, y: -30},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
            MediumMachineGun: {
                id: 'mediumMachineGun',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -10, y: 0},
                    {x: 10, y: 0},
                    {x: 10, y: 100},
                    {x: -10, y: 100},
                ],
                offset: {x: 0, y: -170},
                style: {
                    fill: 'rgba(120, 120, 120, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 6, t: 6},
                    spread: Math.PI/24,
                    bullet: {
                        type: 'circle', 
                        cType: 'point', 
                        size: 6,
                        style: {
                            fill: {r: 100, g: 100, b: 100, a: 1},
                            stroke: {colour: {r: 69, g: 69, b: 69, a: 1}, width: 3},
                        },
                        decay: {
                            life: 120, 
                            fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            size: 1
                        },
                        dmg: 60,
                        v: 40,
                        vDrag: 0.99,
                        vr: 0,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'lightMachineGunBarrel',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -15, y: -40},
                            {x: 15, y: -40},
                            {x: 15, y: 30},
                            {x: -15, y: 30},
                        ],
                        offset: {x: 0, y: -100},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.1',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 6, y: -80},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.2',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 6, y: -92},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.3',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 6, y: -104},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.4',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 6, y: -116},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco1.5',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: 6, y: -128},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco2.1',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: -6, y: -75},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco2.2',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: -6, y: -87},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco2.3',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: -6, y: -99},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco2.4',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: -6, y: -111},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco2.5',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: -6, y: -123},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'lightMachineGunBarrelDeco2.6',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 5,
                        offset: {x: -6, y: -135},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
            HeavyMachineGun: {
                id: 'GattlingGunContainer',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -30, y: 0},
                    {x: 30, y: 0},
                    {x: 30, y: 20},
                    {x: -30, y: 20},
                ],
                offset: {x: 0, y: -90},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'GattlingGunBarrel1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -10, y: 0},
                            {x: 10, y: 0},
                            {x: 10, y: 100},
                            {x: -10, y: 100},
                        ],
                        offset: {x: 15, y: -190},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'GattlingGunBarrel2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -10, y: 0},
                            {x: 10, y: 0},
                            {x: 10, y: 100},
                            {x: -10, y: 100},
                        ],
                        offset: {x: -15, y: -190},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'GattlingGunMainBarrel',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -10, y: 0},
                            {x: 10, y: 0},
                            {x: 10, y: 110},
                            {x: -10, y: 110},
                        ],
                        offset: {x: 0, y: -200},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 0,
                            reload: {c: 45, t: 2},
                            spread: Math.PI/12,
                            bullet: {
                                type: 'circle', 
                                cType: 'point', 
                                size: 8,
                                style: {
                                    fill: {r: 100, g: 100, b: 100, a: 1},
                                    stroke: {colour: {r: 69, g: 69, b: 69, a: 1}, width: 2},
                                },
                                decay: {
                                    life: 150, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    size: 1
                                },
                                dmg: 100,
                                v: 60,
                                vDrag: 0.99,
                                vr: 0,
                                rDrag: 0,
                                friendly: true,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'GattlingGunPart',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -30, y: 0},
                            {x: 30, y: 0},
                            {x: 30, y: 10},
                            {x: -30, y: 10},
                        ],
                        offset: {x: 0, y: -150},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
            SpikeLauncher: {
                id: 'spikeLauncher',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -30, y: -30},
                    {x: 30, y: -30},
                    {x: 10, y: 0},
                    {x: -10, y: 0},
                ],
                offset: {x: 0, y: -70},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: -40,
                    reload: {c: 0, t: 120},
                    delay: {c: 0, t: 0},
                    spread: Math.PI/24,
                    bullet: {
                        type: 'polygon',
                        cType: 'point',  
                        size: [
                            {x: 0, y: 5*4},
                            {x: -1.299*4, y: 0.75*4},
                            {x: -4.330*4, y: -2.5*4},
                            {x: 0, y: -1.5*4},
                            {x: 4.330*4, y: -2.5*4},
                            {x: 1.299*4, y: 0.75*4}
                        ],
                        style: {
                            fill: {r: 255, g: 100, b: 50, a: 1},
                            stroke: {colour: {r: 255, g: 0, b: 0, a: 1}, width: 3},
                        },
                        decay: {
                            life: 1500, 
                            fillStyle: {r: -0.01, g: 0, b: 0, a: 0}, 
                            strokeStyle: {r: -0.01, g: 0, b: 0, a: 0}, 
                            size: 1.0005
                        },
                        dmg: 1000,
                        v: 20,
                        vDrag: 0.97,
                        vr: Math.PI/20,
                        rDrag: 0.98,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'spikeLauncherBarrel1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -30, y: -30},
                            {x: 30, y: -30},
                            {x: 10, y: 0},
                            {x: -10, y: 0},
                        ],
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: -40,
                            reload: {c: 0, t: 120},
                            delay: {c: 5, t: 5},
                            spread: Math.PI/24,
                            bullet: {
                                type: 'polygon',
                                cType: 'point',  
                                size: [
                                    {x: 0, y: 5*4},
                                    {x: -1.299*4, y: 0.75*4},
                                    {x: -4.330*4, y: -2.5*4},
                                    {x: 0, y: -1.5*4},
                                    {x: 4.330*4, y: -2.5*4},
                                    {x: 1.299*4, y: 0.75*4}
                                ],
                                style: {
                                    fill: {r: 255, g: 100, b: 50, a: 1},
                                    stroke: {colour: {r: 255, g: 0, b: 0, a: 1}, width: 3},
                                },
                                decay: {
                                    life: 1500, 
                                    fillStyle: {r: -0.01, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: -0.01, g: 0, b: 0, a: 0}, 
                                    size: 1.0005
                                },
                                dmg: 1000,
                                v: 20,
                                vDrag: 0.97,
                                vr: Math.PI/20,
                                rDrag: 0.98,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'spikeLauncherBarrel2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -30, y: -30},
                            {x: 30, y: -30},
                            {x: 10, y: 0},
                            {x: -10, y: 0},
                        ],
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: -40,
                            reload: {c: 0, t: 120},
                            delay: {c: 10, t: 10},
                            spread: Math.PI/24,
                            bullet: {
                                type: 'polygon',
                                cType: 'point',  
                                size: [
                                    {x: 0, y: 5*4},
                                    {x: -1.299*4, y: 0.75*4},
                                    {x: -4.330*4, y: -2.5*4},
                                    {x: 0, y: -1.5*4},
                                    {x: 4.330*4, y: -2.5*4},
                                    {x: 1.299*4, y: 0.75*4}
                                ],
                                style: {
                                    fill: {r: 255, g: 100, b: 50, a: 1},
                                    stroke: {colour: {r: 255, g: 0, b: 0, a: 1}, width: 3},
                                },
                                decay: {
                                    life: 1500, 
                                    fillStyle: {r: -0.01, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: -0.01, g: 0, b: 0, a: 0}, 
                                    size: 1.0005
                                },
                                dmg: 1000,
                                v: 20,
                                vDrag: 0.97,
                                vr: Math.PI/20,
                                rDrag: 0.98,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'spikeLauncherBarrel3',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -30, y: -30},
                            {x: 30, y: -30},
                            {x: 10, y: 0},
                            {x: -10, y: 0},
                        ],
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: -40,
                            reload: {c: 0, t: 120},
                            delay: {c: 15, t: 15},
                            spread: Math.PI/24,
                            bullet: {
                                type: 'polygon',
                                cType: 'point',  
                                size: [
                                    {x: 0, y: 5*4},
                                    {x: -1.299*4, y: 0.75*4},
                                    {x: -4.330*4, y: -2.5*4},
                                    {x: 0, y: -1.5*4},
                                    {x: 4.330*4, y: -2.5*4},
                                    {x: 1.299*4, y: 0.75*4}
                                ],
                                style: {
                                    fill: {r: 255, g: 100, b: 50, a: 1},
                                    stroke: {colour: {r: 255, g: 0, b: 0, a: 1}, width: 3},
                                },
                                decay: {
                                    life: 1500, 
                                    fillStyle: {r: -0.01, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: -0.01, g: 0, b: 0, a: 0}, 
                                    size: 1.0005
                                },
                                dmg: 1000,
                                v: 20,
                                vDrag: 0.97,
                                vr: Math.PI/20,
                                rDrag: 0.98,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'spikeLauncherBarrel4',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -30, y: -30},
                            {x: 30, y: -30},
                            {x: 10, y: 0},
                            {x: -10, y: 0},
                        ],
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: -40,
                            reload: {c: 0, t: 120},
                            delay: {c: 20, t: 20},
                            spread: Math.PI/24,
                            bullet: {
                                type: 'polygon',
                                cType: 'point',  
                                size: [
                                    {x: 0, y: 5*4},
                                    {x: -1.299*4, y: 0.75*4},
                                    {x: -4.330*4, y: -2.5*4},
                                    {x: 0, y: -1.5*4},
                                    {x: 4.330*4, y: -2.5*4},
                                    {x: 1.299*4, y: 0.75*4}
                                ],
                                style: {
                                    fill: {r: 255, g: 100, b: 50, a: 1},
                                    stroke: {colour: {r: 255, g: 0, b: 0, a: 1}, width: 3},
                                },
                                decay: {
                                    life: 1500, 
                                    fillStyle: {r: -0.01, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: -0.01, g: 0, b: 0, a: 0}, 
                                    size: 1.0005
                                },
                                dmg: 1000,
                                v: 20,
                                vDrag: 0.97,
                                vr: Math.PI/20,
                                rDrag: 0.98,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'spikeLauncherBarrel5',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -30, y: -30},
                            {x: 30, y: -30},
                            {x: 10, y: 0},
                            {x: -10, y: 0},
                        ],
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: -40,
                            reload: {c: 0, t: 120},
                            delay: {c: 25, t: 25},
                            spread: Math.PI/24,
                            bullet: {
                                type: 'polygon',
                                cType: 'point',  
                                size: [
                                    {x: 0, y: 5*4},
                                    {x: -1.299*4, y: 0.75*4},
                                    {x: -4.330*4, y: -2.5*4},
                                    {x: 0, y: -1.5*4},
                                    {x: 4.330*4, y: -2.5*4},
                                    {x: 1.299*4, y: 0.75*4}
                                ],
                                style: {
                                    fill: {r: 255, g: 100, b: 50, a: 1},
                                    stroke: {colour: {r: 255, g: 0, b: 0, a: 1}, width: 3},
                                },
                                decay: {
                                    life: 1500, 
                                    fillStyle: {r: -0.01, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: -0.01, g: 0, b: 0, a: 0}, 
                                    size: 1.0005
                                },
                                dmg: 1000,
                                v: 20,
                                vDrag: 0.97,
                                vr: Math.PI/20,
                                rDrag: 0.98,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    }
                ],
            },
            Blaster: {
                id: 'blaster',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -30, y: -30},
                    {x: 30, y: -30},
                    {x: 10, y: 0},
                    {x: -10, y: 0},
                ],
                offset: {x: 0, y: -70},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: -40,
                    reload: {c: 15, t: 2},
                    spread: Math.PI/100,
                    bullet: {
                        type: 'circle', 
                        size: 5,
                        style: {
                            fill: {r: 20, g: 150, b: 150, a: 1},
                            stroke: {colour: {r: 0, g: 250, b: 250, a: 1}, width: 3},
                        },
                        decay: {
                            life: 100, 
                            fillStyle: {r: -0.1, g: -0.1, b: -0.1, a: 0}, 
                            strokeStyle: {r: -0.1, g: -0.1, b: -0.1, a: 0}, 
                            size: 1.0005
                        },
                        dmg: 20,
                        v: 20,
                        vDrag: 0.97,
                        vr: Math.PI/20,
                        rDrag: 0.98,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [],
            },
            EnergySword: {
                id: 'energySword',
                facing: 'turret',
                type: 'polygon', 
                rOffset: Math.PI,
                size: [
                    {x: -25, y: 25},
                    {x: 25, y: 25},
                    {x: 20, y: 0},
                    {x: -20, y: 0},
                ],
                offset: {x: 0, y: -70},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 25,
                    reload: {c: 1, t: 0},
                    spread: 0,
                    bullet: {
                        type: 'polygon', 
                        size: [
                            {x: -25, y: 0},
                            {x: -15, y: 15},
                            {x: -15, y: 30},
                            {x: -20, y: 35},
                            {x: -25, y: 200},
                            {x: 0, y: 250},
                            {x: 25, y: 200},
                            {x: 20, y: 35},
                            {x: 15, y: 30},
                            {x: 15, y: 15},
                            {x: 25, y: 0},
                        ],
                        style: {
                            fill: {r: 50, g: 200, b: 255, a: 0.5},
                            stroke: {colour: {r: 50, g: 200, b: 255, a: 0.7}, width: 5},
                        },
                        decay: {
                            life: 2, 
                            fillStyle: {r: 0, g: 0, b: 0, a: -0.05}, 
                            strokeStyle: {r: 0, g: 0, b: 0, a: -0.05}, 
                            size: 1
                        },
                        accel: true,
                        dmg: 125,
                        v: -3,
                        vDrag: 1,
                        vr: 0,
                        rDrag: 1,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [],
            },
            EnergySpear: {
                id: 'energySword',
                facing: 'turret',
                type: 'polygon', 
                rOffset: Math.PI,
                size: [
                    {x: -25, y: 25},
                    {x: 25, y: 25},
                    {x: 20, y: 0},
                    {x: -20, y: 0},
                ],
                offset: {x: 0, y: -70},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'energySpearTip',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: Math.PI,
                        size: 0,
                        offset: {x: 0, y: -400},
                        style: {
                            fill: 'rgba(150, 150, 150, 0)',
                            stroke: {colour: 'rgba(150, 150, 150, 0)', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 25,
                            reload: {c: 1, t: 0},
                            spread: 0,
                            bullet: {
                                type: 'polygon', 
                                size: [
                                    {x: -25*0.75, y: 0},
                                    {x: -15*0.75, y: 15*0.75},
                                    {x: -15*0.75, y: 30*0.75},
                                    {x: -20*0.75, y: 35*0.75},
                                    {x: -25*0.75, y: 200*0.75},
                                    {x: 0, y: 250*0.75},
                                    {x: 25*0.75, y: 200*0.75},
                                    {x: 20*0.75, y: 35*0.75},
                                    {x: 15*0.75, y: 30*0.75},
                                    {x: 15*0.75, y: 15*0.75},
                                    {x: 25*0.75, y: 0},
                                ],
                                style: {
                                    fill: {r: 50, g: 200, b: 255, a: 0.5},
                                    stroke: {colour: {r: 50, g: 200, b: 255, a: 0.7}, width: 5},
                                },
                                decay: {
                                    life: 5, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: -0.05}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: -0.05}, 
                                    size: 1
                                },
                                dmg: 75,
                                v: -5,
                                vDrag: 1,
                                vr: 0,
                                rDrag: 1,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'energySpearHandle',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: Math.PI,
                        size: 0,
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(150, 150, 150, 0)',
                            stroke: {colour: 'rgba(150, 150, 150, 0)', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 25,
                            reload: {c: 1, t: 0},
                            spread: 0,
                            bullet: {
                                type: 'polygon', 
                                size: [
                                    {x: -5, y: 0},
                                    {x: 5, y: 0},
                                    {x: 5, y: 380},
                                    {x: -5, y: 380},
                                ],
                                style: {
                                    fill: {r: 50, g: 200, b: 255, a: 0.5},
                                    stroke: {colour: {r: 50, g: 200, b: 255, a: 0.7}, width: 5},
                                },
                                decay: {
                                    life: 2, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: -0.05}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: -0.05}, 
                                    size: 1
                                },
                                dmg: 1,
                                v: 0,
                                vDrag: 1,
                                vr: 0,
                                rDrag: 1,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
            Cannon: {
                id: 'tankCannon',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -10, y: 0},
                    {x: 10, y: 0},
                    {x: 10, y: 30},
                    {x: -10, y: 30},
                ],
                offset: {x: 0, y: -100},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 10},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 6, t: 12},
                    spread: Math.PI/48/4,
                    bullet: {
                        type: 'circle', 
                        cType: 'point', 
                        size: 8,
                        style: {
                            fill: {r: 100, g: 100, b: 100, a: 1},
                            stroke: {colour: {r: 69, g: 69, b: 69, a: 1}, width: 3},
                        },
                        decay: {
                            life: 120, 
                            fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            size: 1
                        },
                        dmg: 120,
                        v: 20,
                        vDrag: 0.99,
                        vr: 0,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [],
            },
            OldSniper: {
                id: 'defaultSniper',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -10, y: 0},
                    {x: 10, y: 0},
                    {x: 10, y: 120},
                    {x: -10, y: 120},
                ],
                offset: {x: 0, y: -190},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 45, t: 90},
                    spread: Math.PI/480,
                    bullet: {
                        type: 'polygon', 
                        cType: 'point', 
                        size: [
                            {x: -8, y: 5},
                            {x: 0, y: -20},
                            {x: 8, y: 5},
                        ],
                        style: {
                            fill: {r: 255, g: 100, b: 100, a: 1},
                            stroke: {colour: {r: 255, g: 69, b: 69, a: 1}, width: 3},
                        },
                        decay: {
                            life: 180, 
                            fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            size: 1
                        },
                        dmg: 750,
                        v: 30,
                        maxV: 30,
                        vDrag: 1,
                        vr: 0,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [],
            },
            Sniper: {
                id: 'Armour Piercing Sniper',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -8, y: 0},
                    {x: 8, y: 0},
                    {x: 8, y: 200},
                    {x: -8, y: 200},
                ],
                offset: {x: 0, y: -270},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 30, t: 90},
                    spread: 0,
                    bullet: {
                        type: 'polygon', 
                        cType: 'line', 
                        cSize: {start: {x: 0, y: 5}, end: {x: 0, y: -20}}, 
                        size: [
                            {x: -8, y: 5},
                            {x: 0, y: -20},
                            {x: 8, y: 5},
                        ],
                        style: {
                            fill: {r: 255, g: 150, b: 100, a: 1},
                            stroke: {colour: {r: 230, g: 135, b: 90, a: 1}, width: 3},
                        },
                        decay: {
                            life: 180, 
                            fillStyle: {r: -0.25, g: -0.15, b: -0.1, a: 0}, 
                            strokeStyle: {r: -0.25, g: -0.15, b: -0.1, a: 0}, 
                            size: 0.995
                        },
                        dmg: 4000,
                        v: 55,
                        maxV: 55,
                        vDrag: 1,
                        vr: 0,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'laser1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 2, y: -100},
                            {x: 2, y: 0},
                            {x: 0, y: 0},
                            {x: 0, y: -100},
                        ],
                        offset: {x: 25, y: -180},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: 'rgba(255, 0, 0, 0.2)', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'laser2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 2, y: -200},
                            {x: 2, y: 0},
                            {x: 0, y: 0},
                            {x: 0, y: -200},
                        ],
                        offset: {x: 25, y: -180},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: 'rgba(255, 0, 0, 0.2)', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'laser3',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 2, y: -300},
                            {x: 2, y: 0},
                            {x: 0, y: 0},
                            {x: 0, y: -300},
                        ],
                        offset: {x: 25, y: -180},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: 'rgba(255, 0, 0, 0.2)', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Scope holder',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 8, y: 20},
                            {x: 25, y: 20},
                            {x: 25, y: 0},
                            {x: 8, y: 0},
                        ],
                        offset: {x: 0, y: -170},
                        style: {
                            fill: 'rgba(90, 90, 90, 1)',
                            stroke: {colour: '#696969', width: 2},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Deco',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -3, y: 140},
                            {x: -3, y: 0},
                            {x: 3, y: 0},
                            {x: 3, y: 140},
                        ],
                        offset: {x: -10, y: -230},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 2},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Muzzle',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -13, y: -230},
                            {x: 13, y: -230},
                            {x: 13, y: -200},
                            {x: -13, y: -200},
                        ],
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Body',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -12, y: 0},
                            {x: 12, y: 0},
                            {x: 12, y: 30},
                            {x: -12, y: 30},
                        ],
                        offset: {x: 0, y: -100},
                        style: {
                            fill: 'rgba(120, 120, 120, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Scope',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -5, y: 0},
                            {x: 5, y: 0},
                            {x: 5, y: -40},
                            {x: -5, y: -40},
                        ],
                        offset: {x: 25, y: -140},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Scope deco1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -8, y: 0},
                            {x: 8, y: 0},
                            {x: 5, y: -10},
                            {x: -5, y: -10},
                        ],
                        offset: {x: 25, y: -130},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Scope deco2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -5, y: 0},
                            {x: 5, y: 0},
                            {x: 8, y: -10},
                            {x: -8, y: -10},
                        ],
                        offset: {x: 25, y: -180},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'ammo',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 0, y: 35},
                            {x: -25, y: 35},
                            {x: -20, y: 0},
                            {x: 0, y: 0},
                        ],
                        offset: {x: -12, y: -220},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    }
                ],
            },
            SemiAutoSniper: {
                id: 'Semi Auto Sniper',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -8, y: 0},
                    {x: 8, y: 0},
                    {x: 8, y: 150},
                    {x: -8, y: 150},
                ],
                offset: {x: 0, y: -220},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 20, t: 45},
                    spread: 0,
                    bullet: {
                        type: 'polygon', 
                        cType: 'line', 
                        cSize: {start: {x: 0, y: 5}, end: {x: 0, y: -20}}, 
                        size: [
                            {x: -8, y: 5},
                            {x: 0, y: -20},
                            {x: 8, y: 5},
                        ],
                        style: {
                            fill: {r: 255, g: 150, b: 100, a: 1},
                            stroke: {colour: {r: 230, g: 135, b: 90, a: 1}, width: 3},
                        },
                        decay: {
                            life: 180, 
                            fillStyle: {r: -0.25, g: -0.15, b: -0.1, a: 0}, 
                            strokeStyle: {r: -0.25, g: -0.15, b: -0.1, a: 0}, 
                            size: 0.995
                        },
                        dmg: 2750,
                        v: 50,
                        maxV: 50,
                        vDrag: 1,
                        vr: 0,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'laser1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 2, y: -100},
                            {x: 2, y: 0},
                            {x: 0, y: 0},
                            {x: 0, y: -100},
                        ],
                        offset: {x: 25, y: -180},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: 'rgba(255, 0, 0, 0.2)', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'laser2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 2, y: -200},
                            {x: 2, y: 0},
                            {x: 0, y: 0},
                            {x: 0, y: -200},
                        ],
                        offset: {x: 25, y: -180},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: 'rgba(255, 0, 0, 0.2)', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'laser3',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 2, y: -300},
                            {x: 2, y: 0},
                            {x: 0, y: 0},
                            {x: 0, y: -300},
                        ],
                        offset: {x: 25, y: -180},
                        style: {
                            fill: 'rgba(0, 0, 0, 0)',
                            stroke: {colour: 'rgba(255, 0, 0, 0.2)', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Scope holder',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 8, y: 20},
                            {x: 25, y: 20},
                            {x: 25, y: 0},
                            {x: 8, y: 0},
                        ],
                        offset: {x: 0, y: -170},
                        style: {
                            fill: 'rgba(90, 90, 90, 1)',
                            stroke: {colour: '#696969', width: 2},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Deco',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -3, y: 100},
                            {x: -3, y: 0},
                            {x: 3, y: 0},
                            {x: 3, y: 100},
                        ],
                        offset: {x: -10, y: -190},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 2},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Muzzle',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -13, y: -180},
                            {x: 13, y: -180},
                            {x: 13, y: -150},
                            {x: -13, y: -150},
                        ],
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Body',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -12, y: 0},
                            {x: 12, y: 0},
                            {x: 12, y: 30},
                            {x: -12, y: 30},
                        ],
                        offset: {x: 0, y: -100},
                        style: {
                            fill: 'rgba(120, 120, 120, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Scope',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -5, y: 0},
                            {x: 5, y: 0},
                            {x: 5, y: -40},
                            {x: -5, y: -40},
                        ],
                        offset: {x: 25, y: -140},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Scope deco1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -8, y: 0},
                            {x: 8, y: 0},
                            {x: 5, y: -10},
                            {x: -5, y: -10},
                        ],
                        offset: {x: 25, y: -130},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'Scope deco2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -5, y: 0},
                            {x: 5, y: 0},
                            {x: 8, y: -10},
                            {x: -8, y: -10},
                        ],
                        offset: {x: 25, y: -180},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'ammo',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 0, y: 35},
                            {x: -25, y: 35},
                            {x: -20, y: 0},
                            {x: 0, y: 0},
                        ],
                        offset: {x: -15, y: -180},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    }
                ],
            },
            RPG: {
                id: 'rpg',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -22, y: 0},
                    {x: 22, y: 0},
                    {x: 15, y: 50},
                    {x: -15, y: 50},
                ],
                offset: {x: 40, y: -150},
                style: {
                    fill: 'rgba(130, 130, 130, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 180, t: 150},
                    spread: Math.PI/480,
                    bullet: {
                        type: 'polygon', 
                        cType: 'point', 
                        size: [
                            {x: -8*2.5, y: -10*2.5},
                            {x: 0, y: -20*2.5},
                            {x: 8*2.5, y: -10*2.5},
                            {x: 3*2.5, y: 5*2.5},
                            {x: 3*2.5, y: 7*2.5},
                            {x: 5*2.5, y: 10*2.5},
                            {x: -5*2.5, y: 10*2.5},
                            {x: -3*2.5, y: 7*2.5},
                            {x: -3*2.5, y: 5*2.5},
                        ],
                        style: {
                            fill: {r: 75*1.5, g: 83*1.5, b: 32*1.5, a: 1},
                            stroke: {colour: {r: 67.5*1.2, g: 74.7*1.2, b: 28.8*1.2, a: 1}, width: 5},
                        },
                        decay: {
                            life: 180, 
                            fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            size: 1
                        },
                        dmg: 150,
                        explosion: {
                            dmg: 75, // damage/tick in the explosion radius
                            maxR: 100,
                            expandSpeed: 5,
                            r:20,
                        },
                        v: 2,
                        vDrag: 1.075,
                        accel: true,
                        vr: 0,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'rpg',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -15, y: 120},
                            {x: 15, y: 120},
                            {x: 15, y: 300},
                            {x: -15, y: 300},
                        ],
                        offset: {x: 40, y: -220},
                        style: {
                            fill: 'rgba(130, 130, 130, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    }
                ],
            },
            Nuker: {
                id: 'nukeLauncher',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -22, y: 0},
                    {x: 22, y: 0},
                    {x: 15, y: 50},
                    {x: -15, y: 50},
                ],
                offset: {x: 40, y: -150},
                style: {
                    fill: 'rgba(130, 130, 130, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 180, t: 120},
                    spread: Math.PI/480,
                    bullet: {
                        type: 'polygon', 
                        cType: 'point', 
                        size: [
                            {x: -8*2.5, y: -10*2.5},
                            {x: 0, y: -20*2.5},
                            {x: 8*2.5, y: -10*2.5},
                            {x: 3*2.5, y: 5*2.5},
                            {x: 3*2.5, y: 7*2.5},
                            {x: 5*2.5, y: 10*2.5},
                            {x: -5*2.5, y: 10*2.5},
                            {x: -3*2.5, y: 7*2.5},
                            {x: -3*2.5, y: 5*2.5},
                        ],
                        style: {
                            fill: {r: 75*1.5, g: 83*1.5, b: 32*1.5, a: 1},
                            stroke: {colour: {r: 67.5*1.2, g: 74.7*1.2, b: 28.8*1.2, a: 1}, width: 5},
                        },
                        decay: {
                            life: 180, 
                            fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            size: 1
                        },
                        dmg: 100,
                        explosion: {
                            dmg: 1000, // damage/tick in the explosion radius
                            maxR: 10000,
                            expandSpeed: 25,
                            r:20,
                        },
                        v: 5,
                        vDrag: 1.1,
                        accel: true,
                        vr: 0,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'rpg',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -15, y: 120},
                            {x: 15, y: 120},
                            {x: 15, y: 300},
                            {x: -15, y: 300},
                        ],
                        offset: {x: 40, y: -220},
                        style: {
                            fill: 'rgba(130, 130, 130, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    }
                ],
            },
            DualRPG: {
                id: 'rpgContainer',
                facing: 'body',
                type: 'circle', 
                rOffset: 0,
                size: 0,
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(0, 0, 0, 0)',
                    stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'rpg',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -22, y: 0},
                            {x: 22, y: 0},
                            {x: 15, y: 50},
                            {x: -15, y: 50},
                        ],
                        offset: {x: 40, y: -150},
                        style: {
                            fill: 'rgba(130, 130, 130, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 0,
                            reload: {c: 180, t: 150},
                            spread: Math.PI/480,
                            bullet: {
                                type: 'polygon', 
                                cType: 'point', 
                                size: [
                                    {x: -8*2.5, y: -10*2.5},
                                    {x: 0, y: -20*2.5},
                                    {x: 8*2.5, y: -10*2.5},
                                    {x: 3*2.5, y: 5*2.5},
                                    {x: 3*2.5, y: 7*2.5},
                                    {x: 5*2.5, y: 10*2.5},
                                    {x: -5*2.5, y: 10*2.5},
                                    {x: -3*2.5, y: 7*2.5},
                                    {x: -3*2.5, y: 5*2.5},
                                ],
                                style: {
                                    fill: {r: 75*1.5, g: 83*1.5, b: 32*1.5, a: 1},
                                    stroke: {colour: {r: 67.5*1.2, g: 74.7*1.2, b: 28.8*1.2, a: 1}, width: 5},
                                },
                                decay: {
                                    life: 180, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    size: 1
                                },
                                dmg: 150,
                                explosion: {
                                    dmg: 75, // damage/tick in the explosion radius
                                    maxR: 100,
                                    expandSpeed: 5,
                                    r:20,
                                },
                                v: 2,
                                vDrag: 1.075,
                                accel: true,
                                vr: 0,
                                rDrag: 0,
                                friendly: true,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [
                            {
                                id: 'rpg',
                                facing: 'turret',
                                type: 'polygon', 
                                rOffset: 0,
                                size: [
                                    {x: -15, y: 120},
                                    {x: 15, y: 120},
                                    {x: 15, y: 300},
                                    {x: -15, y: 300},
                                ],
                                offset: {x: 40, y: -220},
                                style: {
                                    fill: 'rgba(130, 130, 130, 1)',
                                    stroke: {colour: '#696969', width: 5},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            }
                        ],
                    },
                    {
                        id: 'rpg',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -22, y: 0},
                            {x: 22, y: 0},
                            {x: 15, y: 50},
                            {x: -15, y: 50},
                        ],
                        offset: {x: -40, y: -150},
                        style: {
                            fill: 'rgba(130, 130, 130, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 0,
                            reload: {c: 180, t: 150},
                            delay: {c: 75, t: 75},
                            spread: Math.PI/480,
                            bullet: {
                                type: 'polygon', 
                                cType: 'point', 
                                size: [
                                    {x: -8*2.5, y: -10*2.5},
                                    {x: 0, y: -20*2.5},
                                    {x: 8*2.5, y: -10*2.5},
                                    {x: 3*2.5, y: 5*2.5},
                                    {x: 3*2.5, y: 7*2.5},
                                    {x: 5*2.5, y: 10*2.5},
                                    {x: -5*2.5, y: 10*2.5},
                                    {x: -3*2.5, y: 7*2.5},
                                    {x: -3*2.5, y: 5*2.5},
                                ],
                                style: {
                                    fill: {r: 75*1.5, g: 83*1.5, b: 32*1.5, a: 1},
                                    stroke: {colour: {r: 67.5*1.2, g: 74.7*1.2, b: 28.8*1.2, a: 1}, width: 5},
                                },
                                decay: {
                                    life: 180, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    size: 1
                                },
                                dmg: 150,
                                explosion: {
                                    dmg: 75, // damage/tick in the explosion radius
                                    maxR: 100,
                                    expandSpeed: 5,
                                    r:20,
                                },
                                v: 2,
                                vDrag: 1.075,
                                accel: true,
                                vr: 0,
                                rDrag: 0,
                                friendly: true,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [
                            {
                                id: 'rpg',
                                facing: 'turret',
                                type: 'polygon', 
                                rOffset: 0,
                                size: [
                                    {x: -15, y: 120},
                                    {x: 15, y: 120},
                                    {x: 15, y: 300},
                                    {x: -15, y: 300},
                                ],
                                offset: {x: -40, y: -220},
                                style: {
                                    fill: 'rgba(130, 130, 130, 1)',
                                    stroke: {colour: '#696969', width: 5},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            }
                        ],
                    },
                ],
            },
            ShieldProjector: {
                id: 'smallShieldBase',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -30, y: 0},
                    {x: -30, y: 30},
                    {x: -20, y: 40},
                    {x: 20, y: 40},
                    {x: 30, y: 30},
                    {x: 30, y: 0},
                ],
                offset: {x: 0, y: 25},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                collision: true,
                hp: 1000,
                maxHp: 1000,
                isHit: 0,
                connected: [
                    {
                        id: 'smallShieldProjector',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 15,
                        offset: {x: 0, y: 45},
                        style: {
                            fill: 'rgba(0, 255, 255, 0.9)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        shield: {
                            keybind: 'q',
                            type: 'circle', 
                            r: 160,
                            hp: 4000,
                            regen: 3,
                            minHp: 1500,
                            active: false,
                            cap: 4000,
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
            LargeShieldProjector: {
                id: 'mediumShieldBase',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -30*1.5, y: 0},
                    {x: -30*1.5, y: 30*1.5},
                    {x: -20*1.5, y: 40*1.5},
                    {x: 20*1.5, y: 40*1.5},
                    {x: 30*1.5, y: 30*1.5},
                    {x: 30*1.5, y: 0},
                ],
                offset: {x: 0, y: 25},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                collision: true,
                hp: 2000,
                maxHp: 2000,
                isHit: 0,
                connected: [
                    {
                        id: 'mediumShieldProjector',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 25,
                        offset: {x: 0, y: 45},
                        style: {
                            fill: 'rgba(0, 255, 255, 0.9)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        shield: {
                            keybind: 'q',
                            type: 'circle', 
                            r: 250,
                            hp: 12000,
                            regen: 10,
                            minHp: 5000,
                            active: false,
                            cap: 12000,
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
            SuperShieldProjector: {
                id: 'superShieldBase',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -30*1.5, y: 0},
                    {x: -30*1.5, y: 30*1.5},
                    {x: -20*1.5, y: 40*1.5},
                    {x: 20*1.5, y: 40*1.5},
                    {x: 30*1.5, y: 30*1.5},
                    {x: 30*1.5, y: 0},
                ],
                offset: {x: 0, y: 25},
                style: {
                    fill: 'rgba(150, 150, 150, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                collision: true,
                hp: 2500,
                maxHp: 2500,
                isHit: 0,
                connected: [
                    {
                        id: 'superShieldProjector',
                        facing: 'turret',
                        type: 'circle', 
                        rOffset: 0,
                        size: 25,
                        offset: {x: 0, y: 45},
                        style: {
                            fill: 'rgba(0, 255, 255, 0.9)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        shield: {
                            keybind: 'q',
                            type: 'circle', 
                            r: 250,
                            hp: 50000,
                            regen: 50,
                            minHp: 10000,
                            active: false,
                            cap: 50000,
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
            MainCannon: {
                id: 'mainCannon',
                facing: 'turret',
                type: 'polygon', 
                rOffset: 0,
                size: [
                    {x: -15, y: 0},
                    {x: 15, y: 0},
                    {x: 15, y: 30},
                    {x: -15, y: 30},
                ],
                offset: {x: 0, y: -230},
                style: {
                    fill: 'rgba(130, 130, 130, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                cannon: {
                    keybind: 'click',
                    x: 0,
                    y: 0,
                    reload: {c: 15, t: 120},
                    spread: Math.PI/480,
                    bullet: {
                        type: 'circle', 
                        cType: 'point', 
                        size: 20,
                        style: {
                            fill: {r: 100, g: 100, b: 100, a: 1},
                            stroke: {colour: {r: 90, g: 90, b: 90, a: 1}, width: 5},
                        },
                        decay: {
                            life: 180, 
                            fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                            size: 1
                        },
                        dmg: 1000,
                        explosion: {
                            dmg: 50, // damage/tick in the explosion radius
                            maxR: 50,
                            expandSpeed: 15,
                            r:50,
                        },
                        v: 20,
                        vDrag: 1,
                        accel: false,
                        vr: 0,
                        rDrag: 0,
                        friendly: true,
                    },
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'cannonBarrel',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -12, y: 0},
                            {x: 12, y: 0},
                            {x: 12, y: -200},
                            {x: -12, y: -200},
                        ],
                        offset: {x: 0, y: 0},
                        style: {
                            fill: 'rgba(130, 130, 130, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    }
                ],
            },
            DualCannon: {
                id: 'dualCannonContainer',
                facing: 'body',
                type: 'circle', 
                rOffset: 0,
                size: 0,
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(130, 130, 130, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'mainCannon1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -15, y: 0},
                            {x: 15, y: 0},
                            {x: 15, y: 30},
                            {x: -15, y: 30},
                        ],
                        offset: {x: 20, y: -180},
                        style: {
                            fill: 'rgba(130, 130, 130, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 0,
                            reload: {c: 15, t: 120},
                            spread: Math.PI/480,
                            bullet: {
                                type: 'circle', 
                                cType: 'point', 
                                size: 15,
                                style: {
                                    fill: {r: 100, g: 100, b: 100, a: 1},
                                    stroke: {colour: {r: 90, g: 90, b: 90, a: 1}, width: 5},
                                },
                                decay: {
                                    life: 180, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    size: 1
                                },
                                dmg: 600,
                                explosion: {
                                    dmg: 50, // damage/tick in the explosion radius
                                    maxR: 50,
                                    expandSpeed: 25,
                                    r:50,
                                },
                                v: 20,
                                vDrag: 1,
                                accel: false,
                                vr: 0,
                                rDrag: 0,
                                friendly: true,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [
                            {
                                id: 'cannonBarrel1',
                                facing: 'turret',
                                type: 'polygon', 
                                rOffset: 0,
                                size: [
                                    {x: -12, y: 0},
                                    {x: 12, y: 0},
                                    {x: 12, y: -150},
                                    {x: -12, y: -150},
                                ],
                                offset: {x: 20, y: 0},
                                style: {
                                    fill: 'rgba(130, 130, 130, 1)',
                                    stroke: {colour: '#696969', width: 5},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            }
                        ],
                    },
                    {
                        id: 'mainCannon2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -15, y: 0},
                            {x: 15, y: 0},
                            {x: 15, y: 30},
                            {x: -15, y: 30},
                        ],
                        offset: {x: -20, y: -180},
                        style: {
                            fill: 'rgba(130, 130, 130, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 0,
                            reload: {c: 15, t: 120},
                            spread: Math.PI/480,
                            delay: {c: 60, t: 60},
                            bullet: {
                                type: 'circle', 
                                cType: 'point', 
                                size: 15,
                                style: {
                                    fill: {r: 100, g: 100, b: 100, a: 1},
                                    stroke: {colour: {r: 90, g: 90, b: 90, a: 1}, width: 5},
                                },
                                decay: {
                                    life: 180, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    size: 1
                                },
                                dmg: 600,
                                explosion: {
                                    dmg: 200, // damage/tick in the explosion radius
                                    maxR: 50,
                                    expandSpeed: 5,
                                    r:50,
                                },
                                v: 20,
                                vDrag: 1,
                                accel: false,
                                vr: 0,
                                rDrag: 0,
                                friendly: true,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [
                            {
                                id: 'cannonBarrel2',
                                facing: 'turret',
                                type: 'polygon', 
                                rOffset: 0,
                                size: [
                                    {x: -12, y: 0},
                                    {x: 12, y: 0},
                                    {x: 12, y: -150},
                                    {x: -12, y: -150},
                                ],
                                offset: {x: -20, y: 0},
                                style: {
                                    fill: 'rgba(130, 130, 130, 1)',
                                    stroke: {colour: '#696969', width: 5},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            }
                        ],
                    }
                ],
            },
            TrippleCannon: {
                id: 'trippleCannonContainer',
                facing: 'body',
                type: 'circle', 
                rOffset: 0,
                size: 0,
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(130, 130, 130, 1)',
                    stroke: {colour: '#696969', width: 5},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'mainCannon1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -15, y: 0},
                            {x: 15, y: 0},
                            {x: 15, y: 30},
                            {x: -15, y: 30},
                        ],
                        offset: {x: 0, y: -180},
                        style: {
                            fill: 'rgba(130, 130, 130, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 0,
                            reload: {c: 15, t: 120},
                            spread: Math.PI/480,
                            bullet: {
                                type: 'circle', 
                                cType: 'point', 
                                size: 15,
                                style: {
                                    fill: {r: 100, g: 100, b: 100, a: 1},
                                    stroke: {colour: {r: 90, g: 90, b: 90, a: 1}, width: 5},
                                },
                                decay: {
                                    life: 180, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    size: 1
                                },
                                dmg: 750,
                                explosion: {
                                    dmg: 50, // damage/tick in the explosion radius
                                    maxR: 50,
                                    expandSpeed: 25,
                                    r:50,
                                },
                                v: 20,
                                vDrag: 1,
                                accel: false,
                                vr: 0,
                                rDrag: 0,
                                friendly: true,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [
                            {
                                id: 'cannonBarrel1',
                                facing: 'turret',
                                type: 'polygon', 
                                rOffset: 0,
                                size: [
                                    {x: 8, y: 20},
                                    {x: -8, y: 20},
                                    {x: -12, y: 0},
                                    {x: -12, y: -150},
                                    {x: 12, y: -150},
                                    {x: 12, y: 0},
                                ],
                                offset: {x: 0, y: 0},
                                style: {
                                    fill: 'rgba(130, 130, 130, 1)',
                                    stroke: {colour: '#696969', width: 5},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            }
                        ],
                    },
                    {
                        id: 'mainCannon2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -15, y: 0},
                            {x: 15, y: 0},
                            {x: 15, y: 30},
                            {x: -15, y: 30},
                        ],
                        offset: {x: -40, y: -180},
                        style: {
                            fill: 'rgba(130, 130, 130, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 0,
                            reload: {c: 15, t: 120},
                            spread: Math.PI/480,
                            delay: {c: 40, t: 40},
                            bullet: {
                                type: 'circle', 
                                cType: 'point', 
                                size: 15,
                                style: {
                                    fill: {r: 100, g: 100, b: 100, a: 1},
                                    stroke: {colour: {r: 90, g: 90, b: 90, a: 1}, width: 5},
                                },
                                decay: {
                                    life: 180, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    size: 1
                                },
                                dmg: 750,
                                explosion: {
                                    dmg: 200, // damage/tick in the explosion radius
                                    maxR: 50,
                                    expandSpeed: 5,
                                    r:50,
                                },
                                v: 20,
                                vDrag: 1,
                                accel: false,
                                vr: 0,
                                rDrag: 0,
                                friendly: true,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [
                            {
                                id: 'cannonBarrel2',
                                facing: 'turret',
                                type: 'polygon', 
                                rOffset: 0,
                                size: [
                                    {x: 8, y: 30},
                                    {x: -10, y: 40},
                                    {x: -12, y: 0},
                                    {x: -12, y: -150},
                                    {x: 12, y: -150},
                                    {x: 12, y: 0},
                                ],
                                offset: {x: -40, y: 0},
                                style: {
                                    fill: 'rgba(130, 130, 130, 1)',
                                    stroke: {colour: '#696969', width: 5},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            }
                        ],
                    },
                    {
                        id: 'mainCannon3',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -15, y: 0},
                            {x: 15, y: 0},
                            {x: 15, y: 30},
                            {x: -15, y: 30},
                        ],
                        offset: {x: 40, y: -180},
                        style: {
                            fill: 'rgba(130, 130, 130, 1)',
                            stroke: {colour: '#696969', width: 5},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 0,
                            reload: {c: 15, t: 120},
                            spread: Math.PI/480,
                            delay: {c: 80, t: 80},
                            bullet: {
                                type: 'circle', 
                                cType: 'point', 
                                size: 15,
                                style: {
                                    fill: {r: 100, g: 100, b: 100, a: 1},
                                    stroke: {colour: {r: 90, g: 90, b: 90, a: 1}, width: 5},
                                },
                                decay: {
                                    life: 180, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    size: 1
                                },
                                dmg: 750,
                                explosion: {
                                    dmg: 200, // damage/tick in the explosion radius
                                    maxR: 50,
                                    expandSpeed: 5,
                                    r:50,
                                },
                                v: 20,
                                vDrag: 1,
                                accel: false,
                                vr: 0,
                                rDrag: 0,
                                friendly: true,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [
                            {
                                id: 'cannonBarrel3',
                                facing: 'turret',
                                type: 'polygon', 
                                rOffset: 0,
                                size: [
                                    {x: 10, y: 40},
                                    {x: -8, y: 30},
                                    {x: -12, y: 0},
                                    {x: -12, y: -150},
                                    {x: 12, y: -150},
                                    {x: 12, y: 0},
                                ],
                                offset: {x: 40, y: 0},
                                style: {
                                    fill: 'rgba(130, 130, 130, 1)',
                                    stroke: {colour: '#696969', width: 5},
                                },
                                collision: false,
                                hp: 1,
                                maxHp: 1,
                                isHit: 0,
                                connected: [],
                            }
                        ],
                    }
                ],
            },
            Railgun: {
                id: 'raingunContainer',
                facing: 'turret',
                type: 'circle', 
                rOffset: 0,
                size: 0,
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(150, 150, 150, 0)',
                    stroke: {colour: '#696969', width: 2},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'glow 1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -23+10, y: 0},
                            {x: -18+10, y: 0},
                            {x: -18+10, y: -160},
                            {x: -23+10, y: -160},
                        ],
                        offset: {x: 0, y: -75},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 2,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'glow 2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23-10, y: 0},
                            {x: 18-10, y: 0},
                            {x: 18-10, y: -160},
                            {x: 23-10, y: -160},
                        ],
                        offset: {x: 0, y: -75},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 2,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'bottom guide rail 1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -23+10, y: 0},
                            {x: -18+10, y: 0},
                            {x: -18+10, y: -160},
                            {x: -23+10, y: -160},
                        ],
                        offset: {x: 0, y: -75},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'bottom guide rail 2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23-10, y: 0},
                            {x: 18-10, y: 0},
                            {x: 18-10, y: -160},
                            {x: 23-10, y: -160},
                        ],
                        offset: {x: 0, y: -75},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'deco 0',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 35, y: -20},
                            {x: -35, y: -20},
                            {x: -30, y: 0},
                            {x: 30, y: 0},
                        ],
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'emitter',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -12, y: 20},
                            {x: 12, y: 20},
                            {x: 12, y: 30},
                            {x: -12, y: 30},
                        ],
                        offset: {x: 0, y: -100},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 0,
                            reload: {c: 30, t: 120},
                            delay: {c: 20, t: 20},
                            spread: 0,
                            bullet: {
                                type: 'polygon', 
                                cType: 'line', 
                                cSize: {start: {x: 0, y: 0}, end: {x: 0, y: -40}},
                                size: [
                                    {x: -4, y: 0},
                                    {x: 4, y: 0},
                                    {x: 4, y: -8},
                                    {x: 2, y: -10},
                                    {x: 2, y: -35},
                                    {x: 0, y: -40},
                                    {x: -2, y: -35},
                                    {x: -2, y: -10},
                                    {x: -4, y: -8},
                                ],
                                style: {
                                    fill: {r: 50, g: 50, b: 50, a: 1},
                                    stroke: {colour: {r: 10, g: 10, b: 10, a: 1}, width: 1},
                                },
                                decay: {
                                    life: 600, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    size: 1
                                },
                                dmg: 6000,
                                v: 75,
                                maxV: 75,
                                vDrag: 1,
                                vr: 0,
                                rDrag: 0,
                                friendly: true,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'guide rail 1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -25, y: 0},
                            {x: -16, y: 0},
                            {x: -16, y: -180},
                            {x: -25, y: -180},
                        ],
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'guide rail 2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 25, y: 0},
                            {x: 16, y: 0},
                            {x: 16, y: -180},
                            {x: 25, y: -180},
                        ],
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -100},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -130},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support3',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -160},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support4',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -190},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support5',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -220},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'deco 1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 4, y: 0},
                            {x: -4, y: 0},
                            {x: -4, y: -120},
                            {x: 4, y: -120},
                        ],
                        offset: {x: -30, y: -90},
                        style: {
                            fill: 'rgba(120, 120, 120, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'deco 2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 4, y: 0},
                            {x: -4, y: 0},
                            {x: -4, y: -120},
                            {x: 4, y: -120},
                        ],
                        offset: {x: 30, y: -90},
                        style: {
                            fill: 'rgba(120, 120, 120, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'arm brace 1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 8, y: -15},
                            {x: -8, y: -15},
                            {x: -5, y: 15},
                            {x: 5, y: 15},
                        ],
                        offset: {x: 20, y: -55},
                        style: {
                            fill: 'rgba(80, 80, 80, 1)',
                            stroke: {colour: 'rgba(40, 40, 40, 1)', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'arm brace 2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 8, y: -15},
                            {x: -8, y: -15},
                            {x: -5, y: 15},
                            {x: 5, y: 15},
                        ],
                        offset: {x: -20, y: -55},
                        style: {
                            fill: 'rgba(80, 80, 80, 1)',
                            stroke: {colour: 'rgba(40, 40, 40, 1)', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
            RailgunMK2: {
                id: 'raingunContainer',
                facing: 'turret',
                type: 'circle', 
                rOffset: 0,
                size: 0,
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(150, 150, 150, 0)',
                    stroke: {colour: '#696969', width: 2},
                },

                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [
                    {
                        id: 'glow 1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -23+10, y: 0},
                            {x: -18+10, y: 0},
                            {x: -18+10, y: -280},
                            {x: -23+10, y: -280},
                        ],
                        offset: {x: 0, y: -75},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 2,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'glow 2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23-10, y: 0},
                            {x: 18-10, y: 0},
                            {x: 18-10, y: -280},
                            {x: 23-10, y: -280},
                        ],
                        offset: {x: 0, y: -75},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 2,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'bottom guide rail 1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -23+10, y: 0},
                            {x: -18+10, y: 0},
                            {x: -18+10, y: -280},
                            {x: -23+10, y: -280},
                        ],
                        offset: {x: 0, y: -75},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'bottom guide rail 2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23-10, y: 0},
                            {x: 18-10, y: 0},
                            {x: 18-10, y: -280},
                            {x: 23-10, y: -280},
                        ],
                        offset: {x: 0, y: -75},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'deco 0',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 35, y: -20},
                            {x: -35, y: -20},
                            {x: -30, y: 0},
                            {x: 30, y: 0},
                        ],
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(100, 100, 100, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'emitter',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -12, y: 20},
                            {x: 12, y: 20},
                            {x: 12, y: 30},
                            {x: -12, y: 30},
                        ],
                        offset: {x: 0, y: -100},
                        style: {
                            fill: 'rgba(150, 150, 150, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        cannon: {
                            keybind: 'click',
                            x: 0,
                            y: 0,
                            reload: {c: 10, t: 15},
                            spread: 0,
                            bullet: {
                                type: 'polygon', 
                                cType: 'line', 
                                cSize: {start: {x: 0, y: 0}, end: {x: 0, y: -40}},
                                size: [
                                    {x: -4, y: 0},
                                    {x: 4, y: 0},
                                    {x: 4, y: -8},
                                    {x: 2, y: -10},
                                    {x: 2, y: -35},
                                    {x: 0, y: -40},
                                    {x: -2, y: -35},
                                    {x: -2, y: -10},
                                    {x: -4, y: -8},
                                ],
                                style: {
                                    fill: {r: 50, g: 50, b: 50, a: 1},
                                    stroke: {colour: {r: 10, g: 10, b: 10, a: 1}, width: 1},
                                },
                                decay: {
                                    life: 600, 
                                    fillStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    strokeStyle: {r: 0, g: 0, b: 0, a: 0}, 
                                    size: 1
                                },
                                dmg: 10000,
                                v: 75,
                                maxV: 75,
                                vDrag: 1,
                                vr: 0,
                                rDrag: 0,
                                friendly: true,
                            },
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'guide rail 1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: -25, y: 0},
                            {x: -16, y: 0},
                            {x: -16, y: -300},
                            {x: -25, y: -300},
                        ],
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'guide rail 2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 25, y: 0},
                            {x: 16, y: 0},
                            {x: 16, y: -300},
                            {x: 25, y: -300},
                        ],
                        offset: {x: 0, y: -70},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -100},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -130},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support3',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -160},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support4',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -190},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support5',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -220},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support6',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -250},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support7',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -280},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support8',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -310},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'support9',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 23, y: 10},
                            {x: -23, y: 10},
                            {x: -23, y: 0},
                            {x: 23, y: 0},
                        ],
                        offset: {x: 0, y: -340},
                        style: {
                            fill: 'rgba(180, 180, 180, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'deco 1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 4, y: 0},
                            {x: -4, y: 0},
                            {x: -4, y: -180},
                            {x: 4, y: -180},
                        ],
                        offset: {x: -30, y: -90},
                        style: {
                            fill: 'rgba(120, 120, 120, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'deco 2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 4, y: 0},
                            {x: -4, y: 0},
                            {x: -4, y: -180},
                            {x: 4, y: -180},
                        ],
                        offset: {x: 30, y: -90},
                        style: {
                            fill: 'rgba(120, 120, 120, 1)',
                            stroke: {colour: '#696969', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'arm brace 1',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 8, y: -15},
                            {x: -8, y: -15},
                            {x: -5, y: 15},
                            {x: 5, y: 15},
                        ],
                        offset: {x: 20, y: -55},
                        style: {
                            fill: 'rgba(80, 80, 80, 1)',
                            stroke: {colour: 'rgba(40, 40, 40, 1)', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                    {
                        id: 'arm brace 2',
                        facing: 'turret',
                        type: 'polygon', 
                        rOffset: 0,
                        size: [
                            {x: 8, y: -15},
                            {x: -8, y: -15},
                            {x: -5, y: 15},
                            {x: 5, y: 15},
                        ],
                        offset: {x: -20, y: -55},
                        style: {
                            fill: 'rgba(80, 80, 80, 1)',
                            stroke: {colour: 'rgba(40, 40, 40, 1)', width: 1},
                        },
                        collision: false,
                        hp: 1,
                        maxHp: 1,
                        isHit: 0,
                        connected: [],
                    },
                ],
            },
        },
        obstacles: {
            obstacle1: {
                type: 'polygon',
                cType: 'ground',
                size: [
                    {x: -500, y: -650},
                    {x: -450, y: -700},
                    {x: 950, y: -700},
                    {x: 1000, y: -650},
                    {x: 1000, y: -450},
                    {x: 950, y: -400},
                    {x: -450, y: -400},
                    {x: -500, y: -450},
                ],
                style: {
                    fill: 'rgba(50, 250, 250, 0.8)',
                    stroke: {colour: 'rgba(45, 225, 225, 0.8)', width: 10},
                },
            },
            obstacle2: {
                type: 'polygon',
                cType: 'ground',
                size: [
                    {x: -500+200, y: 650+200},
                    {x: -450+200, y: 700+200},
                    {x: 950+200, y: 700+200},
                    {x: 1000+200, y: 650+200},
                    {x: 1000+200, y: 450},
                    {x: 950+200, y: 400},
                    {x: -450+200, y: 400},
                    {x: -500+200, y: 450},
                ],
                style: {
                    fill: 'rgba(50, 250, 250, 0.8)',
                    stroke: {colour: 'rgba(45, 225, 225, 0.8)', width: 10},
                },
            },
            obstacle3: {
                type: 'polygon',
                cType: 'tall',
                size: circleToPolygon({x: -800, y: 0}, 250, 6),
                style: {
                    fill: 'rgba(128, 128, 128, 1)',
                    stroke: {colour: 'rgba(115, 115, 115, 1)', width: 10},
                },
            },
            obstacle4: {
                type: 'polygon',
                cType: 'tall',
                size: [
                    {x: 950+500, y: -500},
                    {x: 1000+500, y: -550},
                    {x: 1000+500, y: -1350},
                    {x: 950+500, y: -1400},
                    {x: 50+500, y: -1400},
                    {x: 0+500, y: -1350},
                    {x: 0+500, y: -1250},
                    {x: 50+500, y: -1200},
                    {x: 750+500, y: -1200},
                    {x: 800+500, y: -1150},
                    {x: 800+500, y: -550},
                    {x: 850+500, y: -500},
                ],
                style: {
                    fill: 'rgba(128, 128, 128, 1)',
                    stroke: {colour: 'rgba(115, 115, 115, 1)', width: 10},
                },
            },
            basicWall: {
                type: 'polygon',
                cType: 'tall',
                size: [
                    {x: -500, y: -100},
                    {x: 500, y: -100},
                    {x: 300, y: 100},
                    {x: -300, y: 100},
                ],
                style: {
                    fill: 'rgba(128, 128, 128, 1)',
                    stroke: {colour: 'rgba(115, 115, 115, 1)', width: 10},
                },
                collisionEdges: [0,2],
            },
            basicFiller: {
                type: 'polygon',
                cType: 'tall',
                size: [
                    {x: -200, y: -100},
                    {x: 200, y: -100},
                    {x: 0, y: 100},
                ],
                style: {
                    fill: 'rgba(128, 128, 128, 1)',
                    stroke: {colour: 'rgba(115, 115, 115, 1)', width: 10},
                },
                collisionEdges: [0],
            },
            level2Lake: {
                type: 'polygon',
                cType: 'ground',
                size: [
                    {x: -280, y: 100},
                    {x: 280, y: 100},
                    {x: 300, y: 80},
                    {x: 300, y: -80},
                    {x: 280, y: -100},
                    {x: -280, y: -100},
                    {x: -300, y: -80},
                    {x: -300, y: 80},
                ],
                style: {
                    fill: 'rgba(50, 250, 250, 0.8)',
                    stroke: {colour: 'rgba(45, 225, 225, 0.8)', width: 10},
                },
            },
        },
        parts: {
            empty: {
                id: 'placeholder',
                type: 'circle', 
                facing: 'body',
                rOffset: 0,
                size: 0,
                offset: {x: 0, y: 0},
                style: {
                    fill: 'rgba(0, 0, 0, 0)',
                    stroke: {colour: 'rgba(0, 0, 0, 0)', width: 1},
                },
                collision: false,
                hp: 1,
                maxHp: 1,
                isHit: 0,
                connected: [],
            },
        },
    },
    scripts: {
        noAI: `(function() {${noAI}})()`,
        turretAI: `(function() {${advancedTurretAI}})()`,
        sniperAI: `(function() {${sniperTurretAI}})()`,
        tankAI: `(function() {${basicTankAI}})()`,
        targetAI: `(function() {${basicMovingTargetAI}})()`,
        shieldAI: `(function() {${shieldAI}})()`,
    },
    checkpoint: {
        x: 0,
        y: 0,
        collisionR: 100,
        type: 'checkpoint',
        triggered: false,
        parts: [
            {
                id: 'Checkpoint',
                facing: 'body',
                type: 'circle', 
                rOffset: 0,
                size: 100,
                offset: {x: 10, y: 10},
                style: {
                    fill: 'rgba(100, 255, 100, 1)',
                    stroke: {colour: 'rgba(50, 200, 50, 1)', width: 10},
                },
                style2: {
                    fill: 'rgba(80, 204, 80, 1)',
                    stroke: {colour: 'rgba(40, 160, 40, 1)', width: 10},
                },
                connected: [],
            },
        ],
    },
    red: { // SHOULD be compatible with any rendering thing I made (in theory)
        fill: 'rgba(255, 0, 0, 1)',
        stroke: {colour: 'rgba(255, 0, 0, 1)', width: 5, opacity: 1},
    },
    green: { // SHOULD be compatible with any rendering thing I made (in theory)
        fill: 'rgba(0, 255, 0, 1)',
        stroke: {colour: 'rgba(0, 255, 0, 1)', width: 5, opacity: 1},
    },
    blue: { // SHOULD be compatible with any rendering thing I made (in theory)
        fill: 'rgba(0, 0, 255, 1)',
        stroke: {colour: 'rgba(0, 0, 255, 1)', width: 5, opacity: 1},
    },
    black: { // SHOULD be compatible with any rendering thing I made (in theory)
        fill: 'rgba(0, 0, 0, 1)',
        stroke: {colour: 'rgba(0, 0, 0, 1)', width: 5, opacity: 1},
    },
    white: { // SHOULD be compatible with any rendering thing I made (in theory)
        fill: 'rgba(0, 0, 0, 1)',
        stroke: {colour: 'rgba(0, 0, 0, 1)', width: 5, opacity: 1},
    },
};

var teams = [];
var projectiles = [];
var particles = [];
var entities = [];
var obstacles = [];
var explosions = [];
var shields = [];
var checkpoint = JSON.parse(JSON.stringify(data.checkpoint));

obstacles.push(data.template.obstacles.obstacle1);
obstacles.push(data.template.obstacles.obstacle2);
obstacles.push(data.template.obstacles.obstacle3);
obstacles.push(data.template.obstacles.obstacle4);
let obstacle5 = JSON.parse(JSON.stringify(data.template.obstacles.obstacle4));
obstacle5.cType = 'ground';
obstacle5.style = {
    fill: 'rgba(50, 250, 250, 0.8)',
    stroke: {colour: 'rgba(45, 225, 225, 0.8)', width: 10},
};
obstacle5.size = offsetPoints(rotatePolygon(obstacle5.size, Math.PI/2), {x: 300, y: 500});
obstacles.push(obstacle5);

// Loading savegames TODO: add saving entire game not just player
var player = {};
//localStorage.removeItem('player');
var savedPlayer = localStorage.getItem('player');
if (savedPlayer !== null) {
    console.log('loading previous save');
    player = JSON.parse(savedPlayer);
    console.log(savedPlayer);
} else {
    // No saved data found
    console.log('no save found, creating new player');
    player = JSON.parse(JSON.stringify(data.mech));
    
    drone = JSON.parse(JSON.stringify(data.drone));
    tank = JSON.parse(JSON.stringify(data.tank));
    mech = JSON.parse(JSON.stringify(data.mech));
    mech.x += 500;
    //mech.directControl = true;
    let lWeapon = JSON.parse(JSON.stringify(data.template.weapons.SpikeLauncher));
    lWeapon.offset.x -= 100;
    mech.parts[1].connected[0].connected = [lWeapon];
    let rWeapon = JSON.parse(JSON.stringify(data.template.weapons.LightMachineGun));
    rWeapon.offset.x += 100;
    mech.parts[1].connected[1].connected = [rWeapon];
    entities.push(JSON.parse(JSON.stringify(mech)));
    tank.x += 1000;
    //tank.directControl = true;
    entities.push(JSON.parse(JSON.stringify(tank)));
    drone.x += 1500;
    //drone.directControl = true;
    entities.push(JSON.parse(JSON.stringify(drone)));
    player.directControl = true;
    
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'leftArmMain');
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'rightArmMain');
    player = addWeapon(player, 'Cannon', 'mech', 'leftArmSide');
    player = addWeapon(player, 'Cannon', 'mech', 'rightArmSide');
    player = addWeapon(player, 'GunTurret', 'mech', 'headTurret');
    player = addWeapon(player, 'DualRPG', 'mech', 'back');

    entities.push(player);
};

// Steal Data (get inputs)
var mousepos = {x:0,y:0};
var display = {x:window.innerWidth, y:window.innerHeight};
//console.log(display);
//console.log(entities);
window.onkeyup = function(e) {
    for (var i = 0; i < entities.length; i++) {
        if (entities[i].directControl) {
            entities[i].keyboard[e.key.toLowerCase()] = false; 
        }
    }
};
window.onkeydown = function(e) {
    for (var i = 0; i < entities.length; i++) {
        if (entities[i].directControl) {
            entities[i].keyboard[e.key.toLowerCase()] = true; 
            if (!paused) {
                e.preventDefault();
            }
        }
    }
};
document.addEventListener('mousedown', function(event) {
    if (event.button === 0) { // Check if left mouse button was clicked
        for (var i = 0; i < entities.length; i++) {
            if (entities[i].directControl) {
                entities[i].keyboard.click = true;
            }
        }
    }
});
document.addEventListener('mouseup', function(event) {
    if (event.button === 0) { // Check if left mouse button was released
        for (var i = 0; i < entities.length; i++) {
            if (entities[i].directControl) {
                entities[i].keyboard.click = false;
            }
        }
    }
});
window.addEventListener("resize", function () {
    if (t > 0) {
        display = {x:window.innerWidth,y:window.innerHeight};
        replacehtml(`<canvas id="main" width="${display.x}" height="${display.y}" style="position: absolute; top: 0; left: 0; z-index: 1;"></canvas><canvas id="canvasOverlay" width="${display.x}" height="${display.y}" style="position: absolute; top: 0; left: 0; z-index: 2;"></canvas>`);
    }
});
function tellPos(p){
    mousepos = {x: p.pageX, y:p.pageY};
};
window.addEventListener('mousemove', tellPos, false);
var buttons = document.getElementsByClassName('button');

// Game related stuff
function load() {
    console.log('Startin the game...');
    replacehtml(`<canvas id="main" width="${display.x}" height="${display.y}" style="position: absolute; top: 0; left: 0; z-index: 1;"></canvas><canvas id="canvasOverlay" width="${display.x}" height="${display.y}" style="position: absolute; top: 0; left: 0; z-index: 2;"></canvas>`);
    game();
};

function loadLevel(level) {
    console.log('Startin the game...');
    replacehtml(`<canvas id="main" width="${display.x}" height="${display.y}" style="position: absolute; top: 0; left: 0; z-index: 1;"></canvas><canvas id="canvasOverlay" width="${display.x}" height="${display.y}" style="position: absolute; top: 0; left: 0; z-index: 2;"></canvas>`);
    /*
    switch (n) {
        case 1:
            level1({x: 0, y: -900});
            break;
        case 2:
            level2({x: 0, y: -900});
            break;
        case 3:
            level3({x: 0, y: -900});
            break;
        case 4:
            level4({x: 0, y: -900});
            break;
        case 5:
            level5({x: 0, y: -900});
            break;
        case 6:
            level6({x: 0, y: -900});
            break;
        case 7:
            level7({x: 0, y: -900});
            break;
        case 8:
            level8({x: 0, y: -900});
            break;
        case 9:
            level9({x: 0, y: -900});
            break;
        case 0:
            testing();
            break;
        default:
            throw `ERROR: Unknown level ${n}`;
    }*/
    eval(`level${level}();`);
    preGame = true;
    t = 0;
    winTime = -1;
    game();
};

function loadScript(force, n) {
    for (let i=0; i < teams.length; i++) {
        if (teams[i].id == force) {
            if (n == 0) {
                teams[i].script = `(function() {${document.getElementById(`script${n}`).value}})()`; //.replaceAll('\n', '').replaceAll('\t', '')
                console.log(teams[i].script);
            } else {
                teams[i].scripts[`script${n}`] = `(function() {${document.getElementById(`script${n}`).value}})()`; //.replaceAll('\n', '').replaceAll('\t', '')
                console.log(teams[i].scripts);
            }
        }
    }
};

function placeObstacle(objId, r, coords) {
    let obj = JSON.parse(JSON.stringify(data.template.obstacles[objId]));
    obj.size = offsetPoints(rotatePolygon(obj.size, r), coords);
    for (let i = 0; i < obj.size.length; i++) {
        obj.size[i].x = Math.round(obj.size[i].x/10)*10;
        obj.size[i].y = Math.round(obj.size[i].y/10)*10;
    }

    obstacles.push(obj);
    return 0
};
/*
function level1(pos={x: 0, y: 0}, scale=1) {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    obstacles = [];
    entities = [];
    projectiles = [];
    explosions = [];
    particles = [];
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.y = -900;
    
    placeObstacle(basicWall, 0, vMath(vMath({x: 0, y: -600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2*3, vMath(vMath({x: -400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2*3, vMath(vMath({x: -400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 0, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2*3, vMath(vMath({x: 400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -400, y: 300}, pos, '+'), scale, '*'));

    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    entities.push(player);
    console.log('Loaded level 1');
};*/

function levelMovementI() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = -1200;
    
    // place obstacles
    placeObstacle(basicWall, 0, {x: 0, y: -1500});
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: -1100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -1100});
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: -100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -100});
    placeObstacle(basicWall, Math.PI, {x: 0, y: 300});

    placeObstacle(basicFiller, Math.PI/2*3, {x: 400, y: -600});
    placeObstacle(basicFiller, Math.PI/2, {x: -400, y: -600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'rightArmMain');
    player = addWeapon(player, 'none', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'none', 'mech', 'leftArmMain');
    player = addWeapon(player, 'none', 'mech', 'leftArmSide');
    player = addWeapon(player, 'none', 'mech', 'back');
    entities.push(player);

    console.log('Loaded level Movement I');
};

function levelMovementII() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 2000;
    checkpoint.y = -1950;

    // place obstacles
    placeObstacle(basicWall, 0, {x: 0, y: -2500});
    placeObstacle(basicWall, 0, {x: 800, y: -1700});
    placeObstacle(basicWall, 0, {x: 1800, y: -1700});
    placeObstacle(basicWall, Math.PI, {x: 800, y: -2500});
    placeObstacle(basicWall, Math.PI, {x: 1800, y: -2500});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -2100});
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: -1100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -1100});
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: -100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -100});
    placeObstacle(basicWall, Math.PI, {x: 0, y: 300});

    placeObstacle(basicFiller, Math.PI/2*3, {x: 400, y: -1600});
    placeObstacle(basicFiller, Math.PI/2, {x: -400, y: -1600});
    placeObstacle(basicFiller, Math.PI/2*3, {x: 400, y: -600});
    placeObstacle(basicFiller, Math.PI/2, {x: -400, y: -600});
    placeObstacle(basicFiller, 0, {x: 1300, y: -2500});
    placeObstacle(basicFiller, Math.PI, {x: 1300, y: -1700});
    placeObstacle(basicFiller, 0, {x: 2300, y: -2500});
    placeObstacle(basicFiller, Math.PI, {x: 2300, y: -1700});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'none', 'mech', 'rightArmMain');
    player = addWeapon(player, 'none', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'none', 'mech', 'leftArmMain');
    player = addWeapon(player, 'none', 'mech', 'leftArmSide');
    player = addWeapon(player, 'none', 'mech', 'back');
    entities.push(player);

    console.log('Loaded level Movement II');
};

function levelMovementIII() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 0;

    // place obstacles


    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'none', 'mech', 'rightArmMain');
    player = addWeapon(player, 'none', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'none', 'mech', 'leftArmMain');
    player = addWeapon(player, 'none', 'mech', 'leftArmSide');
    player = addWeapon(player, 'none', 'mech', 'back');
    entities.push(player);

    console.log('Loaded level Movement III');
};

function levelMovementIV() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = randint(-2200, 2200);
    checkpoint.y = randint(-10300, 1000);

    // place obstacles
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -3200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -4200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -4200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -5200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -5200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -6200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -6200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -7200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -7200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -8200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -8200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -9200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -9200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -10200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -10200});
    placeObstacle(basicWall, 0, {x: 0, y: -10600});
    placeObstacle(basicWall, 0, {x: 1000, y: -10600});
    placeObstacle(basicWall, 0, {x: -1000, y: -10600});
    placeObstacle(basicWall, 0, {x: 2000, y: -10600});
    placeObstacle(basicWall, 0, {x: -2000, y: -10600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -2700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -3700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -3700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -4700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -4700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -5700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -5700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -6700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -6700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -7700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -7700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -8700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -8700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -8700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -8700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -9700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -9700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -10600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -10600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -10600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -10600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player.v *= 5;
    player = addWeapon(player, 'EnergySword', 'mech', 'rightArmMain');
    player = addWeapon(player, 'Engine', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'EnergySword', 'mech', 'leftArmMain');
    player = addWeapon(player, 'Engine', 'mech', 'leftArmSide');
    player = addWeapon(player, 'Exhausts', 'mech', 'back');
    entities.push(player);

    // create enemy target
    let targetEnemy = Object.assign({}, JSON.parse(JSON.stringify(data.target)), JSON.parse(JSON.stringify(data.template.memory)));
    targetEnemy.team = 'Enemy';
    targetEnemy.script = 'noAI';
    for (let i=0; i < 25; i++) {
        targetEnemy.x = randint(-2200, 2200);
        targetEnemy.y = randint(-10300, 1000);
        entities.push(JSON.parse(JSON.stringify(targetEnemy)));
    }
    targetEnemy.x = -2200;
    targetEnemy.y = 1000;
    entities.push(JSON.parse(JSON.stringify(targetEnemy)));
    targetEnemy.x = 2200;
    targetEnemy.y = -10300;
    entities.push(JSON.parse(JSON.stringify(targetEnemy)));

    console.log('Loaded level Movement IV');
};

/*
function level2(pos={x: 0, y: 0}, scale=1) {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    obstacles = [];
    entities = [];
    projectiles = [];
    explosions = [];
    particles = [];
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.y = 0;

    placeObstacle('level2Lake', 0, vMath(vMath({x: 0, y: 0}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 0, y: -600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2*3, vMath(vMath({x: -400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2*3, vMath(vMath({x: -400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 0, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2*3, vMath(vMath({x: 400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -400, y: 300}, pos, '+'), scale, '*'));

    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    let enemy = JSON.parse(JSON.stringify(data.mech));
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'rightArmMain');
    enemy = addWeapon(enemy, 'MediumMachineGun', 'mech', 'leftArmMain');
    enemy = addWeapon(enemy, 'MediumMachineGun', 'mech', 'rightArmMain');
    enemy.aimPos = {x: enemy.x, y: enemy.y + 200};
    enemy.x = (0 + pos.x) * scale;
    enemy.y = (-300 + pos.y) * scale;
    entities.push(player);
    entities.push(enemy);
    console.log('Loaded level 2');
};*/

function levelAimingI() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 0;

    // place obstacles
    placeObstacle(basicWall, 0, {x: 0, y: -500});
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: -100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -100});
    placeObstacle(basicWall, Math.PI, {x: 0, y: 300});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'rightArmMain');
    player = addWeapon(player, 'none', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'none', 'mech', 'leftArmMain');
    player = addWeapon(player, 'none', 'mech', 'leftArmSide');
    player = addWeapon(player, 'none', 'mech', 'back');
    entities.push(player);

    // create enemy mech
    let mechEnemy = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    mechEnemy.team = 'Enemy';
    mechEnemy.script = 'noAI';
    mechEnemy = addWeapon(mechEnemy, 'none', 'mech', 'rightArmMain');
    mechEnemy = addWeapon(mechEnemy, 'none', 'mech', 'rightArmSide');
    mechEnemy = addWeapon(mechEnemy, 'none', 'mech', 'headTurret');
    mechEnemy = addWeapon(mechEnemy, 'none', 'mech', 'leftArmMain');
    mechEnemy = addWeapon(mechEnemy, 'none', 'mech', 'leftArmSide');
    mechEnemy = addWeapon(mechEnemy, 'none', 'mech', 'back');
    mechEnemy.aimPos = {x: mechEnemy.x, y: mechEnemy.y + 1};
    mechEnemy.x = -160;
    mechEnemy.y = -275;
    entities.push(mechEnemy);
    console.log('Loaded level Aiming I');
};

function levelAimingII() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 0;

    // place obstacles
    placeObstacle('level2Lake', 0, {x: 0, y: -1900});
    placeObstacle(basicWall, 0, {x: 0, y: -2500});
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: -2100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -2100});
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: -1100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -1100});
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: -100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -100});
    placeObstacle(basicWall, Math.PI, {x: 0, y: 300});

    placeObstacle(basicFiller, Math.PI/2*3, {x: 400, y: -1600});
    placeObstacle(basicFiller, Math.PI/2, {x: -400, y: -1600});
    placeObstacle(basicFiller, Math.PI/2*3, {x: 400, y: -600});
    placeObstacle(basicFiller, Math.PI/2, {x: -400, y: -600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    enemyForce.scripts.defendAI = data.scripts.shieldAI;
    teams.push(enemyForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'leftArmMain');
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'rightArmMain');
    player = addWeapon(player, 'Cannon', 'mech', 'leftArmSide');
    player = addWeapon(player, 'Cannon', 'mech', 'rightArmSide');
    player = addWeapon(player, 'GunTurret', 'mech', 'headTurret');
    player = addWeapon(player, 'none', 'mech', 'back');
    entities.push(player);

    // create enemy mech
    let mechEnemy = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    mechEnemy.team = 'Enemy';
    mechEnemy.script = 'defendAI';
    mechEnemy = addWeapon(mechEnemy, 'Shield', 'mech', 'rightArmMain');
    mechEnemy = addWeapon(mechEnemy, 'none', 'mech', 'rightArmSide');
    mechEnemy = addWeapon(mechEnemy, 'none', 'mech', 'headTurret');
    mechEnemy = addWeapon(mechEnemy, 'EnergySword', 'mech', 'leftArmMain');
    mechEnemy = addWeapon(mechEnemy, 'Cannon', 'mech', 'leftArmSide');
    mechEnemy = addWeapon(mechEnemy, 'none', 'mech', 'back');
    mechEnemy.aimPos = {x: mechEnemy.x, y: mechEnemy.y + 1};
    mechEnemy.x = 0;
    mechEnemy.y = -2200;
    entities.push(mechEnemy);
    console.log('Loaded level Aiming II');
};

function levelAimingIII() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 0;

    // place obstacles
    placeObstacle('level2Lake', 0, {x: 0, y: -1900});
    placeObstacle(basicWall, 0, {x: 0, y: -2500});
    placeObstacle(basicWall, 0, {x: 800, y: -1700});
    placeObstacle(basicWall, 0, {x: 1800, y: -1700});
    placeObstacle(basicWall, Math.PI, {x: 800, y: -2500});
    placeObstacle(basicWall, Math.PI, {x: 1800, y: -2500});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -2100});
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: -1100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -1100});
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: -100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -100});
    placeObstacle(basicWall, Math.PI, {x: 0, y: 300});

    placeObstacle(basicFiller, Math.PI/2*3, {x: 400, y: -1600});
    placeObstacle(basicFiller, Math.PI/2, {x: -400, y: -1600});
    placeObstacle(basicFiller, Math.PI/2*3, {x: 400, y: -600});
    placeObstacle(basicFiller, Math.PI/2, {x: -400, y: -600});
    placeObstacle(basicFiller, 0, {x: 1300, y: -2500});
    placeObstacle(basicFiller, Math.PI, {x: 1300, y: -1700});
    placeObstacle(basicFiller, 0, {x: 2300, y: -2500});
    placeObstacle(basicFiller, Math.PI, {x: 2300, y: -1700});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'none', 'mech', 'rightArmMain');
    player = addWeapon(player, 'none', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'Sniper', 'mech', 'leftArmMain');
    player = addWeapon(player, 'none', 'mech', 'leftArmSide');
    player = addWeapon(player, 'none', 'mech', 'back');
    entities.push(player);

    // create enemy target
    let targetEnemy = Object.assign({}, JSON.parse(JSON.stringify(data.target)), JSON.parse(JSON.stringify(data.template.memory)));
    targetEnemy.team = 'Enemy';
    targetEnemy.script = 'noAI';
    targetEnemy.parts[0].hp = 4001;
    targetEnemy.x = -300;
    targetEnemy.y = -2100;
    entities.push(JSON.parse(JSON.stringify(targetEnemy)));
    targetEnemy.x = 2300;
    targetEnemy.y = -2300;
    entities.push(JSON.parse(JSON.stringify(targetEnemy)));
    targetEnemy.y = -2100;
    entities.push(JSON.parse(JSON.stringify(targetEnemy)));
    targetEnemy.y = -1900;
    entities.push(JSON.parse(JSON.stringify(targetEnemy)));
    console.log('Loaded level Aiming III');
};

function levelAimingIV() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 0;

    // place obstacles
    placeObstacle('level2Lake', 0, {x: 0, y: -1200});
    placeObstacle(basicWall, 0, {x: 0, y: -2500});
    placeObstacle(basicWall, 0, {x: 800, y: -1700});
    placeObstacle(basicWall, 0, {x: 1800, y: -1700});
    placeObstacle(basicWall, 0, {x: -800, y: -1700});
    placeObstacle(basicWall, 0, {x: -1800, y: -1700});
    placeObstacle(basicWall, Math.PI, {x: 800, y: -2500});
    placeObstacle(basicWall, Math.PI, {x: 1800, y: -2500});
    placeObstacle(basicWall, Math.PI, {x: -800, y: -2500});
    placeObstacle(basicWall, Math.PI, {x: -1800, y: -2500});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -2400, y: -2100});
    //placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -2100});
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: -1100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -1100});
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: -100});
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -100});
    placeObstacle(basicWall, Math.PI, {x: 0, y: 300});

    placeObstacle(basicFiller, Math.PI/2*3, {x: 400, y: -1600});
    placeObstacle(basicFiller, Math.PI/2, {x: -400, y: -1600});
    placeObstacle(basicFiller, Math.PI/2*3, {x: 400, y: -600});
    placeObstacle(basicFiller, Math.PI/2, {x: -400, y: -600});
    placeObstacle(basicFiller, 0, {x: 1300, y: -2500});
    placeObstacle(basicFiller, Math.PI, {x: 1300, y: -1700});
    placeObstacle(basicFiller, 0, {x: 2300, y: -2500});
    placeObstacle(basicFiller, 0, {x: -1300, y: -2500});
    placeObstacle(basicFiller, Math.PI, {x: -1300, y: -1700});
    placeObstacle(basicFiller, 0, {x: -2300, y: -2500});
    placeObstacle(basicFiller, Math.PI, {x: 2300, y: -1700});
    placeObstacle(basicFiller, Math.PI, {x: -2300, y: -1700});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    enemyForce.scripts.targetAI = data.scripts.targetAI;
    teams.push(enemyForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'none', 'mech', 'rightArmMain');
    player = addWeapon(player, 'none', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'Sniper', 'mech', 'leftArmMain');
    player = addWeapon(player, 'none', 'mech', 'leftArmSide');
    player = addWeapon(player, 'none', 'mech', 'back');
    entities.push(player);

    // create enemy target
    let targetEnemy = Object.assign({}, JSON.parse(JSON.stringify(data.target)), JSON.parse(JSON.stringify(data.template.memory)));
    targetEnemy.team = 'Enemy';
    targetEnemy.script = 'targetAI';
    targetEnemy.parts[0].hp = 1;
    targetEnemy.mouseR = Math.PI/2;
    targetEnemy.r = 1;
    targetEnemy.x = -3000;
    targetEnemy.y = -2300;
    entities.push(JSON.parse(JSON.stringify(targetEnemy)));
    targetEnemy.x = -1700;
    targetEnemy.y = -2200;
    entities.push(JSON.parse(JSON.stringify(targetEnemy)));
    targetEnemy.x = 1600;
    targetEnemy.y = -2100;
    entities.push(JSON.parse(JSON.stringify(targetEnemy)));
    targetEnemy.x = -2000;
    targetEnemy.y = -2000;
    entities.push(JSON.parse(JSON.stringify(targetEnemy)));
    targetEnemy.x = 2800;
    targetEnemy.y = -1900;
    entities.push(JSON.parse(JSON.stringify(targetEnemy)));
    console.log('Loaded level Aiming IV');
};

/*
function level3(pos={x: 0, y: 0}, scale=1) {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.y = 0;

    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 0, y: 0}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 0, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 1000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: -1000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -1400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 1400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -1400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 1400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -1400, y: -1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 1400, y: -1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 0, y: -1600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 1000, y: -1600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: -1000, y: -1600}, pos, '+'), scale, '*'));

    placeObstacle(basicFiller, 0, vMath(vMath({x: 500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: -500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 1400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -1400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 1400, y: -700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -1400, y: -700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: 500, y: -1600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: -500, y: -1600}, pos, '+'), scale, '*'));

    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'rightArmMain');
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'leftArmMain');
    entities.push(player);
    let enemy1 = Object.assign({}, JSON.parse(JSON.stringify(data.turret)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy1.team = 'Enemy';
    enemy1.script = 'turretAI';
    enemy1 = addWeapon(enemy1, 'MainCannon', 'staticTurret', 'mainGun');
    enemy1.x = 0;
    enemy1.y = -1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    console.log('Loaded level 4');
}*/

function levelTacticsI() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 500;

    // place obstacles
    placeObstacle(basicWall, Math.PI, {x: 0, y: 0});
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -1400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 1400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -1400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 1400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -1400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 1400, y: -1200});
    placeObstacle(basicWall, 0, {x: 0, y: -1600});
    placeObstacle(basicWall, 0, {x: 1000, y: -1600});
    placeObstacle(basicWall, 0, {x: -1000, y: -1600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 1400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -1400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 1400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -1400, y: -700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -1600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -1600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.turretAI = data.scripts.sniperAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player.x = 0;
    player.y = 900;
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'rightArmMain');
    player = addWeapon(player, 'none', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'leftArmMain');
    player = addWeapon(player, 'none', 'mech', 'leftArmSide');
    player = addWeapon(player, 'none', 'mech', 'back');
    entities.push(player);

    // create enemy turret
    let enemy1 = Object.assign({}, JSON.parse(JSON.stringify(data.turret)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy1.team = 'Enemy';
    enemy1.script = 'turretAI';
    enemy1 = addWeapon(enemy1, 'RailgunMK2', 'staticTurret', 'mainGun');
    enemy1.x = 0;
    enemy1.y = -900;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    console.log('Loaded level 4');
}

function levelTacticsII() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = -1200;

    // place obstacles
    placeObstacle(basicWall, 0, {x: 0, y: -1600}); //top
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: -1200}); //topRight
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: -1200}); //topLeft
    placeObstacle(basicWall, Math.PI/2, {x: 400, y: 800}); //bottomRight
    placeObstacle(basicWall, Math.PI/2*3, {x: -400, y: 800}); //bottomLeft
    placeObstacle(basicWall, Math.PI/2*3, {x: -1400, y: -200}); //left
    placeObstacle(basicWall, Math.PI/2, {x: 1400, y: -200}); //right
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200}); //bottom
    placeObstacle(basicWall, 0, {x: -800, y: 200}); //leftBottom
    placeObstacle(basicWall, 0, {x: 800, y: 200}); //rightBottom
    placeObstacle(basicWall, Math.PI, {x: -800, y: -600}); //leftTop
    placeObstacle(basicWall, Math.PI, {x: 800, y: -600}); //rightTop
    placeObstacle(basicFiller, Math.PI/2*3, {x: 400, y: 300}); //bottomLeftFill
    placeObstacle(basicFiller, Math.PI/2, {x: -400, y: 300});  //bottomRightFill
    placeObstacle(basicFiller, Math.PI/2*3, {x: 400, y: -700}); //TopLeftFill
    placeObstacle(basicFiller, Math.PI/2, {x: -400, y: -700});  //TopRightFill
    placeObstacle(basicFiller, Math.PI, {x: -1300, y: 200}); //leftBottomFill
    placeObstacle(basicFiller, Math.PI, {x: 1300, y: 200}); //rightBottomFill
    placeObstacle(basicFiller, 0, {x: -1300, y: -600}); //leftTopFill
    placeObstacle(basicFiller, 0, {x: 1300, y: -600}); //rightTopFill

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player.y = 800;
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'rightArmMain');
    player = addWeapon(player, 'none', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'none', 'mech', 'leftArmMain');
    player = addWeapon(player, 'none', 'mech', 'leftArmSide');
    player = addWeapon(player, 'RPG', 'mech', 'back');
    entities.push(player);

    // create enemy turret
    let turretEnemy = Object.assign({}, JSON.parse(JSON.stringify(data.turret)), JSON.parse(JSON.stringify(data.template.memory)));
    turretEnemy.team = 'Enemy';
    turretEnemy.script = 'turretAI';
    turretEnemy = addWeapon(turretEnemy, 'TrippleCannon', 'staticTurret', 'mainGun');
    turretEnemy.x = -900;
    turretEnemy.y = -200;
    entities.push(JSON.parse(JSON.stringify(turretEnemy)));
    turretEnemy.x = 900;
    turretEnemy.y = -200;
    entities.push(JSON.parse(JSON.stringify(turretEnemy)));

    console.log('Loaded level Tactics II');
};

function levelTacticsIII() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 400;

    // place obstacles
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -3200});
    placeObstacle(basicWall, 0, {x: 0, y: -3600});
    placeObstacle(basicWall, 0, {x: 1000, y: -3600});
    placeObstacle(basicWall, 0, {x: -1000, y: -3600});
    placeObstacle(basicWall, 0, {x: 2000, y: -3600});
    placeObstacle(basicWall, 0, {x: -2000, y: -3600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -2700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -3600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // Create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player.y = 400;
    player = addWeapon(player, 'SpikeLauncher', 'mech', 'rightArmMain');
    entities.push(player);

    // create enemy tank
    let tankEnemy = Object.assign({}, JSON.parse(JSON.stringify(data.tank)), JSON.parse(JSON.stringify(data.template.memory)));
    tankEnemy.team = 'Enemy';
    tankEnemy.script = 'tankAI';
    tankEnemy = addWeapon(tankEnemy, 'HeavyMachineGun', 'tank', 'main');
    tankEnemy.x = -1500;
    tankEnemy.y = 400;
    entities.push(JSON.parse(JSON.stringify(tankEnemy)));

    console.log('Loaded level Tactics III');
};

function levelTacticsIV() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 400;

    // place obstacles
    placeObstacle('level2Lake', 0, {x: 300, y: -1600});
    placeObstacle('level2Lake', 0, {x: -300, y: -1600});
    
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -3200});
    placeObstacle(basicWall, 0, {x: 0, y: -3600});
    placeObstacle(basicWall, 0, {x: 1000, y: -3600});
    placeObstacle(basicWall, 0, {x: -1000, y: -3600});
    placeObstacle(basicWall, 0, {x: 2000, y: -3600});
    placeObstacle(basicWall, 0, {x: -2000, y: -3600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -2700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -3600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // Create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player.y = 400;
    player = addWeapon(player, 'Cannon', 'mech', 'rightArmMain');
    player = addWeapon(player, 'Cannon', 'mech', 'leftArmMain');
    entities.push(player);

    // create enemy tank
    let tankEnemy = Object.assign({}, JSON.parse(JSON.stringify(data.tank)), JSON.parse(JSON.stringify(data.template.memory)));
    tankEnemy.team = 'Enemy';
    tankEnemy.script = 'tankAI';
    tankEnemy = addWeapon(tankEnemy, 'EnergySpear', 'tank', 'main');
    tankEnemy = addWeapon(tankEnemy, 'Engine', 'tank', 'rightSide');
    tankEnemy = addWeapon(tankEnemy, 'Engine', 'tank', 'leftSide');
    tankEnemy.v *= 2;
    tankEnemy.x = -1500;
    tankEnemy.y = 400;
    entities.push(JSON.parse(JSON.stringify(tankEnemy)));

    console.log('Loaded level Tactics IV');
};

/*
function level4(pos={x: 0, y: 0}, scale=1) {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.y = -2000;

    placeObstacle(basicWall, 0, vMath(vMath({x: 0, y: -1600}, pos, '+'), scale, '*')); //top
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 400, y: -1200}, pos, '+'), scale, '*')); //topRight
    placeObstacle(basicWall, Math.PI/2*3, vMath(vMath({x: -400, y: -1200}, pos, '+'), scale, '*')); //topLeft
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 400, y: 800}, pos, '+'), scale, '*')); //bottomRight
    placeObstacle(basicWall, Math.PI/2*3, vMath(vMath({x: -400, y: 800}, pos, '+'), scale, '*')); //bottomLeft
    placeObstacle(basicWall, Math.PI/2*3, vMath(vMath({x: -1400, y: -200}, pos, '+'), scale, '*')); //left
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 1400, y: -200}, pos, '+'), scale, '*')); //right
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 0, y: 1200}, pos, '+'), scale, '*')); //bottom
    placeObstacle(basicWall, 0, vMath(vMath({x: -800, y: 200}, pos, '+'), scale, '*')); //leftBottom
    placeObstacle(basicWall, 0, vMath(vMath({x: 800, y: 200}, pos, '+'), scale, '*')); //rightBottom
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: -800, y: -600}, pos, '+'), scale, '*')); //leftTop
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 800, y: -600}, pos, '+'), scale, '*')); //rightTop
    placeObstacle(basicFiller, Math.PI/2*3, vMath(vMath({x: 400, y: 300}, pos, '+'), scale, '*')); //bottomLeftFill
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -400, y: 300}, pos, '+'), scale, '*'));  //bottomRightFill
    placeObstacle(basicFiller, Math.PI/2*3, vMath(vMath({x: 400, y: -700}, pos, '+'), scale, '*')); //TopLeftFill
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -400, y: -700}, pos, '+'), scale, '*'));  //TopRightFill
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: -1300, y: 200}, pos, '+'), scale, '*')); //leftBottomFill
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: 1300, y: 200}, pos, '+'), scale, '*')); //rightBottomFill
    placeObstacle(basicFiller, 0, vMath(vMath({x: -1300, y: -600}, pos, '+'), scale, '*')); //leftTopFill
    placeObstacle(basicFiller, 0, vMath(vMath({x: 1300, y: -600}, pos, '+'), scale, '*')); //rightTopFill

    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'RPG', 'mech', 'back');
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'rightArmMain');
    entities.push(player);
    let enemy1 = Object.assign({}, JSON.parse(JSON.stringify(data.turret)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy1.team = 'Enemy';
    enemy1.script = 'turretAI';
    enemy1 = addWeapon(enemy1, 'DualCannon', 'staticTurret', 'mainGun');
    enemy1.x = -900;
    enemy1.y = -1000;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = 900;
    enemy1.y = -1000;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    console.log('Loaded level 4');
};*/

function levelCombatI() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 0;

    // place obstacles
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -3200});
    placeObstacle(basicWall, 0, {x: 0, y: -3600});
    placeObstacle(basicWall, 0, {x: 1000, y: -3600});
    placeObstacle(basicWall, 0, {x: -1000, y: -3600});
    placeObstacle(basicWall, 0, {x: 2000, y: -3600});
    placeObstacle(basicWall, 0, {x: -2000, y: -3600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -2700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -3600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'RPG', 'mech', 'rightArmMain');
    player = addWeapon(player, 'none', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'RPG', 'mech', 'leftArmMain');
    player = addWeapon(player, 'none', 'mech', 'leftArmSide');
    player = addWeapon(player, 'none', 'mech', 'back');
    entities.push(player);

    // create enemy tank
    let tankEnemy = Object.assign({}, JSON.parse(JSON.stringify(data.tank)), JSON.parse(JSON.stringify(data.template.memory)));
    tankEnemy.team = 'Enemy';
    tankEnemy.script = 'tankAI';
    tankEnemy = addWeapon(tankEnemy, 'MainCannon', 'tank', 'main');
    tankEnemy.r = Math.PI;
    tankEnemy.mouseR = Math.PI/2;
    tankEnemy.x = 0;
    tankEnemy.y = -2500;
    entities.push(JSON.parse(JSON.stringify(tankEnemy)));

    console.log('Loaded level Combat I');
};

function levelCombatIII() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 0;

    // place obstacles
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -3200});
    placeObstacle(basicWall, 0, {x: 0, y: -3600});
    placeObstacle(basicWall, 0, {x: 1000, y: -3600});
    placeObstacle(basicWall, 0, {x: -1000, y: -3600});
    placeObstacle(basicWall, 0, {x: 2000, y: -3600});
    placeObstacle(basicWall, 0, {x: -2000, y: -3600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -2700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -3600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'PlasmaMachineGun', 'mech', 'rightArmMain');
    player = addWeapon(player, 'PlasmaMachineGun', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'PlasmaMachineGun', 'mech', 'leftArmMain');
    player = addWeapon(player, 'PlasmaMachineGun', 'mech', 'leftArmSide');
    player = addWeapon(player, 'ShieldProjector', 'mech', 'back');
    entities.push(player);

    // create enemy tank
    let tankEnemy = Object.assign({}, JSON.parse(JSON.stringify(data.tank)), JSON.parse(JSON.stringify(data.template.memory)));
    tankEnemy.team = 'Enemy';
    tankEnemy.script = 'tankAI';
    tankEnemy = addWeapon(tankEnemy, 'TrippleCannon', 'tank', 'main');
    tankEnemy.r = Math.PI;
    tankEnemy.mouseR = Math.PI/2;
    tankEnemy.x = 0;
    tankEnemy.y = -2500;
    entities.push(JSON.parse(JSON.stringify(tankEnemy)));

    console.log('Loaded level Combat III');
};

function levelCombatII() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 0;

    // place obstacles
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -3200});
    placeObstacle(basicWall, 0, {x: 0, y: -3600});
    placeObstacle(basicWall, 0, {x: 1000, y: -3600});
    placeObstacle(basicWall, 0, {x: -1000, y: -3600});
    placeObstacle(basicWall, 0, {x: 2000, y: -3600});
    placeObstacle(basicWall, 0, {x: -2000, y: -3600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -2700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -3600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'Shield', 'mech', 'rightArmMain');
    player = addWeapon(player, 'none', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'Railgun', 'mech', 'leftArmMain');
    player = addWeapon(player, 'none', 'mech', 'leftArmSide');
    player = addWeapon(player, 'none', 'mech', 'back');
    entities.push(player);

    // create enemy tank
    let tankEnemy = Object.assign({}, JSON.parse(JSON.stringify(data.tank)), JSON.parse(JSON.stringify(data.template.memory)));
    tankEnemy.team = 'Enemy';
    tankEnemy.script = 'tankAI';
    tankEnemy = addWeapon(tankEnemy, 'HeavyMachineGun', 'tank', 'main');
    tankEnemy.x = -2000;
    tankEnemy.y = 0;
    entities.push(JSON.parse(JSON.stringify(tankEnemy)));

    console.log('Loaded level Combat II');
};

function levelCombatIV() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 0;

    // place obstacles
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -3200});
    placeObstacle(basicWall, 0, {x: 0, y: -3600});
    placeObstacle(basicWall, 0, {x: 1000, y: -3600});
    placeObstacle(basicWall, 0, {x: -1000, y: -3600});
    placeObstacle(basicWall, 0, {x: 2000, y: -3600});
    placeObstacle(basicWall, 0, {x: -2000, y: -3600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -2700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -3600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'rightArmMain');
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'leftArmMain');
    player = addWeapon(player, 'Cannon', 'mech', 'rightArmSide');
    player = addWeapon(player, 'Cannon', 'mech', 'leftArmSide');
    player = addWeapon(player, 'ShieldProjector', 'mech', 'back');
    entities.push(player);

    // create enemy tank
    let tankEnemy = Object.assign({}, JSON.parse(JSON.stringify(data.tank)), JSON.parse(JSON.stringify(data.template.memory)));
    tankEnemy.team = 'Enemy';
    tankEnemy.script = 'tankAI';
    tankEnemy = addWeapon(tankEnemy, 'MainCannon', 'tank', 'main');
    tankEnemy.x = 0;
    tankEnemy.y = -3000;
    entities.push(JSON.parse(JSON.stringify(tankEnemy)));

    console.log('Loaded level Combat IV');
};

function levelCombatV() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = randint(-2200, 2200);
    checkpoint.y = randint(-10300, 1000);

    // place obstacles
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -3200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -4200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -4200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -5200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -5200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -6200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -6200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -7200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -7200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -8200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -8200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -9200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -9200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -10200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -10200});
    placeObstacle(basicWall, 0, {x: 0, y: -10600});
    placeObstacle(basicWall, 0, {x: 1000, y: -10600});
    placeObstacle(basicWall, 0, {x: -1000, y: -10600});
    placeObstacle(basicWall, 0, {x: 2000, y: -10600});
    placeObstacle(basicWall, 0, {x: -2000, y: -10600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -2700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -3700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -3700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -4700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -4700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -5700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -5700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -6700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -6700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -7700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -7700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -8700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -8700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -8700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -8700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -9700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -9700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -10600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -10600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -10600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -10600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // Create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'Shield', 'mech', 'leftArmSide');
    player = addWeapon(player, 'DualRPG', 'mech', 'back');
    entities.push(player);

    // Create enemy tanks
    let enemy1 = Object.assign({}, JSON.parse(JSON.stringify(data.tank)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy1.team = 'Enemy';
    enemy1.script = 'tankAI';
    enemy1 = addWeapon(enemy1, 'DualCannon', 'tank', 'main');
    enemy1.y = -5000;
    enemy1.x = -1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = 1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.y = -6250;
    enemy1.x = 0;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.y = -7000;
    enemy1.x = -1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = 1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = -1500;
    enemy1.y = -3500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = 1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.y = -4250;
    enemy1.x = 0;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.y = -8250;
    enemy1.x = 0;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.y = -9000;
    enemy1.x = -1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = 1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = 0;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    console.log('Loaded level Combat V');
};

/*
function level5(pos={x: 0, y: 0}, scale=1) {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.y = 0;

    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 0, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 1000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: -1000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 2000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: -2000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -2200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -2200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -3200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -3200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -4200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -4200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -5200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -5200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -6200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -6200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -7200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -7200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -8200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -8200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -9200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -9200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -10200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -10200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 0, y: -10600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 1000, y: -10600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: -1000, y: -10600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 2000, y: -10600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: -2000, y: -10600}, pos, '+'), scale, '*'));

    placeObstacle(basicFiller, 0, vMath(vMath({x: 500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: -500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: 1500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: -1500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -1700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -1700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -2700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -2700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -3700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -3700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -4700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -4700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -5700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -5700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -6700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -6700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -7700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -7700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -8700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -8700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -8700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -8700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -9700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -9700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: 500, y: -10600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: -500, y: -10600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: 1500, y: -10600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: -1500, y: -10600}, pos, '+'), scale, '*'));

    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'Shield', 'mech', 'leftArmSide');
    player = addWeapon(player, 'DualRPG', 'mech', 'back');
    entities.push(player);
    let enemy1 = Object.assign({}, JSON.parse(JSON.stringify(data.tank)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy1.team = 'Enemy';
    enemy1.script = 'tankAI';
    enemy1 = addWeapon(enemy1, 'DualCannon', 'tank', 'main');
    enemy1.y = -5000;
    enemy1.x = -1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = 1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.y = -6250;
    enemy1.x = 0;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.y = -7000;
    enemy1.x = -1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = 1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = -1500;
    enemy1.y = -3500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = 1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.y = -4250;
    enemy1.x = 0;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.y = -8250;
    enemy1.x = 0;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.y = -9000;
    enemy1.x = -1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = 1500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = 0;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    console.log('Loaded level 5');
};*/

/*
function level6(pos={x: 0, y: 0}, scale=1) {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.y = 0;

    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 0, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 1000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: -1000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 2000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: -2000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -2200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -2200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -3200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -3200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 0, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 1000, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: -1000, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 2000, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: -2000, y: -3600}, pos, '+'), scale, '*'));

    placeObstacle(basicFiller, 0, vMath(vMath({x: 500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: -500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: 1500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: -1500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -1700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -1700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -2700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -2700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: 500, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: -500, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: 1500, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: -1500, y: -3600}, pos, '+'), scale, '*'));

    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'rightArmMain');
    player = addWeapon(player, 'MediumMachineGun', 'mech', 'leftArmMain');
    player = addWeapon(player, 'Cannon', 'mech', 'rightArmSide');
    player = addWeapon(player, 'Cannon', 'mech', 'leftArmSide');
    entities.push(player);
    let enemy1 = Object.assign({}, JSON.parse(JSON.stringify(data.tank)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy1.team = 'Enemy';
    enemy1.script = 'tankAI';
    enemy1 = addWeapon(enemy1, 'MainCannon', 'tank', 'main');
    enemy1.x = 0;
    enemy1.y = -3500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    console.log('Loaded level 6');
};*/

function levelCombatVI() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 0;

    // place obstacles
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -3200});
    placeObstacle(basicWall, 0, {x: 0, y: -3600});
    placeObstacle(basicWall, 0, {x: 1000, y: -3600});
    placeObstacle(basicWall, 0, {x: -1000, y: -3600});
    placeObstacle(basicWall, 0, {x: 2000, y: -3600});
    placeObstacle(basicWall, 0, {x: -2000, y: -3600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -2700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -3600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // Create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'RPG', 'mech', 'rightArmMain');
    player = addWeapon(player, 'Shield', 'mech', 'rightArmSide');
    player = addWeapon(player, 'ShieldProjector', 'mech', 'back');
    player.y = -1200;
    entities.push(player);

    let enemy2 = Object.assign({}, JSON.parse(JSON.stringify(data.turret)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy2.team = 'Enemy';
    enemy2.script = 'turretAI';
    enemy2 = addWeapon(enemy2, 'PlasmaMachineGun', 'staticTurret', 'mainGun');
    enemy2.x = -1600;
    enemy2.y = -2800;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = 1600;
    enemy2.y = -2800;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = 1600;
    enemy2.y = 400;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = -1600;
    enemy2.y = 400;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    console.log('Loaded level Combat VI');
};

function levelCombatVII() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 0;

    // place obstacles
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 3000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -3000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 4000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -4000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: -3200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: -4200});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: -4200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: -5200});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: -5200});
    placeObstacle(basicWall, 0, {x: 0, y: -5600});
    placeObstacle(basicWall, 0, {x: 1000, y: -5600});
    placeObstacle(basicWall, 0, {x: -1000, y: -5600});
    placeObstacle(basicWall, 0, {x: 2000, y: -5600});
    placeObstacle(basicWall, 0, {x: -2000, y: -5600});
    placeObstacle(basicWall, 0, {x: 3000, y: -5600});
    placeObstacle(basicWall, 0, {x: -3000, y: -5600});
    placeObstacle(basicWall, 0, {x: 4000, y: -5600});
    placeObstacle(basicWall, 0, {x: -4000, y: -5600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 2500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -2500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 3500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -3500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 4400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -4400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 4400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -4400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 4400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -4400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 4400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -4400, y: -2700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 4400, y: -3700});
    placeObstacle(basicFiller, Math.PI/2, {x: -4400, y: -3700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 4400, y: -4700});
    placeObstacle(basicFiller, Math.PI/2, {x: -4400, y: -4700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: 2500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: -2500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: 3500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: -3500, y: -5600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // Create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player.v *= 3;
    player = addWeapon(player, 'Sniper', 'mech', 'rightArmMain');
    player = addWeapon(player, 'Engine', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'Sniper', 'mech', 'leftArmMain');
    player = addWeapon(player, 'Engine', 'mech', 'leftArmSide');
    player = addWeapon(player, 'Exhausts', 'mech', 'back');
    entities.push(player);

    let enemy1 = Object.assign({}, JSON.parse(JSON.stringify(data.tank)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy1.team = 'Enemy';
    enemy1.script = 'tankAI';
    enemy1 = addWeapon(enemy1, 'Railgun', 'tank', 'main');
    enemy1 = addWeapon(enemy1, 'Engine', 'tank', 'leftSide');
    enemy1 = addWeapon(enemy1, 'Engine', 'tank', 'rightSide');
    enemy1.v *= 2;
    enemy1.vr *= 2;
    enemy1.y = -3000;
    enemy1.x = -2500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.x = 2500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    enemy1.y = -4500;
    enemy1.x = 0;
    entities.push(JSON.parse(JSON.stringify(enemy1)));

    console.log('Loaded level Combat VII');
};

function level8(pos={x: 0, y: 0}, scale=1) {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.y = 0;

    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 0, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 1000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: -1000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 2000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: -2000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -2200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -2200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -3200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -3200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 0, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 1000, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: -1000, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 2000, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: -2000, y: -3600}, pos, '+'), scale, '*'));

    placeObstacle(basicFiller, 0, vMath(vMath({x: 500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: -500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: 1500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: -1500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -1700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -1700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -2700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -2700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: 500, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: -500, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: 1500, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: -1500, y: -3600}, pos, '+'), scale, '*'));

    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'HeavyMachineGun', 'mech', 'rightArmMain');
    player = addWeapon(player, 'Cannon', 'mech', 'leftArmMain');
    player = addWeapon(player, 'Shield', 'mech', 'rightArmSide');
    player = addWeapon(player, 'Cannon', 'mech', 'leftArmSide');
    entities.push(player);
    let enemy1 = Object.assign({}, JSON.parse(JSON.stringify(data.tank)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy1.team = 'Enemy';
    enemy1.script = 'tankAI';
    enemy1 = addWeapon(enemy1, 'MainCannon', 'tank', 'main');
    enemy1.x = 0;
    enemy1.y = -3500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    let enemy2 = Object.assign({}, JSON.parse(JSON.stringify(data.turret)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy2.team = 'Enemy';
    enemy2.script = 'turretAI';
    enemy2 = addWeapon(enemy2, 'DualCannon', 'staticTurret', 'mainGun');
    enemy2.x = -2000;
    enemy2.y = -2500;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2 = addWeapon(enemy2, 'HeavyMachineGun', 'staticTurret', 'mainGun');
    enemy2.x = 2000;
    enemy2.y = -2500;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    console.log('Loaded level 8');
};
/*
function level7(pos={x: 0, y: 0}, scale=1) {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.y = 0;

    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 0, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 1000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: -1000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 2000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: -2000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -2200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -2200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -3200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -3200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 0, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 1000, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: -1000, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 2000, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: -2000, y: -3600}, pos, '+'), scale, '*'));

    placeObstacle(basicFiller, 0, vMath(vMath({x: 500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: -500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: 1500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: -1500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -1700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -1700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -2700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -2700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: 500, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: -500, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: 1500, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: -1500, y: -3600}, pos, '+'), scale, '*'));

    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'RPG', 'mech', 'rightArmMain');
    player = addWeapon(player, 'Shield', 'mech', 'rightArmSide');
    entities.push(player);
    let enemy2 = Object.assign({}, JSON.parse(JSON.stringify(data.turret)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy2.team = 'Enemy';
    enemy2.script = 'turretAI';
    enemy2 = addWeapon(enemy2, 'PlasmaMachineGun', 'staticTurret', 'mainGun');
    enemy2.x = -2000;
    enemy2.y = -3500;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = 2000;
    enemy2.y = -3500;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = 2000;
    enemy2.y = -500;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = -2000;
    enemy2.y = -500;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    console.log('Loaded level 7');
};*/

function levelMeleeI() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 0;

    // place obstacles
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -3200});
    placeObstacle(basicWall, 0, {x: 0, y: -3600});
    placeObstacle(basicWall, 0, {x: 1000, y: -3600});
    placeObstacle(basicWall, 0, {x: -1000, y: -3600});
    placeObstacle(basicWall, 0, {x: 2000, y: -3600});
    placeObstacle(basicWall, 0, {x: -2000, y: -3600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -2700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -3600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // Create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'Shield', 'mech', 'rightArmMain');
    player = addWeapon(player, 'EnergySword', 'mech', 'leftArmMain');
    player = addWeapon(player, 'Cannon', 'mech', 'leftArmSide');
    player = addWeapon(player, 'Exhausts', 'mech', 'back');
    player.v *= 1.5;
    entities.push(player);

    let enemy1 = Object.assign({}, JSON.parse(JSON.stringify(data.tank)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy1.team = 'Enemy';
    enemy1.script = 'tankAI';
    enemy1 = addWeapon(enemy1, 'MainCannon', 'tank', 'main');
    enemy1.x = 0;
    enemy1.y = -2800;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    let enemy2 = Object.assign({}, JSON.parse(JSON.stringify(data.turret)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy2.team = 'Enemy';
    enemy2.script = 'turretAI';
    enemy2 = addWeapon(enemy2, 'DualCannon', 'staticTurret', 'mainGun');
    enemy2.x = -2000;
    enemy2.y = -1600;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = 2000;
    enemy2.y = -1600;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    console.log('Loaded level Melee I');
};

function levelMeleeII() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 400;

    // place obstacles
    placeObstacle('level2Lake', 0, {x: 300, y: -200});
    placeObstacle('level2Lake', 0, {x: -300, y: -200});
    placeObstacle('level2Lake', 0, {x: 2000, y: -1200});
    placeObstacle('level2Lake', 0, {x: -2000, y: -1200});
    placeObstacle('level2Lake', 0, {x: 1400, y: -1200});
    placeObstacle('level2Lake', 0, {x: -1400, y: -1200});
    placeObstacle('level2Lake', Math.PI/2, {x: 1000, y: -1400});
    placeObstacle('level2Lake', Math.PI/2, {x: -1000, y: -1400});
    placeObstacle('level2Lake', Math.PI/2, {x: -1000, y: -2400});
    placeObstacle('level2Lake', 0, {x: -1400, y: -2600});
    placeObstacle('level2Lake', 0, {x: -2000, y: -2600});
    placeObstacle('level2Lake', Math.PI/2, {x: 1000, y: -2000});
    placeObstacle('level2Lake', Math.PI/2, {x: 1000, y: -2600});

    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -3200});
    placeObstacle(basicWall, 0, {x: 0, y: -3600});
    placeObstacle(basicWall, 0, {x: 1000, y: -3600});
    placeObstacle(basicWall, 0, {x: -1000, y: -3600});
    placeObstacle(basicWall, 0, {x: 2000, y: -3600});
    placeObstacle(basicWall, 0, {x: -2000, y: -3600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -2700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -3600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // Create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player.y = 400;
    player = addWeapon(player, 'Shield', 'mech', 'rightArmMain');
    player = addWeapon(player, 'EnergySword', 'mech', 'leftArmMain');
    player = addWeapon(player, 'Shield', 'mech', 'leftArmSide');
    player = addWeapon(player, 'Exhausts', 'mech', 'back');
    player.v *= 1.5;
    entities.push(player);

    // create 2 enemy turrets
    let enemy2 = Object.assign({}, JSON.parse(JSON.stringify(data.turret)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy2.team = 'Enemy';
    enemy2.script = 'turretAI';
    enemy2 = addWeapon(enemy2, 'DualCannon', 'staticTurret', 'mainGun');
    enemy2.x = 0;
    enemy2.y = -800;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = -2000;
    enemy2.y = -1600;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = 2000;
    enemy2.y = -1600;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    console.log('Loaded level Melee II');
};

function levelMeleeIII() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = 400;

    // place obstacles
    placeObstacle('level2Lake', 0, {x: 300, y: -200});
    placeObstacle('level2Lake', 0, {x: -300, y: -200});

    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -2400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 2400, y: -3200});
    placeObstacle(basicWall, 0, {x: 0, y: -3600});
    placeObstacle(basicWall, 0, {x: 1000, y: -3600});
    placeObstacle(basicWall, 0, {x: -1000, y: -3600});
    placeObstacle(basicWall, 0, {x: 2000, y: -3600});
    placeObstacle(basicWall, 0, {x: -2000, y: -3600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 2400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -2400, y: -2700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -3600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -3600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // Create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player.y = 400;
    player = addWeapon(player, 'none', 'mech', 'rightArmMain');
    player = addWeapon(player, 'EnergySword', 'mech', 'leftArmMain');
    player = addWeapon(player, 'none', 'mech', 'leftArmSide');
    player = addWeapon(player, 'LargeShieldProjector', 'mech', 'back');
    player.v *= 1.5;
    entities.push(player);

    // create 2 enemy turrets
    let enemy2 = Object.assign({}, JSON.parse(JSON.stringify(data.turret)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy2.team = 'Enemy';
    enemy2.script = 'turretAI';
    enemy2.x = -2000;
    enemy2.y = 100;
    enemy2 = addWeapon(enemy2, 'TrippleCannon', 'staticTurret', 'mainGun');
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = 2000;
    enemy2.y = 100;
    enemy2 = addWeapon(enemy2, 'TrippleCannon', 'staticTurret', 'mainGun');
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = 0;
    enemy2.y = -800;
    enemy2 = addWeapon(enemy2, 'Railgun', 'staticTurret', 'mainGun');
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = -2000;
    enemy2.y = -1600;
    enemy2 = addWeapon(enemy2, 'TrippleCannon', 'staticTurret', 'mainGun');
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = 2000;
    enemy2.y = -1600;
    enemy2 = addWeapon(enemy2, 'TrippleCannon', 'staticTurret', 'mainGun');
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    console.log('Loaded level Melee III');
};

/*
function level9(pos={x: 0, y: 0}, scale=1) {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.y = 0;

    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 0, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 1000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: -1000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: 2000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI, vMath(vMath({x: -2000, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: 800}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -1200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -2200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -2200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 3*Math.PI/2, vMath(vMath({x: -2400, y: -3200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, Math.PI/2, vMath(vMath({x: 2400, y: -3200}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 0, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 1000, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: -1000, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: 2000, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicWall, 0, vMath(vMath({x: -2000, y: -3600}, pos, '+'), scale, '*'));

    placeObstacle(basicFiller, 0, vMath(vMath({x: 500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: -500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: 1500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 0, vMath(vMath({x: -1500, y: 1200}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: 300}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -1700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -1700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, 3*Math.PI/2, vMath(vMath({x: 2400, y: -2700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI/2, vMath(vMath({x: -2400, y: -2700}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: 500, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: -500, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: 1500, y: -3600}, pos, '+'), scale, '*'));
    placeObstacle(basicFiller, Math.PI, vMath(vMath({x: -1500, y: -3600}, pos, '+'), scale, '*'));

    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player = addWeapon(player, 'Shield', 'mech', 'rightArmMain');
    player = addWeapon(player, 'EnergySword', 'mech', 'leftArmMain');
    player = addWeapon(player, 'Cannon', 'mech', 'leftArmSide');
    entities.push(player);
    let enemy1 = Object.assign({}, JSON.parse(JSON.stringify(data.tank)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy1.team = 'Enemy';
    enemy1.script = 'tankAI';
    enemy1 = addWeapon(enemy1, 'MainCannon', 'tank', 'main');
    enemy1.x = 0;
    enemy1.y = -3500;
    entities.push(JSON.parse(JSON.stringify(enemy1)));
    let enemy2 = Object.assign({}, JSON.parse(JSON.stringify(data.turret)), JSON.parse(JSON.stringify(data.template.memory)));
    enemy2.team = 'Enemy';
    enemy2.script = 'turretAI';
    enemy2 = addWeapon(enemy2, 'DualCannon', 'staticTurret', 'mainGun');
    enemy2.x = -2000;
    enemy2.y = -2500;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    enemy2.x = 2000;
    enemy2.y = -2500;
    entities.push(JSON.parse(JSON.stringify(enemy2)));
    console.log('Loaded level 9');
};*/

function level0() {
    overlay.style.display = 'none';
    const basicWall = 'basicWall';
    const basicFiller = 'basicFiller';

    // clear arrays and move checkpoint
    obstacles = [];
    projectiles = [];
    explosions = [];
    particles = [];
    entities = [];
    shields = [];
    teams = [];    
    checkpoint = JSON.parse(JSON.stringify(data.checkpoint));
    checkpoint.x = 0;
    checkpoint.y = -2000;

    // place obstacles
    placeObstacle(basicWall, Math.PI, {x: 0, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -1000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -2000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 3000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -3000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: 4000, y: 1200});
    placeObstacle(basicWall, Math.PI, {x: -4000, y: 1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: 800});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: 800});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: -200});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: -200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: -1200});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: -1200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: -2200});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: -2200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: -3200});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: -3200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: -4200});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: -4200});
    placeObstacle(basicWall, 3*Math.PI/2, {x: -4400, y: -5200});
    placeObstacle(basicWall, Math.PI/2, {x: 4400, y: -5200});
    placeObstacle(basicWall, 0, {x: 0, y: -5600});
    placeObstacle(basicWall, 0, {x: 1000, y: -5600});
    placeObstacle(basicWall, 0, {x: -1000, y: -5600});
    placeObstacle(basicWall, 0, {x: 2000, y: -5600});
    placeObstacle(basicWall, 0, {x: -2000, y: -5600});
    placeObstacle(basicWall, 0, {x: 3000, y: -5600});
    placeObstacle(basicWall, 0, {x: -3000, y: -5600});
    placeObstacle(basicWall, 0, {x: 4000, y: -5600});
    placeObstacle(basicWall, 0, {x: -4000, y: -5600});

    placeObstacle(basicFiller, 0, {x: 500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -1500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 2500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -2500, y: 1200});
    placeObstacle(basicFiller, 0, {x: 3500, y: 1200});
    placeObstacle(basicFiller, 0, {x: -3500, y: 1200});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 4400, y: 300});
    placeObstacle(basicFiller, Math.PI/2, {x: -4400, y: 300});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 4400, y: -700});
    placeObstacle(basicFiller, Math.PI/2, {x: -4400, y: -700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 4400, y: -1700});
    placeObstacle(basicFiller, Math.PI/2, {x: -4400, y: -1700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 4400, y: -2700});
    placeObstacle(basicFiller, Math.PI/2, {x: -4400, y: -2700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 4400, y: -3700});
    placeObstacle(basicFiller, Math.PI/2, {x: -4400, y: -3700});
    placeObstacle(basicFiller, 3*Math.PI/2, {x: 4400, y: -4700});
    placeObstacle(basicFiller, Math.PI/2, {x: -4400, y: -4700});
    placeObstacle(basicFiller, Math.PI, {x: 500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: -500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: 1500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: -1500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: 2500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: -2500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: 3500, y: -5600});
    placeObstacle(basicFiller, Math.PI, {x: -3500, y: -5600});

    // Create teams
    let playerForce = JSON.parse(JSON.stringify(data.template.team));
    playerForce.id = 'Player';
    teams.push(playerForce);

    let enemyForce = JSON.parse(JSON.stringify(data.template.team));
    enemyForce.id = 'Enemy';
    enemyForce.scripts.noAI = data.scripts.noAI;
    enemyForce.scripts.turretAI = data.scripts.turretAI;
    enemyForce.scripts.tankAI = data.scripts.tankAI;
    teams.push(enemyForce);

    // Create player
    player = Object.assign({}, JSON.parse(JSON.stringify(data.mech)), JSON.parse(JSON.stringify(data.template.memory)));
    player.directControl = true;
    player.team = 'Player';
    player.script = 'script1';
    player.v *= 3;
    player = addWeapon(player, 'Sniper', 'mech', 'rightArmMain');
    player = addWeapon(player, 'Engine', 'mech', 'rightArmSide');
    player = addWeapon(player, 'none', 'mech', 'headTurret');
    player = addWeapon(player, 'Cannon', 'mech', 'leftArmMain');
    player = addWeapon(player, 'Engine', 'mech', 'leftArmSide');
    player = addWeapon(player, 'ShieldProjector', 'mech', 'back');
    entities.push(player);

    console.log('Loaded testing area');
};

function spawnUnit(team, unitType, unitName, script) {
    let unit = Object.assign({}, JSON.parse(JSON.stringify(data[unitType])), JSON.parse(JSON.stringify(data.memory)));
    unit.team = team.id;
    unit.id = unitName;
    unit.x = team.spawn.x;
    unit.y = team.spawn.y;
    unit.script = script;
};

function recursiveAddParts(unit, parts, weapon) {
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].id == weapon.id) {
            parts[i] = weapon;
        }
        parts[i].connected = recursiveAddParts(unit, parts[i].connected, weapon);
    }
    return parts;
};

function recursiveOffset(parts, offset) {
    for (let i = 0; i < parts.length; i++) {
        parts[i].offset = vMath(parts[i].offset, offset, '+');
        parts[i].connected = recursiveOffset(parts[i].connected, offset);
    }
    return parts;
};

function recursiveInvert(parts) {
    for (let i = 0; i < parts.length; i++) {
        parts[i].offset.x *= -1
        parts[i].rOffset *= -1;
        if (parts[i].type == 'polygon') {
            for (let j = 0; j < parts[i].size.length; j++) {
                parts[i].size[j].x *= -1;
            }
        }
        parts[i].connected = recursiveInvert(parts[i].connected);
    }
    return parts;
};

function recursiveModify(parts, facing=undefined, keybind=undefined) {
    for (let i = 0; i < parts.length; i++) {
        if (facing) {
            parts[i].facing = facing;
        }
        if (keybind) {
            if (parts[i].cannon) {
                parts[i].cannon.keybind = keybind;
            }
        }
        parts[i].connected = recursiveModify(parts[i].connected);
    }
    return parts;
};

function addWeapon(unit, weaponID, unitType, slot, keybind='click') {
    let weapon = JSON.parse(JSON.stringify(data.template.weapons[weaponID]));
    let offset = {x: 0, y: 0};
    let invert = false;
    let facing = 'turret';
    switch (unitType) {
        case 'mech':
            switch (slot) {
                case 'rightArmMain':
                    invert = true;
                case 'leftArmMain':
                    if (weaponID == 'RPG') {
                        offset = vMath(offset, {x: -40, y: 0}, '+');
                    }
                    offset = vMath(offset, {x: -100, y: 0}, '+');
                    break;
                case 'rightArmSide':
                    invert = true;
                case 'leftArmSide':
                    //console.log(weaponID+'SideMounted');
                    //console.log(data.template.weapons[weaponID+'SideMounted']);
                    weapon = JSON.parse(JSON.stringify(data.template.weapons[weaponID+'SideMounted']));
                    offset = vMath(offset, {x: -150, y: 0}, '+');
                    break;
                case 'headTurret':
                    break;
                case 'back':
                    offset = vMath(offset, {x: 0, y: 20}, '+');
                    break;
                default:
                    throw `tf is this slot type! ${slot}`;
            }
            break;
        case 'tank':
            switch (slot) {
                case 'main':
                    offset = vMath(offset, {x: 0, y: 0}, '+');
                    if (weaponID.includes('Cannon')) {
                        offset = vMath(offset, {x: 0, y: -70}, '+');
                    }
                    if (weaponID == 'RPG') {
                        offset = {x: -40, y: -150};
                    }
                    break;
                case 'rightSide':
                    invert = true;
                case 'leftSide':
                    weapon = JSON.parse(JSON.stringify(data.template.weapons[weaponID+'SideMounted']));
                    offset = vMath(offset, {x: -140, y: -0}, '+');
                    facing = 'body';
                    break;
                default:
                    throw `tf is this slot type! ${slot}`;
            }
            break;
        case 'staticTurret':
            switch (slot) {
                case 'mainGun':
                    offset = vMath(offset, {x: 0, y: -30}, '+');
                    if (weaponID.includes('Cannon')) {
                        offset = vMath(offset, {x: 0, y: -70}, '+');
                    }
                    if (weaponID == 'RPG') {
                        offset = {x: -40, y: -180};
                    }
                    break;
                default:
                    throw `tf is this slot type! ${slot[0]}`;
            }
            break;
        default:
            throw `ERROR: Unsupported unit type for weapon assignment: ${unitType}!`;
    }
    weapon.facing = facing;
    weapon.keybind = keybind;
    weapon.connected = recursiveModify(weapon.connected, facing, keybind);
    weapon.offset = vMath(weapon.offset, offset, '+');
    weapon.connected = recursiveOffset(weapon.connected, offset);
    weapon.id = slot;
    if (invert) {
        weapon.offset.x *= -1
        if (weapon.type == 'polygon') {
            for (let i = 0; i < weapon.size.length; i++) {
                weapon.size[i].x *= -1;
            }
        }
        weapon.rOffset *= -1;
        weapon.connected = recursiveInvert(weapon.connected);
    }
    unit.parts = recursiveAddParts(unit, unit.parts, weapon);
    //console.log(unit);
    return unit;
};

function handlePlayerMotion(unit, obstacles) {
    //console.log(unit.keyboard);
    if (unit.directControl) {
        unit.aimPos = vMath(vMath(mousepos, unit, '+'), vMath(display, 0.5, '*'), '-');
    }
    if (unit.keyboard.aimPos) {
        unit.aimPos = unit.keyboard.aimPos;
        unit.keyboard.aimPos = undefined;
    }
    unit.mouseR = rotateAngle(unit.mouseR, aim(unit, unit.aimPos), unit.tr);
    unit.lastMoved += 1;
    unit.r = correctAngle(unit.r);
    unit.mouseR = correctAngle(unit.mouseR);
    switch (unit.type) {
        case 'mech':
            unit.vx = 0;
            unit.vy = 0;
            let mechSpeed = unit.v;
            if (unit.keyboard.capslock) {
                mechSpeed *= 1.2;
            }
            if (unit.keyboard.shift) {
                mechSpeed *= 1.2;
            }
            let mechIsMoving = false;
            let mechVector = {x: 0, y: 0}; // special maths
            if (unit.keyboard.w || unit.keyboard.arrowup) { 
                mechVector.y -= 1
                mechIsMoving = true;
            }
            if (unit.keyboard.s || unit.keyboard.arrowdown) {
                mechVector.y += 1
                mechIsMoving = true;
            }
            if (unit.keyboard.a || unit.keyboard.arrowleft) { 
                mechVector.x -= 1
                mechIsMoving = true;
            }
            if (unit.keyboard.d || unit.keyboard.arrowright) { 
                mechVector.x += 1
                mechIsMoving = true;
            }
            //console.log('before', unit.r);
            if (mechIsMoving) {
                if (unit.lastMoved >= 20) {
                    unit.r = aim({x:0, y: 0}, mechVector);
                } else {
                    unit.r = rotateAngle(unit.r, aim({x:0, y: 0}, mechVector), unit.vr);
                }
                unit.r = correctAngle(unit.r);
                let mechVelocity = toComponent(mechSpeed, unit.r);
                unit.x += mechVelocity.x;
                unit.y += mechVelocity.y;
                unit.vx = mechVelocity.x;
                unit.vy = mechVelocity.y;
                unit.lastMoved = -1;
                /* // Old unrealistic collision (use if new version doesn't work)
                if (handleGroundCollisions(unit, obstacles)) {
                    unit.x -= mechVelocity.x;
                    unit.y -= mechVelocity.y;
                    unit.vx = 0;
                    unit.vy = 0;
                }*/
                let res = handleGroundCollisions(unit, obstacles, true, mechVelocity);
                if (res) {
                    unit.x -= mechVelocity.x;
                    unit.y -= mechVelocity.y;
                    if (res != 'well, shit') {
                        let mechWallVector = {x: res.end.x - res.start.x, y: res.end.y - res.start.y};
                        let mechSlideVector = vMath(vMath(mechVelocity, mechWallVector, 'projection'), 0.75, 'multiply');
                        unit.x += mechSlideVector.x;
                        unit.y += mechSlideVector.y;
                        unit.vx = mechSlideVector.x;
                        unit.vy = mechSlideVector.y;
                    }
                }
            }
            //console.log('after', unit.r);
            return unit;
        case 'tank':
            let tankTopSpeed = unit.v;
            unit.r = correctAngle(unit.r);
            if (unit.keyboard.capslock) {
                tankTopSpeed *= 2;
            }
            if (unit.keyboard.shift) {
                tankTopSpeed *= 1.5;
            }
            let tankSpeed = Math.sqrt(unit.vx**2+unit.vy**2);
            if (unit.reverse) {
                tankSpeed = -Math.abs(tankSpeed);
            }
            if (unit.keyboard.w || unit.keyboard.arrowup) { 
                tankSpeed += tankTopSpeed/10;
            }
            if (unit.keyboard.s || unit.keyboard.arrowdown) {
                tankSpeed -= tankTopSpeed/10;
            }
            if (unit.keyboard.a || unit.keyboard.arrowleft) { 
                unit.r = rotateAngle(unit.r, unit.r-unit.vr, unit.vr);
            }
            if (unit.keyboard.d || unit.keyboard.arrowright) { 
                unit.r = rotateAngle(unit.r, unit.r+unit.vr, unit.vr);
            }
            if (tankSpeed < 0) {
                unit.reverse = true;
            } else {
                unit.reverse = false;
            }
            tankSpeed = Math.abs(tankSpeed);
            if (tankSpeed > tankTopSpeed) {
                tankSpeed = Math.max(tankTopSpeed, tankSpeed-0.25*tankTopSpeed);
            }
            if (tankSpeed < -tankTopSpeed*0.75) {
                tankSpeed = Math.min(-tankTopSpeed*0.75, tankSpeed+0.25*tankTopSpeed);
            }
            let tankR = unit.r;
            if (unit.reverse) {
                tankR = correctAngle(unit.r+Math.PI);
            }
            let tankVelocity = toComponent(Math.abs(tankSpeed), tankR);
            unit.x += tankVelocity.x;
            unit.y += tankVelocity.y;
            unit.vx = tankVelocity.x;
            unit.vy = tankVelocity.y;
            let res = handleGroundCollisions(unit, obstacles, true, tankVelocity);
                if (res) {
                    unit.x -= tankVelocity.x;
                    unit.y -= tankVelocity.y;
                    if (res != 'well, shit') {
                        let tankWallVector = {x: res.end.x - res.start.x, y: res.end.y - res.start.y};
                        let tankSlideVector = vMath(vMath(tankVelocity, tankWallVector, 'projection'), 0.9, 'multiply');
                        unit.x += tankSlideVector.x;
                        unit.y += tankSlideVector.y;
                        unit.vx = tankSlideVector.x;
                        unit.vy = tankSlideVector.y;
                    }
                }
            return unit;
        case 'drone':
            let droneTopSpeed = unit.v;
            if (unit.keyboard.capslock) {
                droneTopSpeed *= 2;
            }
            if (unit.keyboard.shift) {
                droneTopSpeed *= 1.5;
            }
            unit.isMoving = false;
            if (unit.directControl) {
                let droneVector = {x: 0, y: 0}; // special maths
                if (unit.keyboard.w || unit.keyboard.arrowup) { 
                    droneVector.y -= 1
                    unit.isMoving = true;
                }
                if (unit.keyboard.s || unit.keyboard.arrowdown) {
                    droneVector.y += 1
                    unit.isMoving = true;
                }
                if (unit.keyboard.a || unit.keyboard.arrowleft) { 
                    droneVector.x -= 1
                    unit.isMoving = true;
                }
                if (unit.keyboard.d || unit.keyboard.arrowright) { 
                    droneVector.x += 1
                    unit.isMoving = true;
                }
                if (unit.isMoving) {
                    unit.r = aim({x:0, y: 0}, droneVector);
                }
            }
            if (unit.isMoving) {
                let droneAcceleration = toComponent(droneTopSpeed/60, unit.r);
                unit.vx += droneAcceleration.x;
                unit.vy += droneAcceleration.y;
                let droneVelocity = Math.sqrt(unit.vx**2+unit.vy**2);
                if (droneVelocity > unit.v) {
                    let reduction = unit.v / droneVelocity;
                    unit.vx *= reduction;
                    unit.vy *= reduction;
                }
            }
            unit.x += unit.vx;
            unit.y += unit.vy;
            if (handleGroundCollisions(unit, obstacles)) {
                unit.x -= unit.vx;
                unit.y -= unit.vy;
                unit.vx = 0;
                unit.vy = 0;
            }
            unit.vx *= 0.995;
            unit.vy *= 0.995;
            return unit;
        case 'staticTurret':
            if (unit.keyboard.w || unit.keyboard.arrowup) { 
                unit.y -= unit.v;
                unit.vy = -unit.v;
            }
            if (unit.keyboard.s || unit.keyboard.arrowdown) {
                unit.y += unit.v;
                unit.vy = unit.v;
            }
            if (unit.keyboard.a || unit.keyboard.arrowleft) { 
                unit.x -= unit.v;
                unit.vx = -unit.v;
            }
            if (unit.keyboard.d || unit.keyboard.arrowright) { 
                unit.x += unit.v;
                unit.vx = unit.v;
            }
            return unit;
        default:
            throw 'ERROR: are you f**king retarded? Tf is that unit type?';

    };
};

function polygonCollision(polygon1, polygon2) {
    for (let i = 0; i < polygon1.length; i++) {
        if (pointInPolygon(polygon1[i], polygon2)) {
            return true;
        }
    }
    for (let i = 0; i < polygon2.length; i++) {
        if (pointInPolygon(polygon2[i], polygon1)) {
            return true;
        }
    }
    return false;
};

function lineCollision(l1, l2) { // dis do be broken tho...
    let l1Data = {min: {x: Math.min(l1.start.x, l1.end.x), y: Math.min(l1.start.y, l1.end.y)}, max: {x: Math.max(l1.start.x, l1.end.x), y: Math.max(l1.start.y, l1.end.y)}};
    let l2Data = {min: {x: Math.min(l2.start.x, l1.end.x), y: Math.min(l2.start.y, l2.end.y)}, max: {x: Math.max(l2.start.x, l2.end.x), y: Math.max(l2.start.y, l2.end.y)}};
    if (l1Data.max.x >= l2Data.min.x || l2Data.max.x >= l1Data.min.x) {
        console.log('pass1');
        if (l1Data.max.y >= l2Data.min.y || l2Data.max.y >= l1Data.min.y) {
            console.log('pass2');
            if (Math.round(l1.start.x*100) == Math.round(l1.end.x*100) || Math.round(l2.start.x*100) == Math.round(l2.end.x*100)) { // vertical lines
                console.log('vertical lines recognised');
                if (Math.round(l1.start.x*100) == Math.round(l1.end.x*100) && Math.round(l2.start.x*100) == Math.round(l2.end.x*100)) {
                    console.log('both');
                    if (Math.round(l1.start.x*100) == Math.round(l2.start.x*100)) {
                        return true;
                    }
                    console.log('v parallel');
                    return false;
                }
                if (Math.round(l1.start.x*100) == Math.round(l1.end.x*100)) {
                    console.log('l1');
                    if (l2.end.x <= l1.end.x && l2.start.x >= l1.end.x) {
                        return true;
                    }
                    console.log('v no intersect');
                    return false;
                } else {
                    console.log('l2');
                    if (l1.end.x <= l2.end.x && l1.start.x >= l2.end.x) {
                        return true;
                    }
                    console.log('v no intersect');
                    return false;
                }
            }
            let l1Grad = (l1.start.y - l1.end.y) / (l1.start.x - l1.end.x);
            let l2Grad = (l2.start.y - l2.end.y) / (l2.start.x - l2.end.x);
            let l1Intercept = l1.end.y - l1Grad * l1.end.x;
            let l2Intercept = l2.end.y - l2Grad * l2.end.x;
            if (Math.round(l1Grad*100) == Math.round(l2Grad*100) && Math.round(l1Intercept*100) == Math.round(l2Intercept*100)) {
                console.log('parallel');
                return false;
            }
            let intersection = {x: (l2Intercept - l1Intercept) / (l1Grad - l2Grad), y: l1Grad * (l2Intercept - l1Intercept) / (l1Grad - l2Grad) + l1Intercept};
            console.log(intersection);
            if (
                ((l1.end.x <= intersection.x && l1.start.x >= intersection.x) || (l1.start.x <= intersection.x && l1.end.x >= intersection.x)) &&
                ((l2.end.x <= intersection.x && l2.start.x >= intersection.x) || (l2.start.x <= intersection.x && l2.end.x >= intersection.x)) &&
                ((l1.end.y <= intersection.y && l1.start.y >= intersection.y) || (l1.start.y <= intersection.y && l1.end.y >= intersection.y)) &&
                ((l2.end.y <= intersection.y && l2.start.y >= intersection.y) || (l2.start.y <= intersection.y && l2.end.x >= intersection.y))
            ) {
                return true;
            } else {
                console.log('no collision');
                return false;
            }
        }
    }
    console.log('ignore');
    return false;
};

function polygonCircleIntersect(polygon, circle, round=false, collisionEdges) {
    for (let i = 0; i < polygon.length; i++) {
        if (collisionEdges) {
            if (isin(i, collisionEdges) == false) {
                continue;
            }
        }
        let l1 = {start: polygon[i], end: i == polygon.length-1 ? polygon[0] : polygon[i+1]};
        if (round) {
            l1.start.x = Math.round(l1.start.x);
            l1.start.y = Math.round(l1.start.y);
            l1.end.x = Math.round(l1.end.x);
            l1.end.y = Math.round(l1.end.y);
            circle.x = Math.round(circle.x);
            circle.y = Math.round(circle.y);
        }
        if (lineCircleIntersectV2(l1, circle)) {
            return l1;
        }
    }
    return false;
};

function lineCircleIntersectV2(line, circle) { // HAIL OUR AI OVERLORDS
    //console.log(line, circle);
    // Calculate the direction vector of the line
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;

    // Calculate the vector from the circle's center to the line's start point
    const cx = circle.x - line.start.x;
    const cy = circle.y - line.start.y;

    // Calculate the dot product of the line direction vector and the circle-to-start vector
    const dotProduct = cx * dx + cy * dy;

    // Calculate the squared length of the line
    const lineLengthSq = dx * dx + dy * dy;

    // Calculate the closest point on the line to the circle's center
    let closestX, closestY;

    if (lineLengthSq === 0) {
        // If the line is just a point, set the closest point to be the line's start point
        closestX = line.start.x;
        closestY = line.start.y;
    } else {
        const t = Math.max(0, Math.min(1, dotProduct / lineLengthSq));
        closestX = line.start.x + t * dx;
        closestY = line.start.y + t * dy;
    }

    // Calculate the distance between the closest point and the circle's center
    const distance = Math.sqrt((closestX - circle.x) ** 2 + (closestY - circle.y) ** 2);

    // Check if the distance is less than or equal to the circle's radius
    return distance <= circle.r;
};

function polyCollisionAdv(polygon1, polygon2) { // dis also do be broken...
    for (let i = 0; i < polygon1.length; i++) {
        let l1 = {start: polygon1[i], end: i == polygon1.length-1 ? polygon1[0] : polygon1[i+1]};
        for (let j = 0; j < polygon2.length; j++) {
            let l2 = {start: polygon2[j], end: j == polygon2.length-1 ? polygon2[0] : polygon2[j+1]};
            if (lineCollision(l1, l2)) {
                return true;
            }
        }
    }
    return false;
};

function simulatePhysics(objects) {
    let newObjs = [];
    for (let i = 0; i < objects.length; i++) {
        let newObj = JSON.parse(JSON.stringify(objects[i]));
        newObj.vx += newObj.ax;
        newObj.vy += newObj.ay;
        newObj.vr += newObj.ar;
        newObj.vx *= newObj.vDrag;
        newObj.vy *= newObj.vDrag;
        newObj.vr *= newObj.rDrag;
        let velocity = Math.sqrt(Math.abs(newObj.vx**2) + Math.abs(newObj.vy**2));
        if (velocity > newObj.maxV) {
            let reduction = newObj.maxV / velocity;
            newObj.vx *= reduction;
            newObj.vy *= reduction;
        }
        newObj.vr = Math.min(newObj.vr, newObj.maxRV);
        newObj.x += newObj.vx;
        newObj.y += newObj.vy;
        newObj.r += newObj.vr;
        newObjs.push(newObj);
    }
    return newObjs;
};

function renderParticles(particles) {
    for (let i = 0; i < particles.length; i++) {
        let obj = particles[i];
        if (obj.type == 'circle') {
            drawCircle(obj.x, obj.y, obj.size, toColour(obj.style.fill), toColour(obj.style.stroke.colour), obj.style.stroke.width, 1, false);
        } else if (obj.type == 'polygon') {
            drawPolygon(obj.size, {x: obj.x, y: obj.y}, obj.r, toColour(obj.style.fill), {colour: toColour(obj.style.stroke.colour), width: obj.style.stroke.width}, false);
        } else {
            throw 'ERROR: unsupported particle type';
        }
    }
};

function recursiveParts(unit, parts, f) {
    for (let i = 0; i < parts.length; i++) {
        parts[i] = f(unit, parts[i]);
        parts[i].connected = recursiveParts(unit, parts[i].connected, f);
    }
    return parts;
};

function renderPart(unit, part) {
    if (part.type == 'polygon') {
        let np = offsetPoints(rotatePolygon(JSON.parse(JSON.stringify(part.size)), part.rOffset), part.offset);
        let facing = unit.r;
        if (part.facing == 'turret') {
            facing = unit.mouseR;
        }
        let stroke = JSON.parse(JSON.stringify(part.style.stroke));
        if (part.hp != part.maxHp) {
            if (part.hp > part.maxHp) {
                stroke.colour = 'rgba(0,255,255,1)';
            } else {
                // hp colours modeled by https://www.desmos.com/calculator/icqpr5wi1k
                //let change = Math.round(2950/(0.25*(1-part.hp/part.maxHp)*255+10)-40); 
                //let change = (255/Math.log(255)) * Math.log(-(1-part.hp/part.maxHp)*255+255);
                let change = -0.004 * ((1-part.hp/part.maxHp)*255)**2 + 255;
                //console.log(change);
                stroke.colour = `rgba(${255-change},${change},0,1)`;
                //let change = Math.round(255*(1-part.hp/part.maxHp));
                //stroke.colour = `rgba(${change},${255-change},0,1)`;
            }
        }
        drawPolygon(np, {x: unit.x, y: unit.y}, facing, part.style.fill, stroke, false);
        if (part.hp > part.maxHp) {
            stroke.width += 10;
            stroke.colour = 'rgba(0,255,255,0.3)';
            drawPolygon(np, {x: unit.x, y: unit.y}, facing, 'rgba(0,255,255,0.2)', stroke, false);
        }
    } else {
        let facing = unit.r;
        if (part.facing == 'turret') {
            facing = unit.mouseR;
        }
        let stroke = JSON.parse(JSON.stringify(part.style.stroke));
        if (part.hp != part.maxHp) {
            if (part.hp > part.maxHp) {
                stroke.colour = 'rgba(0,255,255,1)';
            } else {
                let change = -0.004 * ((1-part.hp/part.maxHp)*255)**2 + 255;
                stroke.colour = `rgba(${255-change},${change},0,1)`;
            }
        }
        let offset = rotatePolygon([part.offset], facing)[0];
        drawCircle(unit.x + offset.x, unit.y + offset.y, part.size, part.style.fill, stroke.colour, stroke.width, 1, false);
        if (part.hp > part.maxHp) {
            stroke.width += 10;
            stroke.colour = 'rgba(0,255,255,0.3)';
            drawCircle(unit.x + offset.x, unit.y + offset.y, part.size, 'rgba(0,255,255,0.3)', stroke.colour, stroke.width, 1, false);
        }
    }
    return part;
};

function renderUnit(unit) {
    unit.parts = recursiveParts(unit, unit.parts, renderPart);
    if (unit.collisionR > 0 && false) {
        drawCircle(display.x/2 - player.x + unit.x, display.y/2 - player.y + unit.y, unit.collisionR, 'rgba(255, 255, 255, 0.1)', 'rgba(255, 0, 0, 0.9)', 5, 1);
    }
    if (unit.groundCollisionR > 0) {
        drawCircle(unit.x, unit.y, unit.groundCollisionR, 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.1)', 5, 1, false);
    }
    if (unit.tallCollisionR > 0) {
        drawCircle(unit.x, unit.y, unit.tallCollisionR, 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.1)', 5, 1, false);
    }
    //drawLine(unit, aim(unit, unit.aimPos)-Math.PI/2, 1500, data.red.stroke, false);
};

function shoot(unit, part) {
    if (part.cannon) {
        if (part.cannon.reload.c > 0) {
            part.cannon.reload.c -= 1;
        } else {
            if (!part.cannon.delay || part.cannon.delay.c <= 0) {
                if (unit.keyboard[part.cannon.keybind]) {
                    part.cannon.reload.c = part.cannon.reload.t;
                    let facing = unit.r;
                    if (part.facing == 'turret') {
                        facing = unit.mouseR;
                    }
                    let bullet = Object.assign({}, JSON.parse(JSON.stringify(data.template.physics)), JSON.parse(JSON.stringify(part.cannon.bullet)));
                    bullet.x = unit.x + ((part.offset.x) * Math.cos(facing) - (part.offset.y) * Math.sin(facing));
                    bullet.y = unit.y + ((part.offset.x) * Math.sin(facing) + (part.offset.y) * Math.cos(facing));
                    bullet.x += (part.cannon.x * Math.cos(facing + part.rOffset) - (part.cannon.y) * Math.sin(facing + part.rOffset));
                    bullet.y += ((part.cannon.x) * Math.sin(facing + part.rOffset) + (part.cannon.y) * Math.cos(facing + part.rOffset));
                    facing += normalDistribution(0, part.cannon.spread);
                    let res = toComponent(bullet.v, facing + part.rOffset);
                    bullet.vx = res.x + unit.vx;
                    bullet.vy = res.y + unit.vy;
                    if (bullet.accel) {
                        bullet.vx -= unit.vx;
                        bullet.vy -= unit.vy;
                    }
                    bullet.r = facing + part.rOffset;
                    /*
                    bullet.vr = part.cannon.bullet.vr;
                    bullet.rDrag = part.cannon.bullet.rDrag;*/
                    projectiles.push(bullet);
                }
            }
            if (part.cannon.delay) {
                if (unit.keyboard[part.cannon.keybind]) {
                    part.cannon.delay.c -= 1;
                } else {
                    part.cannon.delay.c = part.cannon.delay.t;
                }
            }
        }
    }
    return part;
};

function handleShooting(unit) {
    unit.parts = recursiveParts(unit, unit.parts, shoot);
    return unit;
};

function handleDecay(objs) {
    let newObjs = []
    for (let i = 0; i < objs.length; i++) {
        let obj = objs[i];
        //console.log(obj);
        obj.decay.life -= 1;
        if(obj.decay.life > 0) {
            if (obj.type == 'polygon') {
                for (let j = 0; j < obj.size.length; j++) {
                    obj.size[j].x *= obj.decay.size;
                    obj.size[j].y *= obj.decay.size;
                }
            } else {
                obj.size *= obj.decay.size;
            }
            obj.style.fill.r += obj.decay.fillStyle.r;
            obj.style.fill.g += obj.decay.fillStyle.g;
            obj.style.fill.b += obj.decay.fillStyle.b;
            obj.style.fill.a += obj.decay.fillStyle.a;
            obj.style.stroke.r += obj.decay.strokeStyle.r;
            obj.style.stroke.g += obj.decay.strokeStyle.g;
            obj.style.stroke.b += obj.decay.strokeStyle.b;
            obj.style.stroke.a += obj.decay.strokeStyle.a;
            newObjs.push(obj);
        }
    }
    return newObjs;
};

function recursiveCollision(unit, parts, object) {
    let pts = JSON.parse(JSON.stringify(parts));
    let obj = JSON.parse(JSON.stringify(object));
    for (let i = 0; i < pts.length; i++) {
        if (pts[i].collision) {
            let collide = false;
            if (pts[i].type == 'polygon') {
                let cType = '';
                if (obj.cType) {
                    cType = obj.cType;
                } else {
                    cType = obj.type;
                }
                let facing = unit.r;
                if (pts[i].facing == 'turret') {
                    facing = unit.mouseR;
                }
                let points = offsetPoints(rotatePolygon(offsetPoints(JSON.parse(JSON.stringify(pts[i].size)), pts[i].offset), facing), unit);
                switch (cType) {
                    case 'point':
                        //drawCircle(display.x/2 - player.x + obj.x, display.y/2 - player.y + obj.y, 5, 'rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 1)', 2, 1);
                        if (pointInPolygon(obj, points)) {
                            collide = true;
                        }
                        break;
                    case 'circle':
                        let r = 0;
                        if (obj.size) {
                            r = obj.size;
                        } else if (obj.r) {
                            r = obj.r;
                        } else {
                            console.warn('WARNING: can\'t find radius!');
                        }
                        let notCircle = circleToPolygon(obj, r, 10); // a decagon is close enough to a circle
                        if (polygonCollision(notCircle, points)) {
                            collide = true;
                        }
                        break;
                    case 'polygon': // unreliable
                        if (polygonCollision(offsetPoints(rotatePolygon(JSON.parse(JSON.stringify(obj.size)), obj.r), obj), points)) {
                            collide = true;
                        }
                        break;
                    case 'line': // TODO: make it actual line collision (currently many point collisions)
                        let s = offsetPoints(rotatePolygon([JSON.parse(JSON.stringify(obj.cSize.start)), JSON.parse(JSON.stringify(obj.cSize.end))], obj.r), obj);
                        let segment = {start: s[0], end: s[1]};
                        let diff = vMath(segment.end, segment.start, '-');
                        for (let i = 0.1; i < 1; i += 0.2) {
                            let point = vMath(JSON.parse(JSON.stringify(segment.start)), vMath(JSON.parse(JSON.stringify(diff)), i, '*'), '+');
                            //drawCircle(display.x/2 - player.x + point.x, display.y/2 - player.y + point.y, 5, 'rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 1)', 2, 1);
                            //drawPolygon(points, {x: 0, y: 0}, 0, 'rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 1)', false, true);
                            if (pointInPolygon(point, points)) {
                                collide = true;
                                break;
                            } 
                        }
                        break;
                    default:
                        console.log(obj);
                        throw `ERROR: wtf is this object type! ${cType}`;
                }
            } else {
                //console.log(getDist(offsetPoints(JSON.parse(JSON.stringify([pts[i].offset])), unit)[0], obj));
                let cType = '';
                if (obj.cType) {
                    cType = obj.cType;
                } else {
                    cType = obj.type;
                }
                switch (cType) {
                    case 'point':
                        if (getDist(vMath(JSON.parse(JSON.stringify(pts[i].offset)), unit, 'add'), obj) <= pts[i].size) {
                            collide = true;
                        }
                        break;
                    case 'circle':
                        let r = obj.size;
                        if (getDist(vMath(JSON.parse(JSON.stringify(pts[i].offset)), unit, 'add'), obj) <= pts[i].size + r) {
                            collide = true;
                        }
                        break;
                    case 'polygon':
                        let notCircle = circleToPolygon(pts[i], pts[i].size, 10); // a decagon is close enough to a circle
                        if (polygonCollision(notCircle, obj.size)) {
                            collide = true;
                        }
                        break;
                    case 'line':
                        let s = offsetPoints(rotatePolygon([JSON.parse(JSON.stringify(obj.cSize.start)), JSON.parse(JSON.stringify(obj.cSize.end))], obj.r), obj);
                        let segment = {start: s[0], end: s[1]};
                        if (lineCircleIntersectV2(segment, {x: unit.x, y: unit.y, r: unit.size})) {
                            collide = true;
                        }
                        break;
                    default:
                        throw `ERROR: wtf is this object type2! ${cType}`;
                }
            }
            if (collide) {
                pts[i].hp -= obj.dmg;
                //console.log(pts[i].id, pts[i].hp);
                pts[i].isHit=5;
                if (obj.explosion) {
                    obj.explosion.x = obj.x;
                    obj.explosion.y = obj.y;
                    obj.explosion.transparancy = 1;
                    obj.explosion.active = true;
                    obj.explosion.type = 'circle';
                    obj.explosion.isExplosion = true;
                    explosions.push(obj.explosion);
                } 
                if (!obj.isExplosion || !obj.active) {
                    obj.dmg = 0; // have to do this to stop it hitting multiple pts (this is inefficient but hard to fix. maybe rework this to not use recursion? bfs?)
                    return [pts, obj];
                }
            }
        }
        let res = recursiveCollision(unit, pts[i].connected, obj);
        pts[i].connected = res[0];
        obj = res[1];
    }
    return [pts, obj];
};

function handleCollisions(units, projectiles, accurate) {
    let newProj = [];
    if (projectiles.length && units.length) {
        for (let i = 0; i < projectiles.length; i++) {
            if (accurate) {
                let calcs = Math.abs(projectiles[i].v)/50;
                for (let k=0; k < calcs; k++) {
                    for (let j = 0; j < units.length; j++) {
                        if (units[j].noClip) {
                            continue;
                        }
                        let ncoords = vMath(projectiles[i], vMath({x: projectiles[i].vx, y: projectiles[i].vy}, k, '*'), '+');
                        let oldP = {x: projectiles[i].x, y: projectiles[i].y};
                        let np = JSON.parse(JSON.stringify(projectiles[i]));
                        np.x = ncoords.x;
                        np.y = ncoords.y;
                        //console.log(ncoords);
                        if (getDist(ncoords, units[j]) <= units[j].collisionR) {
                            //console.log(units[j]);
                            let res = recursiveCollision(units[j], units[j].parts, np);
                            units[j].parts = res[0];
                            projectiles[i] = res[1];
                            projectiles[i].x = oldP.x;
                            projectiles[i].y = oldP.y;
                        }
                    }
                }
            } else {
                for (let j = 0; j < units.length; j++) {
                    if (getDist(projectiles[i], units[j]) <= units[j].collisionR) {
                        //console.log(units[j]);
                        let res = recursiveCollision(units[j], units[j].parts, projectiles[i]);
                        units[j].parts = res[0];
                        projectiles[i] = res[1];
                    }
                }
            } 
            if (projectiles[i].dmg != 0) {
                newProj.push(projectiles[i]);
            }
        }
        return [units, newProj];
    }
    return [units, projectiles];
};

function handleBulletWallCollisions(obstacles, projectiles) {
    let newProj = [];
    if (projectiles.length && obstacles.length) {
        for (let i = 0; i < projectiles.length; i++) {
            let noHit = true;
            for (let j = 0; j < obstacles.length; j++) {
                if (obstacles[j].cType == 'tall') {
                    if (pointInPolygon(projectiles[i], obstacles[j].size)) {
                        noHit = false;
                        break;
                    }
                }
            }
            if (noHit) {
                newProj.push(projectiles[i]);
            }
        }
        return newProj;
    }
    return projectiles;
};

function obstacleCollision(unit, obstacle) {
    let collisionR = 0;
    if (obstacle.cType == 'ground') {
        if (unit.groundCollisionR <= 0) {
            return false;
        }
        collisionR = unit.groundCollisionR;
    } else {
        collisionR = unit.tallCollisionR;
    }
    //let notCircle = circleToPolygon(unit, collisionR, 12); // a dodecagon is close enough to a circle
    //return polygonCollision(notCircle, obstacle.size);
    //return polyCollisionAdv(notCircle, obstacle.size);
    return polygonCircleIntersect(obstacle.size, {x: unit.x, y: unit.y, r: collisionR}, true, obstacle.collisionEdges);
};

function handleGroundCollisions(u, obstacles, smort=false, prevMotion=null) {
    let unit = JSON.parse(JSON.stringify(u));
    let hasCollided = false;
    for (let i = 0; i < obstacles.length; i++) {
        let obstacle = obstacles[i];
        let res = obstacleCollision(unit, obstacle);
        if (res) {
            hasCollided = true;
            let thisVectorWorks = true;
            if (smort) { // f*ck optimisation, if it works it works
                unit.x -= prevMotion.x;
                unit.y -= prevMotion.y;
                let mechWallVector = {x: res.end.x - res.start.x, y: res.end.y - res.start.y};
                let mechSlideVector = vMath(vMath(prevMotion, mechWallVector, 'projection'), 0.75, 'multiply');
                unit.x += mechSlideVector.x;
                unit.y += mechSlideVector.y;
                unit.vx = mechSlideVector.x;
                unit.vy = mechSlideVector.y;
                for (let j = 0; j < obstacles.length; j++) {
                    if (obstacleCollision(unit, obstacles[j])) {
                        thisVectorWorks = false;
                        break;
                    }
                }
            }
            if (thisVectorWorks) {
                return res;
            }
        }
    }
    if (hasCollided) {
        return 'well, shit'; // this just means a suitable vector was not found and the unit is rooted in place as a last resort
    }
    return false; 
};

function checkDeadParts(unit, parts) {
    //console.log(unit, parts);
    if (parts) {
        let newParts = [];
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].hp > 0) {
                parts[i].connected = checkDeadParts(unit, parts[i].connected);
                newParts.push(parts[i]);
            } else {
                if (parts[i].core) {
                    unit.alive = false;
                }
            }
        }
        //console.log(newParts);
        return newParts;
    }
    return [];
};

function detectShieldCollision(shield, obj) { 
    let cType = '';
    if (obj.cType) {
        cType = obj.cType;
    } else {
        cType = obj.type;
    }
    switch (cType) {
        case 'point':
            if (getDist(shield, obj) <= shield.r) {
                return true;
            }
            break;
        case 'circle':
            let r = obj.size;
            if (getDist(shield, obj) <= shield.r + obj.size) {
                return true;
            }
            break;
        case 'polygon':
            let notCircle = circleToPolygon(shield, shield.r, 10); // a decagon is close enough to a circle
            if (polygonCollision(notCircle, obj.size)) {
                return true;
            }
            break;
        case 'line':
            let s = offsetPoints(rotatePolygon([JSON.parse(JSON.stringify(obj.cSize.start)), JSON.parse(JSON.stringify(obj.cSize.end))], obj.r), obj);
            let segment = {start: s[0], end: s[1]};
            if (lineCircleIntersectV2(segment, shield)) {
                return true;
            }
            break;
        default:
            throw `ERROR: wtf is this object type! ${cType}`;
    }
    return false;
};

function handleShields(unit, parts) {
    //console.log(unit, parts);
    if (parts) {
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].shield) {
                if (unit.keyboard[parts[i].shield.keybind]) {
                    unit.keyboard[parts[i].shield.keybind] = false;
                    if (parts[i].shield.active) {
                        parts[i].shield.active = false;
                    } else {
                        if (parts[i].shield.hp >= parts[i].shield.minHp) {
                            parts[i].shield.active = true;
                        }
                    }
                }
                if (parts[i].shield.active) {
                    let shield = parts[i].shield;
                    // center the shield around the unit
                    shield.x = unit.x;
                    shield.y = unit.y;
                    if (shield.hp < 0) {
                        shield.active = false;
                    }
                    shields.push(shield);
                    /*
                    for (let j = 0; j < projectiles.length; j++) {
                        if (detectCollision(unit, parts[i], projectiles[j])) {
                            parts[i].shield.hp -= projectiles[j].dmg;
                            if (parts[i].shield.hp <= 0) {
                                parts[i].shield.hp = 0;
                                parts[i].shield.active = false;
                            }
                            projectiles[j].dmg = 0;
                        }
                    }
                    for (let j = 0; j < explosions.length; j++) {
                        if (detectCollision(unit, parts[i], explosions[j])) {
                            parts[i].shield.hp -= explosions[j].dmg;
                            if (parts[i].shield.hp <= 0) {
                                parts[i].shield.hp = 0;
                                parts[i].shield.active = false;
                            }
                        }
                    }*/

                }
                console.log(parts[i].shield.hp);
                parts[i].shield.hp += parts[i].shield.regen;
                if (parts[i].shield.hp > parts[i].shield.cap) {
                    parts[i].shield.hp = parts[i].shield.cap;
                } 
                if (parts[i].shield.hp < 0) {
                    parts[i].shield.hp = 0;
                }
                unit.noClip = parts[i].shield.active;
            } 
            parts[i].connected = handleShields(unit, parts[i].connected);
        }
        return parts;
    }
    return [];
};

function renderShield(shield) {
    //console.log(shield);
    //console.log(shield.hp/shield.cap*0.2, (1-(shield.hp/shield.cap))*0.2);
    //drawCircle(shield.x, shield.y, shield.r, `rgba(50, 200, 255, ${shield.hp/shield.cap*0.4})`, `rgba(40, 180, 230, ${shield.hp/shield.cap*0.4})`, 10, 1, false);
    //drawCircle(shield.x, shield.y, shield.r, `rgba(255, 0, 0, ${(1-(shield.hp/shield.cap))*0.2})`, `rgba(255, 0, 0, ${(1-(shield.hp/shield.cap))*0.2})`, 10, 1, false);
    drawCircle(shield.x, shield.y, shield.r, `rgba(${Math.round((1-(shield.hp/shield.cap))*255)}, 150, ${Math.round((shield.hp/shield.cap)*255)}, ${(shield.hp/shield.cap)*0.2+0.2})`, `rgba(${Math.round((1-(shield.hp/shield.cap))*220)}, 150, ${Math.round((shield.hp/shield.cap)*220)}, ${(shield.hp/shield.cap)*0.2+0.2})`, 10, 1, false);
};

function shieldCollisions(shields, projectiles) {
    for (let i = 0; i < shields.length; i++) {
        for (let j = 0; j < projectiles.length; j++) {
            if (detectShieldCollision(shields[i], projectiles[j])) {
                shields[i].hp -= projectiles[j].dmg;
                if (shields[i].hp <= 0) {
                    shields[i].hp = 0;
                    shields[i].active = false;
                }
                projectiles[j].dmg = 0;
            }
        }
    }
    return [shields, projectiles];
};

function runScript(unit, teams, obstacles, projectiles, explosions, particles, entities, checkpoint) { // return orders
    unit = JSON.parse(JSON.stringify(unit));
    teams = JSON.parse(JSON.stringify(teams));
    let player = undefined;
    let t = undefined;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].id == unit.team) {
            let script = teams[i].scripts[unit.script];
            if (script) {
                //console.log(script);
                //console.log(eval(script));
                return eval(script);
            } else {
                //console.warn('WARNING: no script found!');
                return [];
            }
        }
    }
    console.warn('WARNING: no team found!');
    return [];
    // throw 'ERROR: No script found';
};

function handleOrdersKeyPressMode(unit) {
    //console.log(unit);
    for (let i = 0; i < unit.orders.length; i++) {
        if (unit.orders[i].id == 'aim') {
            unit.keyboard.aimPos = unit.orders[i].value; // cordinate (absolute)
        }
        unit.keyboard[unit.orders[i].id] = unit.orders[i].value;
    }
    return unit;
};

function handleScript(unit) {
    if (unit.script) {
        unit.orders = runScript(JSON.parse(JSON.stringify(unit)), JSON.parse(JSON.stringify(teams)), JSON.parse(JSON.stringify(obstacles)), JSON.parse(JSON.stringify(projectiles)), JSON.parse(JSON.stringify(explosions)), JSON.parse(JSON.stringify(particles)), JSON.parse(JSON.stringify(entities), JSON.parse(JSON.stringify(checkpoint))));
        unit = handleOrdersKeyPressMode(unit);
    }
    return unit;
};

function renderCheckpoint() {
    if (entities.length <= 1) {
        drawCircle(checkpoint.x + checkpoint.parts[0].offset.x, checkpoint.y + checkpoint.parts[0].offset.y, checkpoint.parts[0].size, checkpoint.parts[0].style.fill, checkpoint.parts[0].style.stroke.colour, checkpoint.parts[0].style.stroke.width, 1, false);
    } else {
        drawCircle(checkpoint.x + checkpoint.parts[0].offset.x, checkpoint.y + checkpoint.parts[0].offset.y, checkpoint.parts[0].size, checkpoint.parts[0].style2.fill, checkpoint.parts[0].style2.stroke.colour, checkpoint.parts[0].style2.stroke.width, 1, false);
    }
};

function handleCheckpoint() {
    if (getDist(player, checkpoint) < player.tallCollisionR + checkpoint.collisionR && entities.length == 1) {
        if (winTime < 0) {
            winTime = t;
        }
        var overlay = document.getElementById('overlay');
        if (overlay.style.display != 'block') {
            console.log(`game over in ${winTime} ticks (lower is better)`);
            overlay.innerHTML = `
            <h1>Level Complete</h1>
            <button onclick="loadLevel('MovementI')"><h3>Movement I</h3></button><button onclick="loadLevel('MovementII')"><h3>Movement II</h3></button><button onclick="loadLevel('MovementIII')"><h3>Movement III</h3></button><button onclick="loadLevel('MovementIV')"><h3>Movement IV</h3></button><br>
            <button onclick="loadLevel('AimingI')"><h3>Aiming I</h3></button><button onclick="loadLevel('AimingII')"><h3>Aiming II</h3></button><button onclick="loadLevel('AimingIII')"><h3>Aiming III</h3></button><button onclick="loadLevel('AimingIV')"><h3>Aiming IV</h3></button><button onclick="loadLevel('AimingV')"><h3>Aiming V</h3></button><br>
            <button onclick="loadLevel('TacticsI')"><h3>Tactics I</h3></button><button onclick="loadLevel('TacticsII')"><h3>Tactics II</h3></button><button onclick="loadLevel('TacticsIII')"><h3>Tactics III</h3></button><button onclick="loadLevel('TacticsIV')"><h3>Tactics IV</h3></button><br>
            <button onclick="loadLevel('CombatI')"><h3>Combat I</h3></button><button onclick="loadLevel('CombatII')"><h3>Combat II</h3></button><button onclick="loadLevel('CombatIII')"><h3>Combat III</h3></button><button onclick="loadLevel('CombatIV')"><h3>Combat IV</h3></button><button onclick="loadLevel('CombatV')"><h3>Combat V</h3></button><button onclick="loadLevel('CombatVI')"><h3>Combat VI</h3></button><button onclick="loadLevel('CombatVII')"><h3>Combat VII</h3></button><br>
            <button onclick="loadLevel('MeleeI')"><h3>Melee I</h3></button><button onclick="loadLevel('MeleeII')"><h3>Melee II</h3></button><button onclick="loadLevel('MeleeIII')"><h3>Melee III</h3></button><br>`;
            overlay.style.display = 'block';
            return true;
        }
    }
    return false;
};

function physics() {
    shields = [];

    let newEntities = [];
    for (let i = 0; i < entities.length; i++) {
        //console.log(entities[i]);
        entities[i].parts = checkDeadParts(entities[i], entities[i].parts);
        entities[i] = handleScript(entities[i]);
        entities[i] = handlePlayerMotion(entities[i], obstacles);
        entities[i] = handleShooting(entities[i]);
        entities[i].parts = handleShields(entities[i], entities[i].parts);
        if (entities[i].alive) {
            newEntities.push(entities[i]);
        }
    }
    entities = newEntities;

    projectiles = simulatePhysics(projectiles);
    projectiles = handleDecay(projectiles);

    let newExpl = [];
    for (let i = 0; i < explosions.length; i++) {
        let res = handleExplosion(explosions[i]);
        if (res) {
            newExpl.push(res);
        }
    }
    explosions = newExpl;

    let res = shieldCollisions(shields, projectiles, true);
    shields = res[0];
    projectiles = res[1];

    res = shieldCollisions(shields, explosions, true);
    shields = res[0];
    res = handleCollisions(entities, projectiles, true);
    entities = res[0];
    projectiles = res[1];

    res = handleCollisions(entities, explosions, false);
    entities = res[0];
    projectiles = handleBulletWallCollisions(obstacles, projectiles);

    const endTime = performance.now();

    let gameState = handleCheckpoint();
    return gameState;
};

function graphics(step) {
    player.x -= player.vx*(1-step/FPT);
    player.y -= player.vy*(1-step/FPT);
    clearCanvas('main');
    clearCanvas('canvasOverlay');
    grid(400, player);
    renderCheckpoint();
    for (let i = 0; i < obstacles.length; i++) {
        if (obstacles[i].cType == 'ground') {
            //console.log(obstacles[i]);
            drawPolygon(obstacles[i].size, {x: 0, y: 0}, 0, obstacles[i].style.fill, obstacles[i].style.stroke, false);
        }
    }
    for (let i = 0; i < entities.length; i++) {
        let newEntity = JSON.parse(JSON.stringify(entities[i]));
        if (i != 0) {
            newEntity.x -= newEntity.vx*(1-step/FPT);
            newEntity.y -= newEntity.vy*(1-step/FPT);
        }
        renderUnit(newEntity);
    }

    let newProj = JSON.parse(JSON.stringify(projectiles));
    for (let i = 0; i < newProj.length; i++) {
        newProj[i].x -= newProj[i].vx*(1-step/FPT);
        newProj[i].y -= newProj[i].vy*(1-step/FPT);
    }
    renderParticles(newProj);

    for (let i = 0; i < obstacles.length; i++) {
        if (obstacles[i].cType == 'tall') {
            //console.log(obstacles[i]);
            drawPolygon(obstacles[i].size, {x: 0, y: 0}, 0, obstacles[i].style.fill, obstacles[i].style.stroke, false);
        }
    }

    for (let i = 0; i < shields.length; i++) {
        renderShield(shields[i]);
    }
    for (let i = 0; i < explosions.length; i++) {
        renderExplosion(explosions[i]);
    }
    player.x += player.vx*(1-step/FPT);
    player.y += player.vy*(1-step/FPT);
};

/*
function main() {
    const startRendering1Time = performance.now();
    // draw the background
    clearCanvas('main');
    clearCanvas('canvasOverlay');
    shields = [];
    grid(400);

    // Render ground obstacles
    for (let i = 0; i < obstacles.length; i++) {
        if (obstacles[i].cType == 'ground') {
            //console.log(obstacles[i]);
            drawPolygon(obstacles[i].size, {x: 0, y: 0}, 0, obstacles[i].style.fill, obstacles[i].style.stroke, false);
        }
    }

    let gameState = handleCheckpoint();
    const startEntityProcessingTime = performance.now();
    // Process entities
    let newEntities = [];
    for (let i = 0; i < entities.length; i++) {
        //console.log(entities[i]);
        entities[i].parts = checkDeadParts(entities[i], entities[i].parts);
        entities[i] = handleScript(entities[i]);
        entities[i] = handlePlayerMotion(entities[i], obstacles);
        entities[i] = handleShooting(entities[i]);
        entities[i].parts = handleShields(entities[i], entities[i].parts);
        if (entities[i].alive) {
            newEntities.push(entities[i]);
        }
    }
    entities = newEntities;

    const startProjectileProcessingTime = performance.now();
    // Process Projectiles
    projectiles = simulatePhysics(projectiles);
    projectiles = handleDecay(projectiles);

    const startRendering2Time = performance.now();
    // Render Entities
    for (let i = 0; i < entities.length; i++) {
        renderUnit(entities[i]);
    }
    renderParticles(projectiles);

    // Render Tall obstacles
    for (let i = 0; i < obstacles.length; i++) {
        if (obstacles[i].cType == 'tall') {
            //console.log(obstacles[i]);
            drawPolygon(obstacles[i].size, {x: 0, y: 0}, 0, obstacles[i].style.fill, obstacles[i].style.stroke, false);
        }
    }

    for (let i = 0; i < shields.length; i++) {
        renderShield(shields[i]);
    }

    const startExplosionProcessingTime = performance.now();
    // Handle explosions
    let newExpl = [];
    for (let i = 0; i < explosions.length; i++) {
        let res = handleExplosion(explosions[i]);
        if (res) {
            newExpl.push(res);
        }
    }
    explosions = newExpl;

    const startCollisionProcessingTime = performance.now();
    // Handle Collisions
    const sc = performance.now();
    let res = shieldCollisions(shields, projectiles, true);
    shields = res[0];
    projectiles = res[1];

    res = shieldCollisions(shields, explosions, true);
    shields = res[0];
    const ec = performance.now();
    res = handleCollisions(entities, projectiles, true);
    entities = res[0];
    projectiles = res[1];

    res = handleCollisions(entities, explosions, false);
    entities = res[0];
    const end = performance.now();
    projectiles = handleBulletWallCollisions(obstacles, projectiles);

    const endTime = performance.now();
    if(entities.length <= 1) {
        //console.warn('all enemies dead!');
    }
    console.log(`Total Shield Processing: ${ec-sc}`);
    console.log(`Total Entity Processing: ${end-ec}`);
    
    console.log(`Total Rendering: ${startEntityProcessingTime-startRendering1Time + startExplosionProcessingTime-startRendering2Time}`);
    console.log(`Total Entity Processing: ${startProjectileProcessingTime-startEntityProcessingTime}`);
    console.log(`Total Projectile Processing: ${startRendering2Time-startProjectileProcessingTime}`);
    console.log(`Total Explosion Processing: ${startCollisionProcessingTime-startExplosionProcessingTime}`);
    console.log(`Total Collision Processing: ${endTime-startCollisionProcessingTime}`);
    console.log(`Total ms/tick: ${endTime-startRendering1Time}, max: ${1000/TPS}ms`);
    return gameState;
};*/

function main() {
    let gameState = undefined;
    const start = performance.now();
    graphics(t%FPT);
    if (t%FPT == 0) {
        const start2 = performance.now();
        gameState = physics();
        const end2 = performance.now();
        //console.log(`Physics Processing Time: ${end2-start2}ms`);
    }
    t++;
    const end = performance.now();
    //console.log(`Processing Time: ${end-start}ms, max: ${1000/FPS}ms for ${FPS}fps. Max Possible FPS: ${1000/(end-start)}`);
    return gameState;
};

var t=0
var winTime = -1;
var paused = false;
var preGame = false;
const TPS = data.constants.TPS;
const FPS = data.constants.FPS;
const FPT = FPS/TPS;
async function game() {
    while (1) {
        if (paused == false) {
            if (main()) {
                break;
            }
            await sleep(1000/FPS);
        } else {
            await sleep(1000/30);
        }
        if (player.keyboard.p || preGame) {
            player.keyboard.p = false;
            paused = !paused;
            if (paused) {
                var overlay = document.getElementById('overlay');
                overlay.style.display = 'block';
                if (preGame) {
                    overlay.innerHTML = `<h1>Pre Game</h1>`;
                    preGame = false;
                } else {
                    overlay.innerHTML = `<h1>Paused</h1>`;
                }
                overlay.innerHTML += `
<form>
<label for="script1">Script 1</label><br>
<textarea id="script1" rows="50" cols="90" maxlength="100000">
let orders = [];

// Insert javascript code here
// You may need to look at the game's source code to see what variables you have access to
// I strongly recommend writing code in an external editor, 
// code written here will not be saved, and can not be editted once submitted
// changing your code will require rewriting it or copying it in from an external editor
// Don't alter this if you do not wish to control your unit with a script
// Also, press P to unpause or the Load Script button to actuvate your program

return orders;
</textarea>
</form>
<button onclick="loadScript('Player', 1)"><h3>Load Script</h3></button>
                `;
            } else {
                overlay.style.display = 'none';
            }
        }
    }
};


