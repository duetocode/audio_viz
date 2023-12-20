/// Moving average and the this.buffer
class MovingAverage {
    /// initialize the queue with the given this.buffer size
    constructor(size) {
        this.size = size;
        // array as the queue
        this.queue = Array(size);
        // initialize the this.buffer with zeros
        this.queue.fill(0, 0, size);
    }

    /// update the queue and return the average
    update(val) {
        // discard Nan values
        if (isNaN(val)) return;

        // dequeue and enqueue
        this.queue.shift();
        this.queue.push(val);

        // return the average
        return jStat.sum(this.queue) / this.queue.length;
    }
}

/// the two dancing circles
class DancingCircles {

    /// intialize the visualization with default values
    constructor() {
        // drawing variables
        this.ballDistance = 100;
        this.dancingAngle = 0;
        this.radius = 100;
        this.storkWeight = 1;

        // basic variables that will be used for the calculation of the drawing variables
        this.speedBase = 1.0;
        this.spreadSmooth = new MovingAverage(10);
        this.centroidSmooth = new MovingAverage(7);
        this.rotation = 0.0

        // create the off-screen this.buffer
        this.buffer = createGraphics(800, 450);
    }

    /// update the visualization with the Meyda features
    update(features) {
        // the distance between the two circles
        this.ballDistance = map(this.centroidSmooth.update(features['spectralCentroid']), 0, 250, 10, width * 0.75);

        // the rotation angle
        let rotationSpeed = map(this.spreadSmooth.update(features['perceptualSpread']), 0.75, 0.9, -0.1, 0.02);
        rotationSpeed *= this.speedBase;
        // fix the Nan problem
        this.rotation = isNaN(this.rotation) ? 0 : this.rotation;
        this.rotation += 0.01 + rotationSpeed;

        // the this.radius (size) of the two circles
        this.radius = constrain(features['rms'] * 500, 100, 300);

        // the stroke weight
        this.strokeWeight = constrain(features["loudness"].total / 5, 1, 15);
    }

    /// draw the visualization to the default canvas.
    /// the code draws the visualization on its own graphics and copy the result to the default canvas
    draw() {
        // the background with the flowing effect
        this.buffer.push();
        // scale and fade the previous frame to create the flowing effect
        this.buffer.blendMode(BLEND);
        this.buffer.tint(255);
        this.buffer.image(this.buffer, -10, -5, width + 20, height + 10);
        // overlay the background color
        this.buffer.fill(backgroundColor, 10);
        this.buffer.noStroke();
        this.buffer.rect(0, 0, width, height);
        this.buffer.pop();

        // draw the dancing circles
        this.buffer.push();
        this.buffer.noFill();
        this.buffer.strokeWeight(this.strokeWeight);
        this.buffer.translate(width / 2, height / 2);
        this.buffer.rotate(this.rotation);
        this.buffer.blendMode(BLEND);
        // the red circle
        this.buffer.stroke("red");
        this.buffer.circle(-this.ballDistance, 0, this.radius);
        // and the blue on the other side
        this.buffer.stroke("blue");
        this.buffer.circle(this.ballDistance, 0, this.radius);
        this.buffer.pop();

        // copy the this.buffer to the canvas
        push();
        noStroke();
        image(this.buffer, 0, 0, width, height);
        pop();

        // redraw the core of the two circles
        push();
        noFill();
        strokeWeight(2);
        stroke('white');
        translate(width / 2, height / 2);
        rotate(this.rotation);
        circle(-this.ballDistance, 0, this.radius);
        circle(this.ballDistance, 0, this.radius);
        pop();
    }
}

/// the power spectrum on the surface of a circle
class PowerSpectrumCircle {
    /// initialize the visualization 
    constructor(radius, rotationSpeed) {
        this.radius = radius;
        this.rotationSpeed = rotationSpeed;
        this.lastSpectrum = null;
    }

    /// update the spectrum with data from Meyda. This function expects the `powerSpectrum` feature
    update(features) {
        this.lastSpectrum = features['powerSpectrum'];
        this.lastSpectrum = this.lastSpectrum.slice(0, this.lastSpectrum.length / 2);
    }

    /// draw the spectrum on the default canvas with the lastest data
    draw() {
        push();
        stroke('grey');
        noFill();
        translate(width / 2, height / 2);
        // the base circle
        circle(0, 0, this.radius * 2);
        // basic rotation
        rotate(PI * 0.5);
        // slowly rotate based on the frameCount
        rotate(PI * 0.001 * frameCount * this.rotationSpeed);
        // draw the spectrum around the half of the circle
        fill('grey');
        noStroke();
        let spectrum = this.lastSpectrum;
        for (let i = 0; i < spectrum.length; i++) {
            push();
            // rotate for the current position
            rotate(map(i, 0, spectrum.length, 0, PI));
            // the height is the square root of the value to reduce the difference between the high and low values
            let h = map(Math.sqrt(spectrum[i], 4) * 2, 0, 10, 0, this.radius);
            // the width is the length of the corresponding arc
            let w = this.radius * PI / spectrum.length;
            // draw out the two mirrored rects
            rect(0, this.radius, w, h);
            rotate(PI);
            rect(0, this.radius, w, h);

            pop();
        }
        pop();
    }
}

/// The squares for the amplitude spectrum
class ChangingSquares {
    /// initialize the squares visualization
    constructor(numOfRects) {
        this.numOfRects = numOfRects;

        // initialize the normalized amplitude which will be used for the squares
        this.normalizedAmplitudes = Array(numOfRects);
        this.normalizedAmplitudes.fill(0.0, 0, numOfRects);
    }

    /// update with the Meyda features, this method expects the `amplitudeSpectrum` feature
    update(features) {
        let spectrum = features['amplitudeSpectrum'];
        spectrum = spectrum.slice(0, spectrum.length / 2);

        // group and averge the frequences by the number of the squares
        let amplitudes = [];
        let bucketSize = Math.floor(spectrum.length / this.numOfRects);
        for (let i = 0; i < this.normalizedAmplitudes.length; i++) {
            // mean
            let mean = jStat.mean(spectrum.slice(i * bucketSize, (i + 1) * bucketSize));
            // the log of the mean
            amplitudes.push(Math.log(mean));
        }

        // normalization
        let maxValue = max(amplitudes);
        let minValue = min(amplitudes);
        this.normalizedAmplitudes = amplitudes.map((v) => (v - minValue) / (maxValue - minValue));
    }

    /// draw the squares on the default canvas
    draw() {
        // the width of the sqaure is based on the gemotry of the screen
        // the spectrum ocupies the half of the screen and left the other half for its mirror image
        let boundWidth = width / 2;
        let squareWidth = (boundWidth / (this.normalizedAmplitudes.length + 1)) / 1.41421;

        push();
        rectMode(CENTER);
        // draw on the bottom of the screen
        translate(0, height - 30);

        // draw the squares, the amplitude of a square determines its size, color and rotation angle.
        for (let i = 0; i < this.normalizedAmplitudes.length; i++) {
            let x = i * boundWidth / this.normalizedAmplitudes.length + squareWidth / 2;
            // the rotation angle is based on the amplitude
            let angle = map(this.normalizedAmplitudes[i], 0, 1, 0, 2 * PI);
            // the fill color is picked from dark red to bright oringe by the amplitude too
            let fillColor = lerpColor(color('red'), color('yellow'), this.normalizedAmplitudes[i]);
            // the size of the square
            let squareSize = max(1.0, squareWidth * this.normalizedAmplitudes[i]);

            // draw the square and its mirror
            push();
            fill(fillColor);
            // the square
            push();
            translate(x, 0);
            rotate(angle);
            rect(0, 0, squareSize, squareSize);
            pop();
            // and its mirror
            push();
            translate(width - x, 0);
            rotate(angle);
            rect(0, 0, squareSize, squareSize);
            pop();
            pop();
        }
        pop();
    }
}