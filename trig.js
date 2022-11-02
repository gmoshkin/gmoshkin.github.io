const canvas = document.getElementById("canvas");
canvas.width = 800;
canvas.height = 600;
const ctx = canvas.getContext("2d");

document.onmousemove = (event) => { lastEvent = event; mousePos = getMousePos() };
canvas.onmousedown = (event) => { mouseDown = event.which; };
canvas.onmouseup = (event) => { mouseDown = 0 };
setInterval(redraw, 17);

var mode = null;
var lastButton = null;

var lastEvent = null;
var mouseDown = 0;
let mousePos = null;
var selected = null;

////////////////////////////////////////////////////////////////////////////////
// redraw

function redraw() {
    path.update();
    circle.update();
    line.update();
    intersection.update();
    // ball.update();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    path.draw();
    circle.draw();
    line.draw();
    intersection.draw();
    ball.draw();
}

////////////////////////////////////////////////////////////////////////////////
// path

const path = new Figure('path');

path.update = function() {
    if (mouseDown) {
        this.updateSelectedPoint();
        // only add/remove points if in appropriate mode
        if (mode === this.button.id) {
            if (mouseDown === 1) {
                if (this.nothingIsSelected()) {
                    this.points.push(mousePos);
                    this.selectPoint(this.points.length - 1);
                }
            } else if (mouseDown === 2 && this.selectedPoint() != null) {
                remove(this.points, this.selectedPoint());
                this.deselectPoint();
            }
        }
        // move selected point
        if (mouseDown === 1) {
            if (this.selectedPoint() != null) {
                this.points[this.selectedPoint()] = mousePos;
            }
        }
    } else {
        this.hoverPoint = this.getPointIdxUnderMouse();
        if (this.selectedPoint() != null) {
            this.deselectPoint();
        }
    }
}

path.draw = function() {
    this.drawPath();
    this.drawPoints();
}

////////////////////////////////////////////////////////////////////////////////
// circle

const circle = new Figure('circle');
circle.points = [{x: 350, y: 200}, {x: 500, y: 200}]
Object.defineProperty(circle, 'origin', { get() { return this.points[0] } })
Object.defineProperty(circle, 'radius', {
    get() {
        let [a, b] = this.points;
        return Math.pow(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2), 1/2)
    }
})

circle.update = function() {
    if (mouseDown) {
        this.updateSelectedPoint();
        // only add/remove points if in appropriate mode
        if (mode === this.button.id) {
            if (mouseDown === 1 && this.points.length < 2) {
                if (this.nothingIsSelected()) {
                    this.points.push(mousePos);
                    this.selectPoint(this.points.length - 1);
                }
            } else if (mouseDown === 2 && this.selectedPoint() != null) {
                remove(this.points, this.selectedPoint());
                this.deselectPoint();
            }
        }
        // move selected point
        if (mouseDown === 1) {
            if (this.selectedPoint() != null) {
                this.points[this.selectedPoint()] = mousePos;
            }
        }
    } else {
        this.hoverPoint = this.getPointIdxUnderMouse();
        if (this.selectedPoint() != null) {
            this.deselectPoint();
        }
    }
}

circle.draw = function() {
    if (this.points.length == 2) {
        ctx.beginPath();
        ctx.arc(this.origin.x, this.origin.y, this.radius, 0, 2 * Math.PI);
        this.stroke();
    }
    this.drawPoints();
}

////////////////////////////////////////////////////////////////////////////////
// line

const line = new Figure('line');
line.points = [{x: 320, y: 300}, {x: 500, y: 400}]
line.lineDash = [3, 3];
defineLineProperties(line, true);

line.update = function() {
    if (mouseDown) {
        this.updateSelectedPoint();
        // only add/remove points if in appropriate mode
        if (mode === this.button.id) {
            if (mouseDown === 1 && this.points.length < 2) {
                if (this.nothingIsSelected()) {
                    this.points.push(mousePos);
                    this.selectPoint(this.points.length - 1);
                }
            } else if (mouseDown === 2 && this.selectedPoint() != null) {
                remove(this.points, this.selectedPoint());
                this.deselectPoint();
            }
        }
        // move selected point
        if (mouseDown === 1) {
            if (this.selectedPoint() != null) {
                this.points[this.selectedPoint()] = mousePos;
            }
        }
    } else {
        this.hoverPoint = this.getPointIdxUnderMouse();
        if (this.selectedPoint() != null) {
            this.deselectPoint();
        }
    }
}

line.draw = function() {
    this.drawLine();
    this.drawPoints();
}

function defineLineProperties(line, ordered = false) {
    if (ordered) {
        Object.defineProperty(line, 'start', { get() {
            return this.points[0].x < this.points[1].x ? this.points[0] : this.points[1]
        } })
        Object.defineProperty(line, 'end', { get() {
            return this.points[0].x < this.points[1].x ? this.points[1] : this.points[0]
        } })
    }
    Object.defineProperty(line, 'k', { get() { return lineK(this) } })
    Object.defineProperty(line, 'b', { get() { return lineB(this) } })

    line.drawLine = function() {
        if (this.start != null && this.end != null) {
            drawLine(this)
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// ball

const ball = new Figure();
ball.points = null;
ball.pos = ball.orginPos = { x: circle.origin.x - 10, y: circle.origin.y + 30 }
ball.radius = 10
ball.orginVel = ball.vel = { x: 40, y: 20 }
ball.velVal = sqrt(sqr(ball.orginVel.x) + sqr(ball.orginVel.y))
Object.defineProperty(ball, 'newPos', { get() {
    return addVec(this.pos, this.vel)
} })
Object.defineProperty(ball, 'dirVec', { get() {
    return { start: this.pos, end: this.newPos }
} })
ball.button = addButton('tick', () => { ball.update() })
ball.adjust = null;

ball.update = function() {
    let newPos = addVec(this.pos, this.vel);
    let dirVec = { start: this.pos, end: newPos }
    defineLineProperties(dirVec)
    let adjust = null;
    let reflect = null
    if (distance(newPos, circle.origin) + this.radius > circle.radius) {
        // TODO
        let a = sqr(dirVec.k) + 1;
        let b = 2 * (dirVec.k * (dirVec.b - circle.origin.y) - circle.origin.x);
        let c = sqr(circle.origin.x) + sqr(dirVec.b - circle.origin.y) - sqr(circle.radius - this.radius);
        let x0 = (-b + sqrt(sqr(b) - 4 * a * c)) / 2 / a;
        let x1 = (-b - sqrt(sqr(b) - 4 * a * c)) / 2 / a;
        let x0Err = Math.abs(x0 - this.pos.x)
        let x1Err = Math.abs(x1 - this.pos.x)
        let y0 = dirVec.k * x0 + dirVec.b
        let y1 = dirVec.k * x1 + dirVec.b
        if (x0Err < x1Err) {
            adjust = { x: x0, y: y0 }
        } else if (x0Err > x1Err) {
            adjust = { x: x1, y: y1 }
        } else if (Math.abs(y0 - this.pos.y) < Math.abs(y1 - this.pos.y)) {
            adjust = { x: x0, y: y0 }
        } else {
            adjust = { x: x1, y: y1 }
        }
        let radiusAngle = Math.atan(lineK({ start: circle.origin, end: adjust }))
        let lineAngle = Math.atan(lineK(dirVec))
        let reflectAngle = 2 * radiusAngle - lineAngle
        this.reflectK = Math.tan(reflectAngle);
        this.reflectB = adjust.y - adjust.x * this.reflectK;
        let reflectLength = length(dirVec) - distance(this.pos, adjust)
        reflect = {
            x: adjust.x - Math.cos(reflectAngle) * reflectLength,
            y: adjust.y - Math.sin(reflectAngle) * reflectLength
        }
        this.adjust = adjust
        this.reflect = reflect
        this.pos = this.reflect
        this.vel = {
            x: -Math.cos(reflectAngle) * this.velVal,
            y: -Math.sin(reflectAngle) * this.velVal,
        }
    } else {
        this.pos = this.newPos
    }
}

ball.draw = function() {
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
    stroke(this);
    ctx.beginPath();
    ctx.arc(this.newPos.x, this.newPos.y, this.radius, 0, 2 * Math.PI);
    stroke(this);
    if (this.adjust) {
        ctx.beginPath();
        ctx.arc(this.adjust.x, this.adjust.y, this.radius, 0, 2 * Math.PI);
        stroke({ strokeStyle: 'red' });
        drawLine({ k: this.reflectK, b: this.reflectB })

        ctx.beginPath();
        ctx.arc(this.reflect.x, this.reflect.y, this.radius, 0, 2 * Math.PI);
        stroke({ strokeStyle: 'green' });
    }
}

////////////////////////////////////////////////////////////////////////////////
// intercetion

const intersection = new Figure();
intersection.points = []
intersection.radius = new Figure();
intersection.radius.lineDash = [1, 4];
intersection.radius.strokeStyle = '#303030';
intersection.radius.points = [circle.origin];
defineLineProperties(intersection.radius, true);

intersection.update = function() {
    let a = sqr(line.k) + 1;
    let b = 2 * (line.k * (line.b - circle.origin.y) - circle.origin.x);
    let c = sqr(circle.origin.x) + sqr(line.b - circle.origin.y) - sqr(circle.radius);
    let x0 = (-b + sqrt(sqr(b) - 4 * a * c)) / 2 / a;
    let x1 = (-b - sqrt(sqr(b) - 4 * a * c)) / 2 / a;
    if (line.start.x < x0 && x0 < line.end.x) {
        this.points[0] = { x: x0, y: line.k * x0 + line.b }
    } else {
        this.points[0] = { x: x1, y: line.k * x1 + line.b }
    }
    this.radius.points[0] = circle.origin;
    this.radius.points[1] = this.points[0];
}

intersection.draw = function() {
    this.radius.drawLine();
    if (!isNaN(this.points[0].x)) {
        let radiusAngle = Math.atan(this.radius.k);
        let lineAngle = Math.atan(line.k);
        let reflectionAngle = 2 * radiusAngle - lineAngle;
        let k = Math.tan(reflectionAngle);
        let b = this.points[0].y - this.points[0].x * k;
        ctx.beginPath();
        ctx.moveTo(0, b);
        ctx.lineTo(canvas.width, k * canvas.width + b);
        this.radius.stroke();
    }
    this.drawPoints();
}

////////////////////////////////////////////////////////////////////////////////
// figure

function Figure(mode) {
    this.points = [];
    this.hoverPoint = null;
    this.button = mode && addModeButton(mode);

    this.hoverFillStyle = '#859900';
    this.selectedFillStyle = '#dc322f';
    this.regularFillStyle = '#905040';
    this.strokeStyle = '#000000';
    this.lineDash = [];

    this.nothingIsSelected = function() { return selected === null; }
    this.selectPoint = function(point) { selected = { figure: this, point }; }
    this.deselectPoint = function() { selected = null; }

    this.selectedPoint = function() {
        if (selected != null && selected.figure === this) {
            return selected.point;
        }
    }

    this.updateSelectedPoint = function() {
        if (selected != null) return;
        let point = this.getPointIdxUnderMouse();
        if (point === null) return;
        this.selectPoint(point);
    }

    this.getPointIdxUnderMouse = function() {
        if (mousePos == null) return null;
        for (let [i, {x, y}] of this.points.entries()) {
            if (Math.pow(x - mousePos.x, 2) + Math.pow(y - mousePos.y, 2) < 10 * 10) {
                return i;
            }
        }
        return null;
    }

    this.drawPath = function() {
        for (let i = 0; i < this.points.length - 1; i++) {
            ctx.beginPath();
            ctx.moveTo(this.points[i].x, this.points[i].y);
            ctx.lineTo(this.points[i + 1].x, this.points[i + 1].y);
            this.stroke();
        }
    }

    this.drawPoints = function() {
        for (let [i, {x, y}] of this.points.entries()) {
            if (i === this.hoverPoint) {
                drawPoint(x, y, 8, this.hoverFillStyle);
            }
            let style = (i === this.selectedPoint()) ? this.selectedFillStyle : this.regularFillStyle;
            drawPoint(x, y, 5, style);
        }
    }

    this.stroke = function() {
        stroke(this)
    }
}

////////////////////////////////////////////////////////////////////////////////
// modes

function addModeButton(name) {
    let button = document.createElement('button')
    button.innerHTML = name;
    button.id = name;
    button.className = 'button_off';
    button.onclick = (event) => { toggleMode(button) }
    document.getElementById('buttons').appendChild(button);
    return button
}

function addButton(name, onclick) {
    let button = document.createElement('button')
    button.innerHTML = name;
    button.id = name;
    button.onclick = onclick;
    document.getElementById('buttons').appendChild(button);
    return button
}

function toggleMode(button) {
    if (lastButton != null) lastButton.className = 'button_off';
    if (lastButton === button) {
        lastButton = null;
        mode = null;
    } else {
        button.className = 'button_on';
        lastButton = button;
        mode = button.id;
    }
}

////////////////////////////////////////////////////////////////////////////////
// util

function sqr(x) { return Math.pow(x, 2) }
function sqrt(x) { return Math.pow(x, 1/2) }

function addVec(a, b) {
    return { x: a.x + b.x, y: a.y + b.y }
}

function distance(a, b) {
    return sqrt(sqr(a.x - b.x) + sqr(a.y - b.y))
}

function length({ start, end }) {
    return distance(start, end)
}

function lineK({ start, end }) {
    return (end.y - start.y) / (end.x - start.x)
}
function lineB({ start, end }) {
    return start.y - start.x * lineK({ start, end })
}

function unwrapOr(nullable, def) {
    return (nullable === null) ? def : nullable;
}

function remove(arr, i) {
    if (0 > i || i >= arr.length) return null;
    let tail = arr.splice(i + 1);
    let [removed] = arr.splice(i);
    arr.push(...tail);
    return removed;
}

function getMousePos() {
    if (lastEvent === null) return { x: -1, y: -1 };
    let { x: canvasX, y: canvasY } = canvas.getBoundingClientRect();
    let { clientX: mouseX, clientY: mouseY } = lastEvent;
    return { x: mouseX - canvasX, y: mouseY - canvasY }
}

function drawPoint(x, y, r, style) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    if (style === undefined) {
        style = '#905040';
    }
    ctx.fillStyle = style;
    ctx.fill();
}

function drawLine(obj) {
    ctx.beginPath();
    ctx.moveTo(0, obj.b);
    ctx.lineTo(canvas.width, obj.k * canvas.width + obj.b);
    stroke(obj);
}

function stroke(obj) {
    ctx.strokeStyle = obj.strokeStyle || '#000000';
    ctx.setLineDash(obj.lineDash || []);
    ctx.stroke();
}
