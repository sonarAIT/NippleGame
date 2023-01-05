import { EmitWaiter } from "./util.js";
import { CountDown } from "./game/countdown.js";

export class GameScreenDrawer {
    constructor(canvas) {
        this.canvas = canvas;
    }

    drawImage(ctx, image) {
        const height = this.canvas.height;
        const width = image.width * (height / image.height);
        const x = (this.canvas.width - width) / 2;
        ctx.drawImage(image, x, 0, width, height);
    }

    drawTime(ctx, time) {
        ctx.fillStyle = "black";
        ctx.font = "48px serif";

        const ms = Math.floor(time * 100) % 100;
        const ss = Math.floor(time) % 60;
        const mm = Math.floor(time / 60);

        const msText = ms < 10 ? `0${ms}` : `${ms}`;
        const ssText = ss < 10 ? `0${ss}` : `${ss}`;
        const mmText = mm < 10 ? `0${mm}` : `${mm}`;
        const timeText = `${mmText}:${ssText}:${msText}`;

        ctx.fillText(timeText, 10, 50);
    }

    draw(data) {
        // draw image
        this.drawImage(data.context, data.image);
        // draw time
        this.drawTime(data.context, data.time);
    }
}

function EaseOutQuart(t) {
    return Math.pow(1 - t, 4);
}

function EaseOutSine(t) {
    return Math.sin((t * Math.PI) / 2);
}

const Tolerance = 30;
const GoodWords = ["GREAT!", "HAPPY!", "WONDERUL!", "COOL!"];

class NippleStarEffect {
    constructor(point) {
        this.point = point;
        this.isEnd = false;
        this.time = 0;
    }

    update(deltaTime) {
        this.time += deltaTime;
        if (this.time > 1) {
            this.isEnd = true;
        }
    }

    draw(ctx) {
        const transparency = 1 - EaseOutSine(this.time);
        const scale = 4 - EaseOutQuart(this.time) * 4;
        const angle = EaseOutQuart(this.time) * 180;

        ctx.fillStyle = `rgba(255, 255, 0, ${transparency})`;
        ctx.font = "100px serif";
        const textWidth = ctx.measureText("★").width;
        const textHeight = 70;

        ctx.translate(this.point.x, this.point.y);
        ctx.scale(scale, scale);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.fillText("★", -textWidth / 2, textHeight / 2);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}

class ZoomTextEffect {
    constructor(canvas, text) {
        this.text = text;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        this.isEnd = false;
        this.time = 0;
        this.magnification = 0.75;
    }

    update(deltaTime) {
        this.time += deltaTime;
        if (this.time * this.magnification > 1) {
            this.isEnd = true;
        }
    }

    draw(ctx) {
        const transparency = 1 - EaseOutSine(this.time * this.magnification);
        const scale = 4 - EaseOutQuart(this.time * this.magnification) * 4;

        ctx.fillStyle = `rgba(255, 0, 0, ${transparency})`;
        ctx.font = "100px serif";
        const textWidth = ctx.measureText(this.text).width;
        const textHeight = 70;

        ctx.translate(this.canvasWidth / 2, this.canvasHeight / 2);
        ctx.scale(scale, scale);
        ctx.fillText(this.text, -textWidth / 2, textHeight / 2);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}

class OKEffect {
    constructor() {
        this.isEnd = false;
        this.time = 0;
        this.text = GoodWords[Math.floor(Math.random() * GoodWords.length)];
        this.point = { x:600, y: 400 };
    }

    update(deltaTime) {
        this.time += deltaTime;
        if (this.time > 1) {
            this.isEnd = true;
        }
    }

    draw(ctx) {
        const transparency = 1 - EaseOutSine(this.time);
        const y = this.point.y + EaseOutQuart(this.time) * 50;

        ctx.fillStyle = `rgba(255, 0, 0, ${transparency})`;
        ctx.font = "50px serif";
        const textWidth = ctx.measureText(this.text).width;
        const textHeight = 70;

        ctx.fillText(this.text, this.point.x - textWidth / 2, y + textHeight / 2);
    }
}

class GameMainDrawer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gameScreenDrawer = new GameScreenDrawer(canvas);
    }

    drawNipple(ctx, nipple) {
        if (!nipple.isClicked) {
            return;
        }

        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(nipple.X, nipple.Y, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    drawEffects(ctx, effects) {
        effects.forEach((effect) => {
            effect.draw(ctx);
        });
    }

    draw(propsData) {
        const context = this.canvas.getCtx();
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const data = {
            context: context,
            image: propsData.image,
            time: propsData.time,
        };
        this.gameScreenDrawer.draw(data);
        this.drawNipple(context, propsData.leftNipple);
        this.drawNipple(context, propsData.rightNipple);
        this.drawEffects(context, propsData.effects);
    }
}

class GameMain {
    constructor(canvas, nipples, images) {
        this.canvas = canvas;
        this.nipples = nipples;
        this.images = images;

        this.drawer = new GameMainDrawer(canvas);
        this.emitWaiter = new EmitWaiter();

        this.mouseClickEvent = null;
        this.prevTime = 0;

        this.effects = [];
        this.nowTime = 0;
        this.nowQuestion = 0;
        this.isLeftNippleClicked = false;
        this.isRightNippleClicked = false;

        this.mouseClickEventListener = (e) => {
            this.mouseClickEvent = e;
        };
        canvas
            .getCanvas()
            .addEventListener("click", this.mouseClickEventListener);
    }

    async run() {
        this.prevTime = Date.now();

        this.effects.push(new ZoomTextEffect(this.canvas, "GO!"));
        const gameInterval = setInterval(() => {
            this.update();
        }, 1000 / 60);
        await this.emitWaiter.wait();
        clearInterval(gameInterval);

        this.effects.push(new ZoomTextEffect(this.canvas, "CLEAR!"));
        const afterClearInterval = setInterval(() => {
            this.afterClearUpdate();
        }, 1000 / 60);
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 3000);
        });
        clearInterval(afterClearInterval);

        this.destroy();
    }

    checkNippleClicked(e) {
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;
        const nipple = this.nipples[this.nowQuestion];

        if (
            mouseX >= nipple.leftNippleX - Tolerance / 2 &&
            mouseX <= nipple.leftNippleX + Tolerance / 2 &&
            mouseY >= nipple.leftNippleY - Tolerance / 2 &&
            mouseY <= nipple.leftNippleY + Tolerance / 2 &&
            !this.isLeftNippleClicked
        ) {
            this.isLeftNippleClicked = true;
            this.effects.push(
                new NippleStarEffect({
                    x: nipple.leftNippleX,
                    y: nipple.leftNippleY,
                })
            );
            return;
        }

        if (
            mouseX >= nipple.rightNippleX - Tolerance / 2 &&
            mouseX <= nipple.rightNippleX + Tolerance / 2 &&
            mouseY >= nipple.rightNippleY - Tolerance / 2 &&
            mouseY <= nipple.rightNippleY + Tolerance / 2 &&
            !this.isRightNippleClicked
        ) {
            this.isRightNippleClicked = true;
            this.effects.push(
                new NippleStarEffect({
                    x: nipple.rightNippleX,
                    y: nipple.rightNippleY,
                })
            );
        }
    }

    update() {
        const now = Date.now();
        const deltaTime = (now - this.prevTime) / 1000;

        if (this.isLeftNippleClicked && this.isRightNippleClicked) {
            this.nowQuestion++;
            if (this.nowQuestion >= this.images.length) {
                this.emitWaiter.emit();
                return;
            }

            this.isLeftNippleClicked = false;
            this.isRightNippleClicked = false;
            this.effects.push(new OKEffect());
        }

        this.nowTime += deltaTime;

        if (this.mouseClickEvent) {
            this.checkNippleClicked(this.mouseClickEvent);
            this.mouseClickEvent = null;
        }

        this.effects.forEach((effect) => {
            effect.update(deltaTime);
        });

        this.effects = this.effects.filter((effect) => {
            return !effect.isEnd;
        });

        this.prevTime = now;

        const data = {
            image: this.images[this.nowQuestion],
            time: this.nowTime,
            effects: this.effects,
            leftNipple: {
                isClicked: this.isLeftNippleClicked,
                X: this.nipples[this.nowQuestion].leftNippleX,
                Y: this.nipples[this.nowQuestion].leftNippleY,
            },
            rightNipple: {
                isClicked: this.isRightNippleClicked,
                X: this.nipples[this.nowQuestion].rightNippleX,
                Y: this.nipples[this.nowQuestion].rightNippleY,
            },
        };
        this.drawer.draw(data);
    }

    afterClearUpdate() {
        const now = Date.now();
        const deltaTime = (now - this.prevTime) / 1000;

        this.effects.forEach((effect) => {
            effect.update(deltaTime);
        });

        this.effects = this.effects.filter((effect) => {
            return !effect.isEnd;
        });

        this.prevTime = now;

        const lastQuestion = this.images.length - 1;
        const data = {
            image: this.images[lastQuestion],
            time: this.nowTime,
            effects: this.effects,
            leftNipple: {
                isClicked: this.isLeftNippleClicked,
                X: this.nipples[lastQuestion].leftNippleX,
                Y: this.nipples[lastQuestion].leftNippleY,
            },
            rightNipple: {
                isClicked: this.isRightNippleClicked,
                X: this.nipples[lastQuestion].rightNippleX,
                Y: this.nipples[lastQuestion].rightNippleY,
            },
        };
        this.drawer.draw(data);
    }

    destroy() {
        this.canvas
            .getCanvas()
            .removeEventListener("click", this.mouseClickEventListener);
    }
}

export class Game {
    constructor(canvas, nipples) {
        this.canvas = canvas;
        this.nipples = nipples;
        this.images = [];
        nipples.forEach((element) => {
            const image = new Image();
            image.src = element.path;
            this.images.push(image);
        });
        this.emitWaiter = new EmitWaiter();
    }

    async run() {
        // countdown
        const countDown = new CountDown(this.canvas, this.images[0]);
        // await countDown.run();
        // run game
        const gameMain = new GameMain(this.canvas, this.nipples, this.images);
        await gameMain.run();
        // show score
    }
}
