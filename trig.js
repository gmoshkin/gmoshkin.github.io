const canvas = document.getElementById("canvas");
canvas.width = 800;
canvas.height = 600;
const ctx = canvas.getContext("2d");
const debugSection = document.getElementsByTagName('debug')[0];

document.onmousemove = (event) => { lastEvent = event; mousePos = getMousePos() };
canvas.onmousedown = (event) => { mouseDown = event.which; };
canvas.onmouseup = (event) => { mouseDown = 0 };
setInterval(redraw, 17);

var lastButton = null;

var lastEvent = null;
var mouseDown = 0;
let mousePos = null;
var selected = null;

////////////////////////////////////////////////////////////////////////////////
// redraw

function redraw() {
    path.update();
    if (buttonIsOn(circle.button)) circle.update();
    if (buttonIsOn(line.button)) {
        line.update();
        intersection.update();
    }
    if (buttonIsOn(ball.ballGo)) ball.update();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    path.draw();
    circle.draw();
    if (buttonIsOn(line.button)) {
        line.draw();
        intersection.draw();
    }
    ball.draw();
}

////////////////////////////////////////////////////////////////////////////////
// path

const path = new Figure('path');

path.update = function() {
    if (mouseDown) {
        this.updateSelectedPoint();
        // only add/remove points if in appropriate mode
        if (buttonIsOn(this.button)) {
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
circle.points = [
    {x: canvas.width / 2, y: canvas.height / 2},
    {x: canvas.width * 3/4, y: canvas.height / 2}
]
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
    if (buttonIsOn(this.button))
        this.drawPoints();
}

////////////////////////////////////////////////////////////////////////////////
// line

const line = new Figure('line');
line.start = {x: 320, y: 300}
line.end = {x: 500, y: 400}
line.lineDash = [3, 3];
line.regularFillStyle = { byIndex: (i) => i == 0 ? 'black' : 'yellow' }
defineLineProperties(line);

line.update = function() {
    if (mouseDown) {
        this.updateSelectedPoint();
        // move selected point
        if (mouseDown === 1) {
            if (this.selectedPoint() != null) {
                this.points[this.selectedPoint()].x = mousePos.x;
                this.points[this.selectedPoint()].y = mousePos.y;
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

function defineLineProperties(line) {
    Object.defineProperty(line, 'points', { get() { return [this.start, this.end] } })
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
ball.nextPos = ball.pos = ball.orginPos = { x: circle.origin.x - 10, y: circle.origin.y + 30 }
ball.radius = 10
ball.velVal = 4
ball.velAngle = Math.PI / 6
Object.defineProperty(ball, 'vel', { get() {
    return {
        x: ball.velVal * Math.cos(ball.velAngle),
        y: ball.velVal * Math.sin(ball.velAngle)
    }
} })
Object.defineProperty(ball, 'newPos', { get() {
    return addVec(this.pos, this.vel)
} })
Object.defineProperty(ball, 'dirVec', { get() {
    return { start: this.pos, end: this.newPos }
} })
ball.ballGo = addButton('ball go', () => {
    if (buttonIsOn(ball.ballGo)) {
        ball.ballGo.className = 'button_off'
    } else {
        ball.ballGo.className = 'button_on'
        ball.moveBall.className = 'button_off'
    }
})
ball.ballGo.className = 'button_on'
ball.moveBall = addButton('move ball', () => {
    if (buttonIsOn(ball.moveBall)) {
        ball.moveBall.className = 'button_off'
    } else {
        ball.moveBall.className = 'button_on'
        ball.ballGo.className = 'button_off'
    }
})
ball.tick = addButton('tick', () => { ball.update() })
ball.adjust = null;
ball.velValInput = document.getElementById("velVal")
ball.velValInput.value = ball.velVal
ball.velValInput.onchange = () => ball.velVal = eval(ball.velValInput.value)

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
        if (distance(reflect, circle.origin) > circle.radius - this.radius) {
            reflect = {
                x: adjust.x + Math.cos(reflectAngle) * reflectLength,
                y: adjust.y + Math.sin(reflectAngle) * reflectLength
            }
            this.velAngle = reflectAngle
        } else {
            this.velAngle = Math.PI + reflectAngle
        }
        this.pos = reflect
    } else {
        this.pos = this.newPos
        this.reflect = null
    }
}
ball.updateMove = function() {

}

ball.draw = function() {
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
    stroke(this);
    if (buttonIsOn(ball.moveBall)) {
        ctx.beginPath();
        ctx.arc(this.newPos.x, this.newPos.y, this.radius, 0, 2 * Math.PI);
        stroke({ strokeStyle: '#808080' });
    }
}

////////////////////////////////////////////////////////////////////////////////
// intercetion

const intersection = new Figure();
intersection.radius = new Figure();
intersection.radius.lineDash = [1, 4];
intersection.radius.strokeStyle = '#303030';
intersection.radius.start = circle.origin;
intersection.display = {
    lineAngle: addDebugField('lineAngle'),
    lineK: addDebugField('lineK'),
    radAngle: addDebugField('radAngle'),
    radK: addDebugField('radK'),
    reflAngle: addDebugField('reflAngle'),
    reflK: addDebugField('reflK'),
}
defineLineProperties(intersection.radius);

intersection.update = function() {
    let a = sqr(line.k) + 1;
    let b = 2 * (line.k * (line.b - circle.origin.y) - circle.origin.x);
    let c = sqr(circle.origin.x) + sqr(line.b - circle.origin.y) - sqr(circle.radius);
    let x0 = (-b + sqrt(sqr(b) - 4 * a * c)) / 2 / a;
    let x1 = (-b - sqrt(sqr(b) - 4 * a * c)) / 2 / a;
    if (line.start.x < x0 && x0 < line.end.x) {
        this.point = { x: x0, y: line.k * x0 + line.b }
    } else if (line.start.x != line.end.x) {
        this.point = { x: x1, y: line.k * x1 + line.b }
    } else {
        // sqr(x - circle.origin.x) + sqr(y - circle.origin.y) == sqr(circle.radius)
        let a = 1;
        let b = - 2 * circle.origin.y;
        let c = sqr(circle.origin.y) + sqr(line.start.x - circle.origin.x) - sqr(circle.radius);
        let y0 = (-b + sqrt(sqr(b) - 4 * a * c)) / 2 / a;
        let y1 = (-b - sqrt(sqr(b) - 4 * a * c)) / 2 / a;
        if (line.start.y < y0 && y0 < line.end.y) {
            this.point = { x: line.start.x, y: y0 }
        } else {
            this.point = { x: line.start.x, y: y1 }
        }
    }
    this.radius.start = circle.origin;
    this.radius.end = this.point;
    let radiusAngle = Math.atan(this.radius.k);
    let lineAngle = Math.atan(line.k);
    this.reflectionAngle = 2 * radiusAngle - lineAngle;
    debugSetFloat2(this.display.lineAngle, 180 * lineAngle / Math.PI)
    debugSetFloat2(this.display.radAngle, 180 * radiusAngle / Math.PI)
    debugSetFloat2(this.display.reflAngle, 180 * this.reflectionAngle / Math.PI)
    debugSetFloat2(this.display.lineK, line.k)
    debugSetFloat2(this.display.radK, this.radius.k)
    debugSetFloat2(this.display.reflK, Math.tan(this.reflectionAngle))
}

intersection.draw = function() {
    this.radius.drawLine();
    if (!isNaN(this.point.x)) {
        let k = Math.tan(this.reflectionAngle);
        let b = this.point.y - this.point.x * k;
        ctx.beginPath();
        ctx.moveTo(0, b);
        ctx.lineTo(canvas.width, k * canvas.width + b);
        this.radius.stroke();

        let reflectionLength = distance(line.start, line.end) - distance(line.start, this.point);
        let reflectionPoint = {
            x: this.point.x + Math.cos(this.reflectionAngle) * reflectionLength,
            y: this.point.y + Math.sin(this.reflectionAngle) * reflectionLength,
        }
        drawPoint(reflectionPoint, 5, 'blue')
    }
    drawPoint(this.point, 5, this.regularFillStyle);
}

////////////////////////////////////////////////////////////////////////////////
// figure

function Figure(mode) {
    this.points = [];
    this.hoverPoint = null;
    this.button = mode && addToggleButton(mode);

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
                drawPoint({x, y}, 8, this.hoverFillStyle);
            }
            let style = (i === this.selectedPoint())
                ? this.selectedFillStyle
                : this.regularFillStyle.byIndex
                    ? this.regularFillStyle.byIndex(i)
                    : this.regularFillStyle;
            drawPoint({x, y}, 5, style);
        }
    }

    this.stroke = function() {
        stroke(this)
    }
}

////////////////////////////////////////////////////////////////////////////////
// debug

const debugToggleButton = addButton('debug', () => {
    toggleButton(debugToggleButton)
    if (buttonIsOn(debugToggleButton)) {
        debugSection.style.display = ''
    } else {
        debugSection.style.display = 'none'
    }
});
debugSection.style.display = 'none'

////////////////////////////////////////////////////////////////////////////////
// modes

function addToggleButton(name) {
    let button = addButton(name, (event) => { toggleButton(button) })
    button.className = 'button_off';
    return button
}

function addDebugField(name) {
    let field = document.createElement('field')
    field.innerHTML = name + ': ';
    field.id = name;
    debugSection.appendChild(field);
    return field
}

function debugSetFloat2(field, float) {
    field.innerHTML = field.id + ': ' + Math.floor(float * 100) / 100
}

function addButton(name, onclick) {
    let button = document.createElement('button')
    button.innerHTML = name;
    button.id = name;
    button.onclick = onclick;
    document.getElementById('buttons').appendChild(button);
    return button
}

function toggleButton(button) {
    button.className = buttonIsOn(button) ? 'button_off' : 'button_on'
}

function buttonIsOn(button) {
    return button.className == 'button_on'
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

function drawPoint({x, y}, r, style) {
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
    if (isFinite(obj.k)) {
        ctx.moveTo(0, obj.b);
        ctx.lineTo(canvas.width, obj.k * canvas.width + obj.b);
    } else {
        ctx.moveTo(obj.start.x, 0);
        ctx.lineTo(obj.start.x, canvas.height);
    }
    stroke(obj);
}

function stroke(obj) {
    ctx.strokeStyle = obj.strokeStyle || '#000000';
    ctx.setLineDash(obj.lineDash || []);
    ctx.stroke();
}
