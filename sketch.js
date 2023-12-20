const audioFile = "assets/Kalte_Ohren_(_Remix_).mp3";
let canvas;
let sound;
let analyzer;

let lastFeatures;
let maxValue = 0;

let numOfRects = 10;
let backgroundColor = 255;

let speedBase = 1.0;

class MovingAverage {
    constructor(size) {
        this.size = size;
        this.queue = Array(size);
        this.queue.fill(0, 0, size);
    }

    next(val) {
        if (this.queue.length >= this.size) {
            this.queue.shift();
        }
        this.queue.push(val);
        return this.queue.reduce((a, b) => a + b) / this.queue.length;
    }
}

let spreadSmooth = new MovingAverage(10);
let centroidSmooth = new MovingAverage(5);

let dancingAngle = 0;

function preload() {
    soundFormats("wav", "mp3")
    sound = loadSound(audioFile);
    console.log("Sound loaded.")
}

let buffer;
let speechRecognizer;

function setup() {
    canvas = createCanvas(800, 450);
    buffer = createGraphics(800, 450);

    // initialize the speed recognizer
    speechRecognizer = new p5.SpeechRec("en-US", onSpeech);
    speechRecognizer.continuous = true;
    speechRecognizer.interimResults = true;
    speechRecognizer.start()

    // the Meyda analyzer
    analyzer = Meyda.createMeydaAnalyzer({
        audioContext: getAudioContext(),
        source: sound,
        bufferSize: 512,
        featureExtractors: ["powerSpectrum", "rms", "amplitudeSpectrum", "spectralCentroid", "loudness", "perceptualSpread"],
        callback: onAnalyze,
    });
    analyzer.start();
    dancingAngle = 0;
}

function draw() {
    // clear the canvas for the current frame
    background(backgroundColor);
    // only continue if there are data to render
    if (!lastFeatures) return;

    // draw the dancing balls as the background
    drawDancingBalls();

    // draw the two circles
    drawBackgroundCircle(100, 1.0);
    drawBackgroundCircle(300, -1.0);

    // draw the spectrum as rotating squares at the bottom of the screen
    drawSquares();
}

let lastCommand = "";
function onSpeech() {
    // filter the result and look for commands
    let word = speechRecognizer.resultString.split(' ').pop().toLowerCase();

    if (word.indexOf('white') != -1 && lastCommand != 'white') {
        lastCommand = 'white';
        backgroundColor = 255;
    }
    else if (word.indexOf('black') != -1 && lastCommand != 'black') {
        lastCommand = 'black';
        backgroundColor = 0;
    }
    else if (word.indexOf('faster') != -1 && lastCommand != 'faster') {
        lastCommand = 'faster';
        speedBase += 1.0;
    }
    else if (word.indexOf('slower') != -1 && lastCommand != 'slower') {
        lastCommand = 'slower';
        speedBase -= 1.0;
    }
}


function drawSquares() {
    push();
    fill('white');
    noStroke();
    let spectrum = lastFeatures['amplitudeSpectrum']
    translate(0, height - 30);
    drawSpectrum(spectrum, width / 2, 0);
    // draw the vertical mirror
    translate(width, 0);
    rotate(PI);
    drawSpectrum(spectrum, width / 2, 0);
    pop();
}


function drawDancingBalls() {
    /// rescle the previous frame with opacity as the new background
    buffer.push();
    buffer.blendMode(BLEND);
    buffer.tint(255);
    buffer.image(buffer, -10, -5, width + 20, height + 10);
    buffer.fill(backgroundColor, 10);
    buffer.noStroke();
    buffer.rect(0, 0, width, height);

    // draw the dancing balls
    buffer.push();
    let ballDistance = map(centroidSmooth.next(lastFeatures['spectralCentroid']), 0, 250, 10, width * 0.75);
    buffer.noFill();
    buffer.strokeWeight(constrain(lastFeatures["loudness"].total / 10, 1, 10));
    buffer.translate(width / 2, height / 2);
    let rotationSpeed = map(spreadSmooth.next(lastFeatures['perceptualSpread']), 0.75, 0.9, -0.1, 0.01);
    rotationSpeed *= speedBase;
    if (isNaN(dancingAngle)) dancingAngle = 0;
    dancingAngle += 0.01 + rotationSpeed;
    buffer.rotate(PI * dancingAngle);
    let radius = constrain(lastFeatures['rms'] * 500, 100, 300);
    buffer.blendMode(BLEND);
    buffer.stroke("red");
    buffer.circle(-ballDistance, 0, radius);
    buffer.stroke("blue");
    buffer.circle(ballDistance, 0, radius);
    buffer.pop();
    buffer.pop();

    // copy the buffer to the canvas
    noStroke();
    image(buffer, 0, 0, width, height);
}

function drawBackgroundCircle(radius, rotationSpeed) {
    push();
    noFill();
    stroke(200);
    translate(width / 2, height / 2);
    // basic rotation
    rotate(PI * 0.5);
    // slowly rotate
    rotate(PI * 0.001 * frameCount * rotationSpeed);
    // draw the circle
    // circle(0, 0, radius);
    // draw the spectrum around the half of the circle
    let spectrum = lastFeatures['powerSpectrum']
    for (let i = 0; i < spectrum.length; i++) {
        push();
        fill('grey')
        // rotate and draw a rect
        rotate(map(i, 0, spectrum.length, 0, PI));
        let h = map(Math.sqrt(spectrum[i]), 0, 10, 0, radius);
        let w = radius * PI / spectrum.length;
        rect(0, radius, w, h);
        // the other half
        rotate(PI);
        rect(0, radius, w, h);
        pop();
    }
    pop();
}

function drawSpectrum(spectrum, width, height) {
    push();
    fill('red');
    rectMode(CENTER);

    // divide the horizontal space to the squares and calculetethe actual side of the squares base on the max space they could occupied 
    let squareWidth = (width / (numOfRects + 1)) / 1.41421;
    // group the spectums into the squares
    let amplitudes = segmentByRects(spectrum);
    // calculate the average
    amplitudes = amplitudes.map((b) => jStat.sum(b) / b.length);
    // resacle
    amplitudes = amplitudes.map(Math.log);
    // normalize
    let maxValue = max(amplitudes);
    let minValue = min(amplitudes);
    amplitudes = amplitudes.map((v) => (v - minValue) / (maxValue - minValue));

    // draw the squares, the amplitude of the square determines the size and rotation angle
    for (let i = 0; i < numOfRects; i++) {
        let x = i * width / numOfRects + squareWidth / 2;
        // the rotation angle is based on the amplitude
        let angle = map(amplitudes[i], 0, 1, 0, PI);
        // the fill color is picked from dark red to bright oringe by the amplitude too
        let fillColor = lerpColor(color('red'), color('yellow'), amplitudes[i]);
        // the size of the square
        let squareSize = max(1.0, squareWidth * amplitudes[i] * lastFeatures['loudness'].total / 25);

        push();
        fill(fillColor);
        translate(x, height);
        rotate(angle);
        rect(0, 0, squareSize, squareSize);
        pop();
    }
    pop();
}

function average(arrays) {
    let result = [];
    for (let i = 0; i < arrays.length; i++) {
        result.push(sum(arrays[i]) / arrays[i].length);
    }
    return result;
}

function segmentByRects(spectrum) {
    // initialize the array for the result
    let result = [];
    for (let i = 0; i < numOfRects; i++) {
        result.push([]);
    }

    // go over the spectrum and add the values to the corresponding segmentation
    for (let i = 0; i < spectrum.length; i++) {
        let segment = Math.floor(i / (spectrum.length / numOfRects));
        result[segment].push(spectrum[i]);
    }

    return result;
}

function mousePressed() {
    if (sound.isPlaying()) return;
    sound.play();
}

function onAnalyze(features) {
    lastFeatures = features;
}