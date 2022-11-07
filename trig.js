const canvas = document.getElementById("canvas");
const body = document.getElementsByTagName('body')[0]

const ctx = canvas.getContext("2d");
const debugSection = document.getElementsByTagName('debug')[0];
const debugFields = document.getElementsByTagName('fields')[0];

document.onmousemove = (event) => { lastEvent = event; mousePos = getMousePos() };
canvas.onmousedown = (event) => {
    mouseDown = event.which; mousePos = convertMousePos(lastEvent = event)
};
document.onmouseup = (event) => { mouseDown = 0 };
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
    if (buttonIsOn(line.button)) {
        line.update();
        intersection.update();
    }
    if (buttonIsOn(ball.ballGo)) ball.update();
    circle.update()

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
// touch

touch = {
    start: { x: NaN, y: NaN },
    end: { x: NaN, y: NaN },
}

canvas.addEventListener('touchstart', (e) => {
    let { clientX, clientY } = e.changedTouches[0];
    circle.prevOrigin = {...circle.origin}
    touch.end = touch.start = { x: clientX, y: clientY }
})

canvas.addEventListener('touchend', (e) => {
    touch.end = touch.start = { x: NaN, y: NaN }
})

canvas.addEventListener('touchmove', (e) => {
    let { clientX: x, clientY: y } = e.changedTouches[0];
    circle.origin = addVec(circle.prevOrigin, subVec({x, y}, touch.start))
})

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

const circle = new Figure();
circle.origin = {x: 400, y: 300}
circle.radius = 200
circle.prevOrigin = null

circle.update = function() {
    if (mouseDown === 1) {
        if (!selected) {
            selected = { figure: this }
            this.prevOrigin = {...this.origin}
            this.moveStart = getMousePos()
        } else if (selected.figure !== this) {
            return
        }
        this.origin = addVec(this.prevOrigin, subVec(getMousePos(), this.moveStart))
    } else {
        if (selected && selected.figure === this)
            selected = null
    }
}

circle.draw = function() {
    ctx.beginPath();
    ctx.arc(this.origin.x, this.origin.y, this.radius, 0, 2 * Math.PI);
    this.stroke();
}

////////////////////////////////////////////////////////////////////////////////
// line

const line = new Figure('line');
line.button.onclick = () => {
    toggleButton(line.button)
    if (buttonIsOn(line.button)) {
        debugFields.style.display = ''
    } else {
        debugFields.style.display = 'none'
    }
}
debugFields.style.display = 'none'
line.start = {x: 320, y: 300}
line.end = {x: 500, y: 400}
line.lineDash = [3, 3];
line.regularFillStyle = { byIndex: (i) => i == 0 ? 'green' : 'yellow' }
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
ball.pos = ball.orginPos = { x: circle.origin.x - 10, y: circle.origin.y + 30 }
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
ball.respawnBall = addButton('respawn ball', () => ball.respawn())
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
ball.ballTrail = addButton('ball trail', () => toggleButton(ball.ballTrail))
ball.tick = addButton('tick', () => { ball.update() })
ball.adjust = null;
ball.velValInput = document.getElementById("velVal")
ball.velValInput.value = ball.velVal
ball.velValInput.onchange = () => ball.velVal = eval(ball.velValInput.value)
ball.debug = {}
ball.trail = []
ball.trailLength = 1000
ball.currTrailIdx = 0

ball.simulate = function() {
    let curPos = this.pos
    if (distance(curPos, circle.origin) + this.radius > circle.radius) {
        let originToBall = subVec(curPos, circle.origin)
        let offsetDir = vecTimes(originToBall, 1/vecNorm(originToBall))
        curPos = addVec(circle.origin, vecTimes(offsetDir, circle.radius - this.radius))
        this.debug.jumpBack = curPos
    } else {
        this.debug.jumpBack = null
    }
    let newPos = addVec(curPos, this.vel);
    let dirVec = { start: curPos, end: newPos }
    defineLineProperties(dirVec)
    this.debug.dirVec = dirVec
    if (distance(newPos, circle.origin) + this.radius > circle.radius) {
        // TODO
        let a = sqr(dirVec.k) + 1;
        let b = 2 * (dirVec.k * (dirVec.b - circle.origin.y) - circle.origin.x);
        let c = sqr(circle.origin.x) + sqr(dirVec.b - circle.origin.y) - sqr(circle.radius - this.radius);
        let x0 = (-b - sqrt(sqr(b) - 4 * a * c)) / 2 / a;
        let x1 = (-b + sqrt(sqr(b) - 4 * a * c)) / 2 / a;
        let y0 = dirVec.k * x0 + dirVec.b
        let y1 = dirVec.k * x1 + dirVec.b
        let adjust = null;
        if (Math.abs(newPos.x - x0) < Math.abs(newPos.x - x1)) {
            adjust = { x: x0, y: y0 }
        } else if (curPos.x != newPos.x) {
            adjust = { x: x1, y: y1 }
        } else {
            // sqr(x - circle.origin.x) + sqr(y - circle.origin.y) == sqr(circle.radius)
            let b = - 2 * circle.origin.y;
            let c = sqr(circle.origin.y) + sqr(curPos.x - circle.origin.x) - sqr(circle.radius);
            y0 = (-b - sqrt(sqr(b) - 4 * c)) / 2;
            y1 = (-b + sqrt(sqr(b) - 4 * c)) / 2;
            this.debug.reflect.y0 = y0
            this.debug.reflect.y1 = y1
            if (Math.abs(newPos.y - y0) < Math.abs(newPos.y - y1)) {
                adjust = { x: curPos.x, y: y0 }
            } else {
                adjust = { x: curPos.x, y: y1 }
            }
        }
        let radiusAngle = lineAngle({ start: circle.origin, end: adjust })
        let reflectAngle = 2 * radiusAngle - lineAngle(dirVec) - Math.PI
        let reflectLength = segmentLength(dirVec) - distance(curPos, adjust)
        let reflect = {
            x: adjust.x + Math.cos(reflectAngle) * reflectLength,
            y: adjust.y + Math.sin(reflectAngle) * reflectLength
        }
        if (!this.debug.reflectIsNaN && !isFinite(reflect.x)) {
            let debug = { a, b, c, x0, x1, x0Err, x1Err, y0, y1, dirVec }
            debug.originToBall = subVec(dirVec.start, circle.origin)
            let offsetLen = vecNorm(debug.originToBall) - this.radius - circle.radius
            let offsetDir = vecTimes(debug.originToBall, 1/vecNorm(debug.originToBall))
            debug.adjust = subVec(dirVec.start, vecTimes(offsetDir, offsetLen))
            this.debug.reflectIsNaN = debug
        }
        this.debug.reflect = { a, b, c, v0: {x:x0, y:y0}, v1: {x:x1, y:y1}, adjust, radiusAngle, reflectAngle, reflect }
        return { pos: reflect, velAngle: reflectAngle }
    } else {
        this.debug.reflect = null
        return { pos: newPos, velAngle: this.velAngle }
    }
}

ball.update = function() {
    if (buttonIsOn(this.ballTrail)) {
        this.trail[this.currTrailIdx] = {...this.pos}
        if (++this.currTrailIdx == this.trailLength) {
            this.currTrailIdx = 0
        }
    } else {
        this.trail.length = 0
        this.currTrailIdx = 0
    }
    let next = this.simulate()
    this.pos = next.pos
    this.velAngle = next.velAngle
}

ball.updateMove = function() {

}

ball.respawn = function() {
    let angle = Math.random() * Math.PI * 2
    let radius = Math.random() * (circle.radius - this.radius)
    this.pos = {
        x: circle.origin.x + radius * Math.cos(angle),
        y: circle.origin.y + radius * Math.sin(angle),
    }
    this.velAngle = angle + Math.PI / 6
}
ball.respawn()

ball.draw = function() {
    if (buttonIsOn(this.ballTrail) && this.trail.length > 0) {
        ctx.beginPath()
        let start = this.currTrailIdx
        if (start >= this.trail.length) start = 0
        ctx.moveTo(this.trail[start].x, this.trail[start].y)
        for (let i = start + 1; i < this.trail.length; i++) {
            let {x, y} = this.trail[i];
            ctx.lineTo(x, y);
        }
        for (let i = 0; i < start; i++) {
            let {x, y} = this.trail[i];
            ctx.lineTo(x, y);
        }
        stroke({ strokeStyle: '#666666' });
        // ctx.beginPath()
        // ctx.arc(this.trail[start].x, this.trail[start].y, 2, 0, 2 * Math.PI)
        // stroke({ strokeStyle: 'blue' });
    }
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
    stroke(this);
    if (!buttonIsOn(ball.ballGo)) {
        let next = this.simulate()
        strokeBall(next.pos, this.radius, '#808080')
        if (this.debug.jumpBack) {
            strokeBall(this.debug.jumpBack, this.radius, 'green')
        }
    }
    if (this.debug.reflectIsNaN) {
        let debug = this.debug.reflectIsNaN
        strokeBall(debug.dirVec.start, this.radius, 'blue')
        strokeBall(debug.dirVec.end, this.radius, 'yellow')
        if (debug.adjust)
            strokeBall(debug.adjust, this.radius, 'red')
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
    if ((line.start.x - x0) * (line.start.x - line.end.x) > 0) {
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
        if ((line.start.y - y0) * (line.start.y - line.end.y) > 0) {
            this.point = { x: line.start.x, y: y0 }
        } else {
            this.point = { x: line.start.x, y: y1 }
        }
    }
    this.radius.start = circle.origin;
    this.radius.end = this.point;
    let radiusAngle = lineAngle(this.radius);
    let lineAngl = lineAngle(line);
    this.reflectionAngle = 2 * radiusAngle - lineAngl - Math.PI;
    debugSetFloat2(this.display.lineAngle, 180 * lineAngl / Math.PI)
    debugSetFloat2(this.display.radAngle, 180 * radiusAngle / Math.PI)
    debugSetFloat2(this.display.reflAngle, 180 * this.reflectionAngle / Math.PI)
    debugSetFloat2(this.display.lineK, line.k)
    debugSetFloat2(this.display.radK, this.radius.k)
    debugSetFloat2(this.display.reflK, Math.tan(this.reflectionAngle))
    this.reflectionLength = distance(line.start, line.end) - distance(line.start, this.point);
    this.reflectionPoint = {
        x: this.point.x + Math.cos(this.reflectionAngle) * this.reflectionLength,
        y: this.point.y + Math.sin(this.reflectionAngle) * this.reflectionLength,
    }
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

        drawPoint(this.reflectionPoint, 5, 'blue')
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
    debugFields.appendChild(field);
    return field
}

function debugSetFloat2(field, float) {
    field.innerHTML = field.id + ': ' + float2(float)
}

function float2(float) {
    return Math.floor(float * 100) / 100
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
// window size

resizeCanvas(canvas)
window.onresize = () => resizeCanvas(canvas)
window.onload = () => resizeCanvas(canvas)

function resizeCanvas(canvas) {
    let { top } = canvas.getBoundingClientRect()
    let margin = window.getComputedStyle(body).margin
    margin = margin.substr(0, margin.length - 2)
    canvas.width = window.innerWidth - margin * 2
    canvas.height = window.innerHeight - top - margin
    circle.origin = {
        x: canvas.width / 2,
        y: canvas.height / 2,
    }
}

////////////////////////////////////////////////////////////////////////////////
// util

function sqr(x) { return Math.pow(x, 2) }
function sqrt(x) { return Math.pow(x, 1/2) }

function addVec(a, b) {
    return { x: a.x + b.x, y: a.y + b.y }
}

function subVec(a, b) { return { x: a.x - b.x, y: a.y - b.y } }

function distance(a, b) {
    return sqrt(sqr(a.x - b.x) + sqr(a.y - b.y))
}

function vecNorm({x, y}) { return distance({x, y}, {x: 0, y: 0}) }

function segmentLength({ start, end }) {
    return distance(start, end)
}

function vecTimes({x, y}, v) {
    return {x: x * v, y: y * v}
}

function lineK({ start, end }) {
    return (end.y - start.y) / (end.x - start.x)
}

function lineAngle({ start, end }) {
    return Math.atan2(end.y - start.y, end.x - start.x)
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
    return convertMousePos(lastEvent)
}

function convertMousePos({clientX, clientY}) {
    let { x: canvasX, y: canvasY } = canvas.getBoundingClientRect();
    return { x: clientX - canvasX, y: clientY - canvasY }
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

function strokeBall({x, y}, r, style) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    stroke({strokeStyle: style})
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

function drawLineSegment(obj) {
    ctx.beginPath();
    ctx.moveTo(obj.start.x, obj.start.y);
    ctx.lineTo(obj.end.x, obj.end.y);
    stroke(obj);
}

function stroke(obj) {
    ctx.strokeStyle = obj.strokeStyle || '#000000';
    ctx.setLineDash(obj.lineDash || []);
    ctx.stroke();
}
