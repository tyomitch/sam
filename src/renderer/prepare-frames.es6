import SetMouthThroat from './set-mouth-throat.es6'
import CreateTransitions from './create-transitions.es6';
import CreateFrames from './create-frames.es6';

export default function PrepareFrames(phonemes, pitch, mouth, throat, singmode) {
  const freqdata = SetMouthThroat(mouth, throat);

  /**
   * RENDER THE PHONEMES IN THE LIST
   *
   * The phoneme list is converted into sound through the steps:
   *
   * 1. Copy each phoneme <length> number of times into the frames list.
   *
   * 2. Determine the transitions lengths between phonemes, and linearly
   *    interpolate the values across the frames.
   *
   * 3. Offset the pitches by the fundamental frequency.
   *
   * 4. Render the each frame.
   */

    const [pitches, frequency, amplitude, sampledConsonantFlag] = CreateFrames(
      pitch,
      phonemes,
      freqdata
    );

    let t = CreateTransitions(
      pitches,
      frequency,
      amplitude,
      phonemes
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
     * Rescale volume from decibels to the linear scale.
     */
    const amplitudeRescale = [
      0x00, 0x01, 0x02, 0x02, 0x02, 0x03, 0x03, 0x04,
      0x04, 0x05, 0x06, 0x08, 0x09, 0x0B, 0x0D, 0x0F,
    ];
    for(let i = amplitude[0].length - 1; i >= 0; i--) {
      amplitude[0][i] = amplitudeRescale[amplitude[0][i]];
      amplitude[1][i] = amplitudeRescale[amplitude[1][i]];
      amplitude[2][i] = amplitudeRescale[amplitude[2][i]];
    }

  let result = [t, frequency, pitches, amplitude, sampledConsonantFlag];

  if (process.env.NODE_ENV === 'karma-test') {
    // Karma run, store data for karma retrieval.
    result.freqdata = freqdata;
  }

  return result;
}
