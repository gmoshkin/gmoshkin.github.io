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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    path.draw();
    circle.draw();
    line.draw();
    intersection.draw();
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
defineLineProperties(line);

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

function defineLineProperties(line) {
    Object.defineProperty(line, 'start', { get() {
        return this.points[0].x < this.points[1].x ? this.points[0] : this.points[1]
    } })
    Object.defineProperty(line, 'end', { get() {
        return this.points[0].x < this.points[1].x ? this.points[1] : this.points[0]
    } })
    Object.defineProperty(line, 'k', { get() {
        return (this.end.y - this.start.y) / (this.end.x - this.start.x)
    } })
    Object.defineProperty(line, 'b', { get() {
        return this.start.y - this.start.x * this.k
    } })

    line.drawLine = function() {
        if (this.points.length == 2) {
            ctx.beginPath();
            ctx.moveTo(0, this.b);
            ctx.lineTo(canvas.width, this.k * canvas.width + this.b);
            this.stroke();
        }
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
defineLineProperties(intersection.radius);

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
        ctx.strokeStyle = this.strokeStyle;
        ctx.setLineDash(this.lineDash || []);
        ctx.stroke();
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

const sqr = (x) => Math.pow(x, 2);
const sqrt = (x) => Math.pow(x, 1/2);

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
