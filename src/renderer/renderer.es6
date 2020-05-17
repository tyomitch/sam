import PrepareFrames from './prepare-frames.es6';
import CreateOutputBuffer from './output-buffer.es6';
import ProcessFrames from './process-frames.es6';

/**
 * @param {Array} phonemes
 * @param {Number} [pitch]
 * @param {Number} [mouth]
 * @param {Number} [throat]
 * @param {Number} [speed]
 * @param {Boolean} [singmode]
 *
 * @return Uint8Array
 */
export default function Renderer(phonemes, pitch, mouth, throat, speed, singmode) {
  pitch = (pitch === undefined) ? 64 : pitch & 0xFF;
  mouth = (mouth === undefined) ? 128 : mouth & 0xFF;
  throat = (throat === undefined) ? 128 : throat & 0xFF;
  speed = (speed || 72) & 0xFF;
  singmode = singmode || false;

  const sentences = PrepareFrames(phonemes, pitch, mouth, throat, singmode);

  // Reserve 176.4*speed samples (=8*speed ms) for each frame.
  const Output = CreateOutputBuffer(
    176.4 // = (22050/125)
    * phonemes.reduce((pre, v) => pre + v[1], 0) // Combined phoneme length in frames.
    * speed | 0
  );

    const [t, frequency, pitches, amplitude, sampledConsonantFlag] = sentences;

    if (process.env.DEBUG_SAM === true) {
      PrintOutput(pitches, frequency, amplitude, sampledConsonantFlag);
    }
    if (process.env.NODE_ENV === 'karma-test') {
      // Karma run, store data for karma retrieval.
      Renderer.karmaOutput = {
        sampledConsonantFlag: sampledConsonantFlag,
        amplitude1: amplitude[0],
        frequency1: frequency[0],
        amplitude2: amplitude[1],
        frequency2: frequency[1],
        amplitude3: amplitude[2],
        frequency3: frequency[2],
        pitches: pitches,
        freq1data: sentences.freqdata[0],
        freq2data: sentences.freqdata[1],
        freq3data: sentences.freqdata[2],
      };
    }

    ProcessFrames(Output, t, speed, frequency, pitches, amplitude, sampledConsonantFlag);

  return Output.get();
}

function PrintOutput(pitches, frequency, amplitude, sampledConsonantFlag) {
  function pad(num) {
    const s = '00000' + num;
    return s.substr(s.length - 5);
  }
  console.log('===========================================');
  console.log('Final data for speech output:');
  console.log(' flags ampl1 freq1 ampl2 freq2 ampl3 freq3 pitch');
  console.log('------------------------------------------------');
  for (let i=0;i<sampledConsonantFlag.length;i++) {
    console.log(
      ' %s %s %s %s %s %s %s %s',
      pad(sampledConsonantFlag[i]),
      pad(amplitude[0][i]),
      pad(frequency[0][i]),
      pad(amplitude[1][i]),
      pad(frequency[1][i]),
      pad(amplitude[2][i]),
      pad(frequency[2][i]),
      pad(pitches[i])
    );
    i++;
  }
  console.log('===========================================');
}
