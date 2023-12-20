// the sound file
const audioFile = "assets/Kalte_Ohren_(_Remix_).mp3";
// the sound source
let sound;
// the Meyda analyzer
let analyzer;
// used as a flag to indicate if there is data available for visualization
let lastFeatures;

// the background color
let backgroundColor = 255;
let speechRecognizer;

function preload() {
    // load the sound
    soundFormats("wav", "mp3")
    sound = loadSound(audioFile);
    console.log("Sound loaded.")
}


// visual elements
let dancingCircles;
let powerSpectrumCircles = [];
let changingSquares;

function setup() {
    createCanvas(800, 450);

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

    // initialize the visual elements
    dancingCircles = new DancingCircles();
    powerSpectrumCircles = [
        // the outter circle
        new PowerSpectrumCircle(100, 1.0),
        // the inner circle
        new PowerSpectrumCircle(300, -1.0)
    ];
    changingSquares = new ChangingSquares(10);
}

function draw() {
    // clear the canvas for the current frame
    background(backgroundColor);
    // only continue if there are data to render
    if (!lastFeatures) return;

    // draw the dancing balls as the background
    dancingCircles.draw();

    // draw the two power spectrum circles 
    for (let i = 0; i < powerSpectrumCircles.length; i++) {
        powerSpectrumCircles[i].draw();
    }


    // draw the spectrum as rotating squares at the bottom of the screen
    changingSquares.draw();
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
        dancingCircles.speedBase += 1.0;
    }
    else if (word.indexOf('slower') != -1 && lastCommand != 'slower') {
        lastCommand = 'slower';
        dancingCircles.speedBase -= 1.0;
    }
}


function mousePressed() {
    if (sound.isPlaying()) return;
    sound.play();
}

function onAnalyze(features) {
    lastFeatures = features;
    // update the dancing circles
    dancingCircles.update(features);
    // update the power spectrum circles
    powerSpectrumCircles.forEach((p) => p.update(features));
    // update the changing squares
    changingSquares.update(features);
}