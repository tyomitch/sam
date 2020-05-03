/**
 * This is SamJs.js v0.1.1
 *
 * A Javascript port of "SAM Software Automatic Mouth".
 *
 * (c) 2017-2020 Christian Schiffler
 *
 * @link(https://github.com/discordier/sam)
 *
 * @author 2017 Christian Schiffler <c.schiffler@cyberspectrum.de>
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.Renderer = factory());
}(this, (function () { 'use strict';

  var BREAK = 254;
  var END   = 255;

  // Values substituted for zero bits in unvoiced consonant samples.

  var stressPitch_tab47492 = [
    0x00, 0x00, 0xE0, 0xE6, 0xEC, 0xF3, 0xF9, 0x00,
    0x06, 0xC, 0x06
  ];

  // Used to decide which phoneme's blend lengths. The candidate with the lower score is selected.
  // tab45856
  var blendRank = [
    0x00, 0x1F, 0x1F, 0x1F, 0x1F, 0x02, 0x02, 0x02,
    0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x05, 0x05,
    0x02, 0x0A, 0x02, 0x08, 0x05, 0x05, 0x0B, 0x0A,
    0x09, 0x08, 0x08, 0xA0, 0x08, 0x08, 0x17, 0x1F,
    0x12, 0x12, 0x12, 0x12, 0x1E, 0x1E, 0x14, 0x14,
    0x14, 0x14, 0x17, 0x17, 0x1A, 0x1A, 0x1D, 0x1D,
    0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x1A, 0x1D,
    0x1B, 0x1A, 0x1D, 0x1B, 0x1A, 0x1D, 0x1B, 0x1A,
    0x1D, 0x1B, 0x17, 0x1D, 0x17, 0x17, 0x1D, 0x17,
    0x17, 0x1D, 0x17, 0x17, 0x1D, 0x17, 0x17, 0x17
  ];

  // Number of frames at the end of a phoneme devoted to interpolating to next phoneme's final value
  //tab45696
  var outBlendLength = [
    0x00, 0x02, 0x02, 0x02, 0x02, 0x04, 0x04, 0x04,
    0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04,
    0x04, 0x04, 0x03, 0x02, 0x04, 0x04, 0x02, 0x02,
    0x02, 0x02, 0x02, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x02, 0x02,
    0x02, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x05,
    0x05, 0x05, 0x05, 0x05, 0x04, 0x04, 0x02, 0x00,
    0x01, 0x02, 0x00, 0x01, 0x02, 0x00, 0x01, 0x02,
    0x00, 0x01, 0x02, 0x00, 0x02, 0x02, 0x00, 0x01,
    0x03, 0x00, 0x02, 0x03, 0x00, 0x02, 0xA0, 0xA0
  ];

  // Number of frames at beginning of a phoneme devoted to interpolating to phoneme's final value
  // tab45776
  var inBlendLength = [
    0x00, 0x02, 0x02, 0x02, 0x02, 0x04, 0x04, 0x04,
    0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04,
    0x04, 0x04, 0x03, 0x03, 0x04, 0x04, 0x03, 0x03,
    0x03, 0x03, 0x03, 0x01, 0x02, 0x03, 0x02, 0x01,
    0x03, 0x03, 0x03, 0x03, 0x01, 0x01, 0x03, 0x03,
    0x03, 0x02, 0x02, 0x03, 0x02, 0x03, 0x00, 0x00,
    0x05, 0x05, 0x05, 0x05, 0x04, 0x04, 0x02, 0x00,
    0x02, 0x02, 0x00, 0x03, 0x02, 0x00, 0x04, 0x02,
    0x00, 0x03, 0x02, 0x00, 0x02, 0x02, 0x00, 0x02,
    0x03, 0x00, 0x03, 0x03, 0x00, 0x03, 0xB0, 0xA0
  ];

  // Consists of two bitfields:
  // Low 3 bits (masked by 7) select a 256-byte section in sampleTable,
  // as well as index into sampledConsonantValues0 for unvoiced.
  // High 5 bits (masked by 248 = 11111000), for unvoiced,
  // give inverted offset within the 256-byte section.
  //
  // 32: S*    241         11110001
  // 33: SH    226         11100010
  // 34: F*    211         11010011
  // 35: TH    187         10111011
  // 36: /H    124         01111100
  // 37: /X    149         10010101
  // 38: Z*    1           00000001
  // 39: ZH    2           00000010
  // 40: V*    3           00000011
  // 41: DH    3           00000011
  // 43: **    114         01110010
  // 45: **    2           00000010
  // 67: **    27          00011011
  // 70: **    25          00011001
  // tab45936
  var sampledConsonantFlags = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0xF1, 0xE2, 0xD3, 0xBB, 0x7C, 0x95, 0x01, 0x02,
    0x03, 0x03, 0x00, 0x72, 0x00, 0x02, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x1B, 0x00, 0x00, 0x19, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ];

  //
  var frequencyData = [
  //tab45056 |tab451356 |tab45216
  //  freq1  |  freq2   |  freq3
    0x000000 | 0x000000 | 0x000000,
    0x000013 | 0x004300 | 0x5B0000,
    0x000013 | 0x004300 | 0x5B0000,
    0x000013 | 0x004300 | 0x5B0000,
    0x000013 | 0x004300 | 0x5B0000,
    0x00000A | 0x005400 | 0x6E0000,
    0x00000E | 0x004800 | 0x5D0000,
    0x000012 | 0x004200 | 0x5B0000,
    0x000018 | 0x003E00 | 0x580000,
    0x00001A | 0x002800 | 0x590000,
    0x000016 | 0x002C00 | 0x570000,
    0x000014 | 0x001E00 | 0x580000,
    0x000010 | 0x002400 | 0x520000,
    0x000014 | 0x002C00 | 0x590000,
    0x00000E | 0x004800 | 0x5D0000,
    0x000012 | 0x003000 | 0x3E0000,
    0x00000E | 0x002400 | 0x520000,
    0x000012 | 0x001E00 | 0x580000,
    0x000012 | 0x003200 | 0x3E0000,
    0x000010 | 0x002400 | 0x6E0000,
    0x00000C | 0x001C00 | 0x500000,
    0x00000E | 0x004400 | 0x5D0000,
    0x00000A | 0x001800 | 0x5A0000,
    0x000012 | 0x003200 | 0x3C0000,
    0x00000E | 0x001E00 | 0x6E0000,
    0x00000A | 0x001800 | 0x5A0000,
    0x000008 | 0x005200 | 0x6E0000,
    0x000006 | 0x002E00 | 0x510000,
    0x000006 | 0x003600 | 0x790000,
    0x000006 | 0x005600 | 0x650000,
    0x000006 | 0x003600 | 0x790000,
    0x000011 | 0x004300 | 0x5B0000,
    0x000006 | 0x004900 | 0x630000,
    0x000006 | 0x004F00 | 0x6A0000,
    0x000006 | 0x001A00 | 0x510000,
    0x000006 | 0x004200 | 0x790000,
    0x00000E | 0x004900 | 0x5D0000,
    0x000010 | 0x002500 | 0x520000,
    0x000009 | 0x003300 | 0x5D0000,
    0x00000A | 0x004200 | 0x670000,
    0x000008 | 0x002800 | 0x4C0000,
    0x00000A | 0x002F00 | 0x5D0000,
    0x000006 | 0x004F00 | 0x650000,
    0x000006 | 0x004F00 | 0x650000,
    0x000006 | 0x004200 | 0x790000,
    0x000005 | 0x004F00 | 0x650000,
    0x000006 | 0x006E00 | 0x790000,
    0x000000 | 0x000000 | 0x000000,
    0x000012 | 0x004800 | 0x5A0000,
    0x00001A | 0x002600 | 0x580000,
    0x000014 | 0x001E00 | 0x580000,
    0x00001A | 0x002A00 | 0x580000,
    0x000012 | 0x001E00 | 0x580000,
    0x00000C | 0x002200 | 0x520000,
    0x000006 | 0x001A00 | 0x510000,
    0x000006 | 0x001A00 | 0x510000,
    0x000006 | 0x001A00 | 0x510000,
    0x000006 | 0x004200 | 0x790000,
    0x000006 | 0x004200 | 0x790000,
    0x000006 | 0x004200 | 0x790000,
    0x000006 | 0x006E00 | 0x700000,
    0x000006 | 0x006E00 | 0x6E0000,
    0x000006 | 0x006E00 | 0x6E0000,
    0x000006 | 0x005400 | 0x5E0000,
    0x000006 | 0x005400 | 0x5E0000,
    0x000006 | 0x005400 | 0x5E0000,
    0x000006 | 0x001A00 | 0x510000,
    0x000006 | 0x001A00 | 0x510000,
    0x000006 | 0x001A00 | 0x510000,
    0x000006 | 0x004200 | 0x790000,
    0x000006 | 0x004200 | 0x790000,
    0x000006 | 0x004200 | 0x790000,
    0x000006 | 0x006D00 | 0x650000,
    0x00000A | 0x005600 | 0x650000,
    0x00000A | 0x006D00 | 0x700000,
    0x000006 | 0x005400 | 0x5E0000,
    0x000006 | 0x005400 | 0x5E0000,
    0x000006 | 0x005400 | 0x5E0000,
    0x00002C | 0x007F00 | 0x080000,
    0x000013 | 0x007F00 | 0x010000
  ];

  /**
   *
   * ampl1data[X] =  ampldata[X]        & 0xFF; // F1 amplitude
   * ampl2data[X] = (ampldata[X] >> 8)  & 0xFF; // F2 amplitude
   * ampl3data[X] = (ampldata[X] >> 16) & 0xFF; // F3 amplitude
   */
  var ampldata = [
  // ampl1   | ampl2    | ampl3
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x00000D | 0x000A00 | 0x080000,
    0x00000D | 0x000B00 | 0x070000,
    0x00000E | 0x000D00 | 0x080000,
    0x00000F | 0x000E00 | 0x080000,
    0x00000F | 0x000D00 | 0x010000,
    0x00000F | 0x000C00 | 0x010000,
    0x00000F | 0x000C00 | 0x000000,
    0x00000F | 0x000B00 | 0x010000,
    0x00000C | 0x000900 | 0x000000,
    0x00000D | 0x000B00 | 0x070000,
    0x00000C | 0x000B00 | 0x050000,
    0x00000F | 0x000C00 | 0x010000,
    0x00000F | 0x000C00 | 0x000000,
    0x00000D | 0x000C00 | 0x060000,
    0x00000D | 0x000800 | 0x010000,
    0x00000D | 0x000800 | 0x000000,
    0x00000E | 0x000C00 | 0x070000,
    0x00000D | 0x000800 | 0x000000,
    0x00000C | 0x000A00 | 0x050000,
    0x00000D | 0x000800 | 0x010000,
    0x00000D | 0x000800 | 0x000000,
    0x00000D | 0x000A00 | 0x080000,
    0x00000C | 0x000300 | 0x000000,
    0x000009 | 0x000900 | 0x000000,
    0x000009 | 0x000600 | 0x030000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x00000B | 0x000300 | 0x000000,
    0x00000B | 0x000500 | 0x010000,
    0x00000B | 0x000300 | 0x000000,
    0x00000B | 0x000400 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000001 | 0x000000 | 0x000000,
    0x00000B | 0x000500 | 0x010000,
    0x000000 | 0x000A00 | 0x0E0000,
    0x000002 | 0x000200 | 0x010000,
    0x00000E | 0x000E00 | 0x090000,
    0x00000F | 0x000D00 | 0x010000,
    0x00000F | 0x000C00 | 0x000000,
    0x00000F | 0x000D00 | 0x010000,
    0x00000F | 0x000C00 | 0x000000,
    0x00000D | 0x000800 | 0x000000,
    0x000002 | 0x000000 | 0x000000,
    0x000004 | 0x000100 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000002 | 0x000000 | 0x000000,
    0x000004 | 0x000100 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000001 | 0x000000 | 0x000000,
    0x000004 | 0x000100 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000001 | 0x000000 | 0x000000,
    0x000004 | 0x000100 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x00000C | 0x000A00 | 0x070000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000000 | 0x000000,
    0x000000 | 0x000A00 | 0x050000,
    0x000000 | 0x000000 | 0x000000,
    0x00000F | 0x000000 | 0x130000,
    0x00000F | 0x000000 | 0x100000
  ];

  // mouth formants (F1) 5..29
  var mouthFormants5_29 = [
    0, 0, 0, 0, 0, 10,
    14, 19, 24, 27, 23, 21, 16, 20, 14, 18, 14, 18, 18,
    16, 13, 15, 11, 18, 14, 11, 9, 6, 6, 6
  ];
  // formant 1 frequencies (mouth) 48..53
  var mouthFormants48_53 = [19, 27, 21, 27, 18, 13];

  // throat formants (F2) 5..29
  var throatFormants5_29 = [
    255, 255,
    255, 255, 255, 84, 73, 67, 63, 40, 44, 31, 37, 45, 73, 49,
    36, 30, 51, 37, 29, 69, 24, 50, 30, 24, 83, 46, 54, 86 ];
  // formant 2 frequencies (throat) 48..53
  var throatFormants48_53 = [72, 39, 31, 43, 30, 34];

  function trans(factor, initialFrequency) {
    return ((((factor & 0xFF) * (initialFrequency & 0xFF)) >> 8) & 0xFF) << 1;
  }

  /**
   * SAM's voice can be altered by changing the frequencies of the
   * mouth formant (F1) and the throat formant (F2). Only the
   * non-fricative voiced phonemes (5-29 and 48-53) are altered.
   *
   * This returns the three base frequency arrays.
   *
   * @return {Array}
   */
  function SetMouthThroat(mouth, throat) {
    var initialFrequency;
    var newFrequency = 0;
    var pos = 5;

    var freqdata = [[],[],[]];
    frequencyData.map(function (v, i) {
      freqdata[0][i] = v & 0xFF;
      freqdata[1][i] = (v >> 8) & 0xFF;
      freqdata[2][i] = (v >> 16) & 0xFF;
    });

    // recalculate formant frequencies 5..29 for the mouth (F1) and throat (F2)
    while(pos < 30) {
      // recalculate mouth frequency
      initialFrequency = mouthFormants5_29[pos];
      if (initialFrequency !== 0) {
        newFrequency = trans(mouth, initialFrequency);
      }
      freqdata[0][pos] = newFrequency;

      // recalculate throat frequency
      initialFrequency = throatFormants5_29[pos];
      if(initialFrequency !== 0) {
        newFrequency = trans(throat, initialFrequency);
      }
      freqdata[1][pos] = newFrequency;
      pos++;
    }

    // recalculate formant frequencies 48..53
    pos = 0;
    while(pos < 6) {
      // recalculate F1 (mouth formant)
      initialFrequency = mouthFormants48_53[pos];
      newFrequency = trans(mouth, initialFrequency);
      freqdata[0][pos+48] = newFrequency;
      // recalculate F2 (throat formant)
      initialFrequency = throatFormants48_53[pos];
      newFrequency = trans(throat, initialFrequency);
      freqdata[1][pos+48] = newFrequency;
      pos++;
    }

    return freqdata;
  }

  /**
   * CREATE TRANSITIONS.
   *
   * Linear transitions are now created to smoothly connect each
   * phoeneme. This transition is spread between the ending frames
   * of the old phoneme (outBlendLength), and the beginning frames
   * of the new phoneme (inBlendLength).
   *
   * To determine how many frames to use, the two phonemes are
   * compared using the blendRank[] table. The phoneme with the
   * smaller score is used. In case of a tie, a blend of each is used:
   *
   *      if blendRank[phoneme1] ==  blendRank[phomneme2]
   *          // use lengths from each phoneme
   *          outBlendFrames = outBlend[phoneme1]
   *          inBlendFrames = outBlend[phoneme2]
   *      else if blendRank[phoneme1] < blendRank[phoneme2]
   *          // use lengths from first phoneme
   *          outBlendFrames = outBlendLength[phoneme1]
   *          inBlendFrames = inBlendLength[phoneme1]
   *      else
   *          // use lengths from the second phoneme
   *          // note that in and out are swapped around!
   *          outBlendFrames = inBlendLength[phoneme2]
   *          inBlendFrames = outBlendLength[phoneme2]
   *
   *  Blend lengths can't be less than zero.
   *
   * For most of the parameters, SAM interpolates over the range of the last
   * outBlendFrames-1 and the first inBlendFrames.
   *
   * The exception to this is the Pitch[] parameter, which is interpolates the
   * pitch from the center of the current phoneme to the center of the next
   * phoneme.
   *
   * @param {Uint8Array} pitches
   * @param {Uint8Array} frequency
   * @param {Uint8Array} amplitude
   * @param {Array} tuples
   *
   * @return {Number}
   */
  function CreateTransitions(pitches, frequency, amplitude, tuples) {
    // 0=pitches
    // 1=frequency1
    // 2=frequency[1]
    // 3=frequency3
    // 4=amplitude1
    // 5=amplitude2
    // 6=amplitude3
    var tables = [pitches, frequency[0], frequency[1], frequency[2], amplitude[0], amplitude[1], amplitude[2]];
    var Read = function (table, pos) {
      {
        if (table < 0 || table > tables.length -1 ) {
          throw new Error(("Error invalid table in Read: " + table));
        }
      }
      return tables[table][pos];
    };

    // linearly interpolate values
    var interpolate = function (width, table, frame, mem53) {
      var sign      = (mem53 < 0);
      var remainder = Math.abs(mem53) % width;
      var div       = (mem53 / width) | 0;

      var error = 0;
      var pos   = width;

      while (--pos > 0) {
        var val = Read(table, frame) + div;
        error += remainder;
        if (error >= width) {
          // accumulated a whole integer error, so adjust output
          error -= width;
          if (sign) {
            val--;
          } else if (val) {
            // if input is 0, we always leave it alone
            val++;
          }
        }

        // Write updated value back to next frame.
        {
          if (table < 0 || table > tables.length -1 ) {
            throw new Error(("Error invalid table in Read: " + table));
          }
        }
        tables[table][++frame] = val;
        val += div;
      }
    };

    var phase1;
    var phase2;
    var mem49 = 0;
    for (var pos=0;pos<tuples.length - 1;pos++) {
      var phoneme      = tuples[pos][0];
      var next_phoneme = tuples[pos+1][0];

      // get the ranking of each phoneme
      var next_rank = blendRank[next_phoneme];
      var rank      = blendRank[phoneme];

      // compare the rank - lower rank value is stronger
      if (rank === next_rank) {
        // same rank, so use out blend lengths from each phoneme
        phase1 = outBlendLength[phoneme];
        phase2 = outBlendLength[next_phoneme];
      } else if (rank < next_rank) {
        // next phoneme is stronger, so us its blend lengths
        phase1 = inBlendLength[next_phoneme];
        phase2 = outBlendLength[next_phoneme];
      } else {
        // current phoneme is stronger, so use its blend lengths
        // note the out/in are swapped
        phase1 = outBlendLength[phoneme];
        phase2 = inBlendLength[phoneme];
      }
      mem49 += tuples[pos][1];
      var speedcounter = mem49 + phase2;
      var phase3       = mem49 - phase1;
      var transition   = phase1 + phase2; // total transition?

      if (((transition - 2) & 128) === 0) {
        // unlike the other values, the pitches[] interpolates from
        // the middle of the current phoneme to the middle of the
        // next phoneme

        // half the width of the current and next phoneme
        var cur_width  = tuples[pos][1] >> 1;
        var next_width = tuples[pos+1][1] >> 1;
        var pitch = pitches[next_width + mem49] - pitches[mem49 - cur_width];
        // sum the values
        interpolate(cur_width + next_width, 0, phase3, pitch);

        for (var table = 1; table < 7;table++) {
          // tables:
          // 0  pitches[]
          // 1  frequency1
          // 2  frequency[1]
          // 3  frequency3
          // 4  amplitude1
          // 5  amplitude2
          // 6  amplitude3
          var value = Read(table, speedcounter) - Read(table, phase3);
          interpolate(transition, table, phase3, value);
        }
      }
    }

    // add the length of this phoneme
    return (mem49 + tuples[tuples.length - 1][1]) & 0xFF;
  }

  var PHONEME_PERIOD = 1;
  var PHONEME_QUESTION = 2;

  var RISING_INFLECTION = 255;
  var FALLING_INFLECTION = 1;

  /**
   * Create a rising or falling inflection 30 frames prior to index X.
   * A rising inflection is used for questions, and a falling inflection is used for statements.
   */
  function AddInflection (inflection, pos, pitches) {
    // store the location of the punctuation
    var end = pos;
    if (pos < 30) {
      pos = 0;
    } else {
      pos -= 30;
    }

    var A;
    // FIXME: Explain this fix better, it's not obvious
    // ML : A =, fixes a problem with invalid pitch with '.'
    while ((A = pitches[pos]) === 127) {
      ++pos;
    }

    while (pos !== end) {
      // add the inflection direction
      A += inflection;

      // set the inflection
      pitches[pos] = A & 0xFF;

      while ((++pos !== end) && pitches[pos] === 255) { /* keep looping */}
    }
  }

  /** CREATE FRAMES
   *
   * The length parameter in the list corresponds to the number of frames
   * to expand the phoneme to. Each frame represents 10 milliseconds of time.
   * So a phoneme with a length of 7 = 7 frames = 70 milliseconds duration.
   *
   * The parameters are copied from the phoneme to the frame verbatim.
   *
   * Returns:
   *   [
   *      pitches,
   *      frequency,
   *      amplitude,
   *      sampledConsonantFlag
   *   ]
   *
   * @param {Number}       pitch          Input
   * @param {Array}        tuples         Input
   * @param {Uint8Array[]} frequencyData  Input
   *
   * @return Array
   */
  function CreateFrames (
    pitch,
    tuples,
    frequencyData) {
    var pitches              = [];
    var frequency            = [[], [], []];
    var amplitude            = [[], [], []];
    var sampledConsonantFlag = [];

    var X = 0;
    for (var i=0;i<tuples.length;i++) {
      // get the phoneme at the index
      var phoneme = tuples[i][0];
      if (phoneme === PHONEME_PERIOD) {
        AddInflection(FALLING_INFLECTION, X, pitches);
      } else if (phoneme === PHONEME_QUESTION) {
        AddInflection(RISING_INFLECTION, X, pitches);
      }

      // get the stress amount (more stress = higher pitch)
      var phase1 = stressPitch_tab47492[tuples[i][2] + 1];
      // get number of frames to write
      // copy from the source to the frames list
      for (var frames = tuples[i][1];frames > 0;frames--) {
        frequency[0][X]         = frequencyData[0][phoneme];      // F1 frequency
        frequency[1][X]         = frequencyData[1][phoneme];      // F2 frequency
        frequency[2][X]         = frequencyData[2][phoneme];      // F3 frequency
        amplitude[0][X]         = ampldata[phoneme] & 0xFF;         // F1 amplitude
        amplitude[1][X]         = (ampldata[phoneme] >> 8) & 0xFF;  // F2 amplitude
        amplitude[2][X]         = (ampldata[phoneme] >> 16) & 0xFF; // F3 amplitude
        sampledConsonantFlag[X] = sampledConsonantFlags[phoneme]; // phoneme data for sampled consonants
        pitches[X]              = (pitch + phase1) & 0xFF;        // pitch
        X++;
      }
    }

    return [
      pitches,
      frequency,
      amplitude,
      sampledConsonantFlag
    ];
  }

  function PrepareFrames(phonemes, pitch, mouth, throat, singmode) {
    var freqdata = SetMouthThroat(mouth, throat);

    var sentences = [];

    // Main render loop.
    var srcpos  = 0; // Position in source
    // FIXME: should be tuple buffer as well.
    var tuples = [];
    var A;
    do {
      A = phonemes[srcpos];
      if (A[0]) {
        if (A[0] === END || A[0] === BREAK) {
          var sentence = Render(tuples);
          if (sentence[0])
            { sentences.push(sentence); }
          tuples = [];
        } else {
          tuples.push(A);
        }
      }
      ++srcpos;
    } while(A[0] !== END);
    return sentences;

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
        return [0, [], [], [], []]; //exit if no data
      }

      var ref = CreateFrames(
        pitch,
        tuples,
        freqdata
      );
      var pitches = ref[0];
      var frequency = ref[1];
      var amplitude = ref[2];
      var sampledConsonantFlag = ref[3];

      var t = CreateTransitions(
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
        for(var i = 0; i < pitches.length; i++) {
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
      var amplitudeRescale = [
        0x00, 0x01, 0x02, 0x02, 0x02, 0x03, 0x03, 0x04,
        0x04, 0x05, 0x06, 0x08, 0x09, 0x0B, 0x0D, 0x0F,
        0x00  //17 elements?
      ];
      for(var i$1 = amplitude[0].length - 1; i$1 >= 0; i$1--) {
        amplitude[0][i$1] = amplitudeRescale[amplitude[0][i$1]];
        amplitude[1][i$1] = amplitudeRescale[amplitude[1][i$1]];
        amplitude[2][i$1] = amplitudeRescale[amplitude[2][i$1]];
      }

      return [t, frequency, pitches, amplitude, sampledConsonantFlag];
    }
  }

  return PrepareFrames;

})));
