import {BREAK, END} from '../common/constants.es6'

import SetMouthThroat from './set-mouth-throat.es6'
import CreateTransitions from './create-transitions.es6';
import CreateFrames from './create-frames.es6';
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

  // Every frame is 20ms long.
  const Output = CreateOutputBuffer(
    441 // = (22050/50)
    * phonemes.reduce((pre, v) => pre + (v[1] * 20), 0) / 50 // Combined phoneme length in ms.
    * speed | 0 // multiplied by speed.
  );

  const freqdata = SetMouthThroat(mouth, throat);

  // Main render loop.
  let srcpos  = 0; // Position in source
  // FIXME: should be tuple buffer as well.
  let tuples = [];
  while(1) {
    const A = phonemes[srcpos];
    const A0 = A[0]
    if (A0) {
      if (A0 === END) {
        Render(tuples);
        return Output.get();
      }
      if (A0 === BREAK) {
        Render(tuples);
        tuples = [];
      } else {
        tuples.push(A);
      }
    }
    ++srcpos;
  }

  /**
   * RENDER THE PHONEMES IN THE LIST
   *
   * The phoneme list is converted into sound through the steps:
   *
   * 1. Copy each phoneme <length> number of times into the frames list,
   *    where each frame represents 10 milliseconds of sound.
   *
   * 2. Determine the transitions lengths between phonemes, and linearly
   *    interpolate the values across the frames.
   *
   * 3. Offset the pitches by the fundamental frequency.
   *
   * 4. Render the each frame.
   *
   * @param {Array} tuples
   */
  function Render (tuples) {
    if (tuples.length === 0) {
      return; //exit if no data
    }

    const [pitches, frequency, amplitude, sampledConsonantFlag] = CreateFrames(
      pitch,
      tuples,
      freqdata
    );

    const t = CreateTransitions(
      pitches,
      frequency,
      amplitude,
      tuples
    );

    if (!singmode) {
      /* ASSIGN PITCH CONTOUR
       *
       * This subtracts the F1 frequency from the pitch to create a
       * pitch contour. Without this, the output would be at a single
       * pitch level (monotone).
       */
      for(let i = 0; i < pitches.length; i++) {
        // subtract half the frequency of the formant 1.
        // this adds variety to the voice
        pitches[i] -= (frequency[0][i] >> 1);
      }
    }

    /*
     * RESCALE AMPLITUDE
     *
     * Rescale volume from a linear scale to decibels.
     */
    const amplitudeRescale = [
      0x00, 0x01, 0x02, 0x02, 0x02, 0x03, 0x03, 0x04,
      0x04, 0x05, 0x06, 0x08, 0x09, 0x0B, 0x0D, 0x0F,
      0x00  //17 elements?
    ];
    for(let i = amplitude[0].length - 1; i >= 0; i--) {
      amplitude[0][i] = amplitudeRescale[amplitude[0][i]];
      amplitude[1][i] = amplitudeRescale[amplitude[1][i]];
      amplitude[2][i] = amplitudeRescale[amplitude[2][i]];
    }

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
        freq1data: freqdata[0],
        freq2data: freqdata[1],
        freq3data: freqdata[2],
      };
    }

    ProcessFrames(Output, t, speed, frequency, pitches, amplitude, sampledConsonantFlag);
  }

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
