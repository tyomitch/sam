import {
  sampledConsonantValues0,
  sampleTable,
} from './tables.es6';

const sinus = Array.apply(null, Array(256)).map((n, i) =>
  Math.sin(2*Math.PI*(i/256)) * 127 | 0
);

function RenderSample(Output, lastSampleOffset, consonantFlag, pitch) {

  // mask low three bits and subtract 1 get value to
  // convert 0 bits on unvoiced samples.
  const kind = (consonantFlag & 7) - 1;

  // determine which value to use from table { 0x18, 0x1A, 0x17, 0x17, 0x17 }
  // T', S, Z               0          0x18   coronal
  // CH', J', SH, ZH        1          0x1A   palato-alveolar
  // P', F, V, TH, DH       2          0x17   [labio]dental
  // /H                     3          0x17   palatal
  // /X                     4          0x17   glottal

  const samplePage = kind * 256 & 0xFFFF; // unsigned short
  let off = consonantFlag & 248; // unsigned char

  function renderSample (index1, value1, index0, value0) {
    let bit = 8;
    let sample = sampleTable[samplePage+off]
    do {
      if ((sample & 128) !== 0) {
        Output(index1, value1);
      } else {
        Output(index0, value0);
      }
      sample <<= 1;
    } while(--bit);
  }

  if(off === 0) {
    // voiced phoneme: Z*, ZH, V*, DH
    let phase1 = (pitch >> 4) ^ 255 & 0xFF; // unsigned char
    off = lastSampleOffset & 0xFF; // unsigned char
    do {
      renderSample(3, 26, 4, 6)
      off++;
    } while (++phase1 & 0xFF);
    return off;
  }
  // unvoiced
  off = off ^ 255 & 0xFF; // unsigned char
  let value0 = sampledConsonantValues0[kind] & 0xFF; // unsigned char
  do {
    renderSample(2, 5, 1, value0)
  } while (++off & 0xFF);

  return lastSampleOffset;
};

/**
 * PROCESS THE FRAMES
 *
 * In traditional vocal synthesis, the glottal pulse drives filters, which
 * are attenuated to the frequencies of the formants.
 *
 * SAM generates these formants directly with sine and rectangular waves.
 * To simulate them being driven by the glottal pulse, the waveforms are
 * reset at the beginning of each glottal pulse.
 */
export default function ProcessFrames(Output, frameCount, speed, frequency, pitches, amplitude, sampledConsonantFlag) {
  let speedcounter = speed;
  let phase1 = 0;
  let phase2 = 0;
  let phase3 = 0;
  let lastSampleOffset = 0;
  let pos = 0;
  let glottal_pulse = pitches[0];
  let mem38 = glottal_pulse * .75 |0;

  while(frameCount) {
    let flags = sampledConsonantFlag[pos];

    // unvoiced sampled phoneme?
    if ((flags & 248) !== 0) {
      lastSampleOffset = RenderSample(Output, lastSampleOffset, flags, pitches[pos & 0xFF]);
      // skip ahead two in the phoneme buffer
      pos += 2;
      frameCount -= 2;
      speedcounter = speed;
    } else {
      {
        // Rectangle wave consisting of:
        //   0-128 = 0x90
        // 128-255 = 0x70

        let ary = []
        let /* unsigned int */ p1 = phase1 * 256; // Fixed point integers because we need to divide later on
        let /* unsigned int */ p2 = phase2 * 256;
        let /* unsigned int */ p3 = phase3 * 256;
        let k;
        for (k=0; k<5; k++) {
          let /* signed char */ sp1 = sinus[0xff & (p1>>8)];
          let /* signed char */ sp2 = sinus[0xff & (p2>>8)];
          let /* signed char */ rp3 = ((0xff & (p3>>8))<129) ? -0x70 : 0x70;
          let /* signed int */ sin1 = sp1 * (/* (unsigned char) */ amplitude[0][pos] & 0x0F);
          let /* signed int */ sin2 = sp2 * (/* (unsigned char) */ amplitude[1][pos] & 0x0F);
          let /* signed int */ rect = rp3 * (/* (unsigned char) */ amplitude[2][pos] & 0x0F);
          let /* signed int */ mux = sin1 + sin2 + rect;
          mux /= 32;
          mux += 128; // Go from signed to unsigned amplitude
          ary[k] = mux |0;
          p1 += frequency[0][pos] * 256 / 4; // Compromise, this becomes a shift and works well
          p2 += frequency[1][pos] * 256 / 4;
          p3 += frequency[2][pos] * 256 / 4;
        }
        Output.ary(0, ary);
      }

      speedcounter--;
      if (speedcounter === 0) {
        pos++; //go to next amplitude
        // decrement the frame count
        frameCount--;
        if(frameCount === 0) {
          return;
        }
        speedcounter = speed;
      }

      glottal_pulse--;

      if(glottal_pulse !== 0) {
        // not finished with a glottal pulse

        mem38--;
        // within the first 75% of the glottal pulse?
        // is the count non-zero and the sampled flag is zero?
        if((mem38 !== 0) || (flags === 0)) {
          // update the phase of the formants
          // TODO: we should have a switch to disable this, it causes a pretty nice voice without the masking!
          phase1 = phase1 + frequency[0][pos] & 0xFF;
          phase2 = phase2 + frequency[1][pos] & 0xFF;
          phase3 = phase3 + frequency[2][pos] & 0xFF;
          continue;
        }

        // voiced sampled phonemes interleave the sample with the
        // glottal pulse. The sample flag is non-zero, so render
        // the sample for the phoneme.
        lastSampleOffset = RenderSample(Output, lastSampleOffset, flags, pitches[pos & 0xFF]);
      }
    }

    glottal_pulse = pitches[pos];
    mem38 = glottal_pulse * .75 |0;

    // reset the formant wave generators to keep them in
    // sync with the glottal pulse
    phase1 = 0;
    phase2 = 0;
    phase3 = 0;
  }
}
