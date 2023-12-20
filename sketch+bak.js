const audio_files = ["assets/Ex2_sound1.wav", "assets/Ex2_sound2.wav", "assets/Ex2_sound3.wav"];

let sources = [];

let analyzer;

let data = [];

// get the features supported by the Meyda library
let featureExtractors = Object.getOwnPropertyNames(Meyda.featureExtractors);
// remove the spectraFlux as it does not work correctly from Meyda 5.0 onwards
featureExtractors.splice(featureExtractors.indexOf('spectralFlux'), 1);

let soundIndex = 2;

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
            bufferSize: 2048,
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
        let spectrum = data[data.length - 1]['amplitudeSpectrum']
        let binWidth = width / 256;
        for (let i = 0; i < spectrum.length; i++) {
            let x = i * binWidth;
            let h = map(spectrum[i], 0, 1, 0, height);
            fill(255);
            rect(x, height, binWidth, -h);
        }
        pop();
    }

    // draw the chroma
    push();

    pop();

    if (data.length > 0) {
        push();
        fill(255);
        circle(200, 200, data[data.length - 1]['loudness'].total * 10);
        circle(400, 200, data[data.length - 1]['zcr']);
        circle(600, 200, (data[data.length - 1]['perceptualSpread'] - 0.75) / (0.85 - 0.75) * 300);
        fill('red');
        // draw the centroid
        circle(map(data[data.length - 1]['spectralCentroid'], 0, 512, 0, width), height - 50, 10);
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

    // analyze the basic statistics of the data

    // 1. group the features into separate arrays
    // initialize the feature arrays
    let features = {};
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

    // 2. run basic statistics on the numerical features
    let featureStats = {};
    for (let i = 0; i < featureExtractors.length; i++) {
        let featureName = featureExtractors[i];
        let featureData = features[featureName];
        if (typeof featureData[0] !== "number") {
            continue;
        }
        // drop all Nan and Infinity data
        featureData = featureData.filter((e) => !isNaN(e) && e !== Infinity);

        // calculate the mean, std, min, max
        let min = jStat.min(featureData);
        let max = jStat.max(featureData);
        let mean = jStat.mean(featureData);
        let std = jStat.stdev(featureData);
        // normalize the std
        std = std / (max - min);

        console.log("Feature: " + featureName);
        console.log("\tMean: " + mean);
        console.log("\tStd: " + std);
        console.log("\tMin: " + min);
        console.log("\tMax: " + max);

        // save for comparison
        featureStats[featureName] = { mean, std, min, max };
    }

    // sort by stdev
    let sortedFeatures = Object.getOwnPropertyNames(featureStats).sort((a, b) => {
        return featureStats[a].std - featureStats[b].std;
    });

    // print the sorted features
    console.log("Sorted features by std:");
    for (let i = 0; i < sortedFeatures.length; i++) {
        let featureName = sortedFeatures[i];
        let feature = featureStats[featureName];
        console.log(featureName + ": " + feature.std);
    }
}
