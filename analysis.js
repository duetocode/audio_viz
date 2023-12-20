const audio_files = ["assets/Ex2_sound1.wav", "assets/Ex2_sound2.wav", "assets/Ex2_sound3.wav", "assets/Kalte_Ohren_(_Remix_).mp3"];
let sources = [];
let analyzer;
let data = [];

let soundIndex = 3;
let features = {};

// get the features supported by the Meyda library
let featureExtractors = Object.getOwnPropertyNames(Meyda.featureExtractors);
// remove the spectraFlux as it does not work correctly from Meyda 5.0 onwards
featureExtractors.splice(featureExtractors.indexOf('spectralFlux'), 1);

let speechRecognizer;

function preload() {
    soundFormats("wav", "mp3")
    sources = audio_files.map(loadSound);
    console.log("Sound loaded.")
}

function setup() {
    createCanvas(800, 400);
    if (typeof Meyda === "undefined") {
        console.log("Meyda could not be found! Have you included it?");
    }
    else {
        analyzer = Meyda.createMeydaAnalyzer({
            audioContext: getAudioContext(),
            source: sources[soundIndex],
            bufferSize: 512,
            featureExtractors: featureExtractors,
            callback: onAnalyze,
        });
    }


}



function draw() {
    background(0);
    // draw the spectrum
    if (data.length > 0) {
        push();
        fill('white');
        noStroke();
        let spectrum = data[data.length - 1]['powerSpectrum']
        let binWidth = width / 128;
        for (let i = 0; i < spectrum.length; i++) {
            let x = i * binWidth;
            let h = map(spectrum[i], 0, 400, 0, height);
            fill(255);
            rect(x, height, binWidth, -h);
        }
        pop();
    }
}

function mousePressed() {
    data = [];
    analyzer.start();
    sources[soundIndex].onended(onPlaybackEnded);
    sources[soundIndex].play();
}


function onAnalyze(features) {
    data.push(features);
}

function onPlaybackEnded() {
    analyzer.stop();
    console.log("ended");

    // initialize the feature arrays
    for (let i = 0; i < featureExtractors.length; i++) {
        features[featureExtractors[i]] = [];
    }
    // group the data by the feature
    for (let i = 0; i < data.length; i++) {
        let record = data[i];
        for (let j = 0; j < featureExtractors.length; j++) {
            let feature = featureExtractors[j];
            features[feature].push(record[feature]);
        }
    }

    // preprocess for some structural data
    features['loudness'] = features['loudness'].map((e) => e['total']);

    // create line chart for each feature with chartjs
    Object.getOwnPropertyNames(features).forEach((f) => addChart(f, features[f]));
}

function addChart(name, featureData) {
    // ignore none-scalar data
    if (typeof featureData[0] !== "number") {
        return;
    }

    let minimum = jStat.min(featureData);
    let maximum = jStat.max(featureData);

    // create a line chart with chart.js
    let ctx = document.createElement('canvas');
    document.body.appendChild(ctx);
    let chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from(Array(featureData.length).keys()),
            datasets: [{
                label: name,
                data: featureData,
                backgroundColor: 'rgba(0, 0, 0, 0)',
                borderColor: 'rgb(255, 99, 132)',
                borderWidth: 1
            }]
        },
        options: {
            animation: false,
            scales: {
                yAxes: [{
                    ticks: {
                        min: minimum,
                        max: maximum
                    }
                }]
            }
        }
    });
}
