/**
 * This is SamJs.js v0.1.2
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

  // Values substituted for zero bits in unvoiced consonant samples.

  var stressPitch_tab47492 = [
    0x00, 0xE0, 0xE6, 0xEC, 0xF3, 0xF9, 0x00, 0x06, 0xC, 0x06
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
  // 43: CH'   114         01110010
  // 45: J'    2           00000010
  // 67: P'    27          00011011
  // 70: T'    25          00011001
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
    0x000000 | 0x000000 | 0x000000, // ' *' 00
    0x000013 | 0x004300 | 0x5B0000, // '.*' 01
    0x000013 | 0x004300 | 0x5B0000, // '?*' 02
    0x000013 | 0x004300 | 0x5B0000, // ',*' 03
    0x000013 | 0x004300 | 0x5B0000, // '-*' 04
    0x00000A | 0x005400 | 0x6E0000, // 'IY' 05
    0x00000E | 0x004900 | 0x5D0000, // 'IH' 06
    0x000013 | 0x004300 | 0x5B0000, // 'EH' 07
    0x000018 | 0x003F00 | 0x580000, // 'AE' 08
    0x00001B | 0x002800 | 0x590000, // 'AA' 09
    0x000017 | 0x002C00 | 0x570000, // 'AH' 10
    0x000015 | 0x001F00 | 0x580000, // 'AO' 11
    0x000010 | 0x002500 | 0x520000, // 'UH' 12
    0x000014 | 0x002D00 | 0x590000, // 'AX' 13
    0x00000E | 0x004900 | 0x5D0000, // 'IX' 14
    0x000012 | 0x003100 | 0x3E0000, // 'ER' 15
    0x00000E | 0x002400 | 0x520000, // 'UX' 16
    0x000012 | 0x001E00 | 0x580000, // 'OH' 17
    0x000012 | 0x003300 | 0x3E0000, // 'RX' 18
    0x000010 | 0x002500 | 0x6E0000, // 'LX' 19
    0x00000D | 0x001D00 | 0x500000, // 'WX' 20
    0x00000F | 0x004500 | 0x5D0000, // 'YX' 21
    0x00000B | 0x001800 | 0x5A0000, // 'WH' 22
    0x000012 | 0x003200 | 0x3C0000, // 'R*' 23
    0x00000E | 0x001E00 | 0x6E0000, // 'L*' 24
    0x00000B | 0x001800 | 0x5A0000, // 'W*' 25
    0x000009 | 0x005300 | 0x6E0000, // 'Y*' 26
    0x000006 | 0x002E00 | 0x510000, // 'M*' 27
    0x000006 | 0x003600 | 0x790000, // 'N*' 28
    0x000006 | 0x005600 | 0x650000, // 'NX' 29
    0x000006 | 0x003600 | 0x790000, // 'DX' 30
    0x000011 | 0x004300 | 0x5B0000, // 'Q*' 31
    0x000006 | 0x004900 | 0x630000, // 'S*' 32
    0x000006 | 0x004F00 | 0x6A0000, // 'SH' 33
    0x000006 | 0x001A00 | 0x510000, // 'F*' 34
    0x000006 | 0x004200 | 0x790000, // 'TH' 35
    0x00000E | 0x004900 | 0x5D0000, // '/H' 36
    0x000010 | 0x002500 | 0x520000, // '/X' 37
    0x000009 | 0x003300 | 0x5D0000, // 'Z*' 38
    0x00000A | 0x004200 | 0x670000, // 'ZH' 39
    0x000008 | 0x002800 | 0x4C0000, // 'V*' 40
    0x00000A | 0x002F00 | 0x5D0000, // 'DH' 41
    0x000006 | 0x004F00 | 0x650000, // 'CH' 42
    0x000006 | 0x004F00 | 0x650000, // '**' 43
    0x000006 | 0x004200 | 0x790000, // 'J*' 44
    0x000005 | 0x004F00 | 0x650000, // '**' 45
    0x000006 | 0x006E00 | 0x790000, // '**' 46
    0x000000 | 0x000000 | 0x000000, // '**' 47
    0x000013 | 0x004800 | 0x5A0000, // 'EY' 48
    0x00001B | 0x002700 | 0x580000, // 'AY' 49
    0x000015 | 0x001F00 | 0x580000, // 'OY' 50
    0x00001B | 0x002B00 | 0x580000, // 'AW' 51
    0x000012 | 0x001E00 | 0x580000, // 'OW' 52
    0x00000D | 0x002200 | 0x520000, // 'UW' 53
    0x000006 | 0x001A00 | 0x510000, // 'B*' 54
    0x000006 | 0x001A00 | 0x510000, // '**' 55
    0x000006 | 0x001A00 | 0x510000, // '**' 56
    0x000006 | 0x004200 | 0x790000, // 'D*' 57
    0x000006 | 0x004200 | 0x790000, // '**' 58
    0x000006 | 0x004200 | 0x790000, // '**' 59
    0x000006 | 0x006E00 | 0x700000, // 'G*' 60
    0x000006 | 0x006E00 | 0x6E0000, // '**' 61
    0x000006 | 0x006E00 | 0x6E0000, // '**' 62
    0x000006 | 0x005400 | 0x5E0000, // 'GX' 63
    0x000006 | 0x005400 | 0x5E0000, // '**' 64
    0x000006 | 0x005400 | 0x5E0000, // '**' 65
    0x000006 | 0x001A00 | 0x510000, // 'P*' 66
    0x000006 | 0x001A00 | 0x510000, // '**' 67
    0x000006 | 0x001A00 | 0x510000, // '**' 68
    0x000006 | 0x004200 | 0x790000, // 'T*' 69
    0x000006 | 0x004200 | 0x790000, // '**' 70
    0x000006 | 0x004200 | 0x790000, // '**' 71
    0x000006 | 0x006D00 | 0x650000, // 'K*' 72
    0x00000A | 0x005600 | 0x650000, // '**' 73
    0x00000A | 0x006D00 | 0x700000, // '**' 74
    0x000006 | 0x005400 | 0x5E0000, // 'KX' 75
    0x000006 | 0x005400 | 0x5E0000, // '**' 76
    0x000006 | 0x005400 | 0x5E0000, // '**' 77
    0x00002C | 0x007F00 | 0x080000, // 'UL' 78
    0x000013 | 0x007F00 | 0x010000  // 'UM' 79
  ];

  /**
   *
   * ampl1data[X] =  ampldata[X]        & 0xFF; // F1 amplitude
   * ampl2data[X] = (ampldata[X] >> 8)  & 0xFF; // F2 amplitude
   * ampl3data[X] = (ampldata[X] >> 16) & 0xFF; // F3 amplitude
   */
  var ampldata = [
  // ampl1   | ampl2    | ampl3
    0x000000 | 0x000000 | 0x000000, // ' *' 00
    0x000000 | 0x000000 | 0x000000, // '.*' 01
    0x000000 | 0x000000 | 0x000000, // '?*' 02
    0x000000 | 0x000000 | 0x000000, // ',*' 03
    0x000000 | 0x000000 | 0x000000, // '-*' 04
    0x00000D | 0x000A00 | 0x080000, // 'IY' 05
    0x00000D | 0x000B00 | 0x070000, // 'IH' 06
    0x00000E | 0x000D00 | 0x080000, // 'EH' 07
    0x00000F | 0x000E00 | 0x080000, // 'AE' 08
    0x00000F | 0x000D00 | 0x010000, // 'AA' 09
    0x00000F | 0x000C00 | 0x010000, // 'AH' 10
    0x00000F | 0x000C00 | 0x000000, // 'AO' 11
    0x00000F | 0x000B00 | 0x010000, // 'UH' 12
    0x00000C | 0x000900 | 0x000000, // 'AX' 13
    0x00000D | 0x000B00 | 0x070000, // 'IX' 14
    0x00000C | 0x000B00 | 0x050000, // 'ER' 15
    0x00000F | 0x000C00 | 0x010000, // 'UX' 16
    0x00000F | 0x000C00 | 0x000000, // 'OH' 17
    0x00000D | 0x000C00 | 0x060000, // 'RX' 18
    0x00000D | 0x000800 | 0x010000, // 'LX' 19
    0x00000D | 0x000800 | 0x000000, // 'WX' 20
    0x00000E | 0x000C00 | 0x070000, // 'YX' 21
    0x00000D | 0x000800 | 0x000000, // 'WH' 22
    0x00000C | 0x000A00 | 0x050000, // 'R*' 23
    0x00000D | 0x000800 | 0x010000, // 'L*' 24
    0x00000D | 0x000800 | 0x000000, // 'W*' 25
    0x00000D | 0x000A00 | 0x080000, // 'Y*' 26
    0x00000C | 0x000300 | 0x000000, // 'M*' 27
    0x000009 | 0x000900 | 0x000000, // 'N*' 28
    0x000009 | 0x000600 | 0x030000, // 'NX' 29
    0x000000 | 0x000000 | 0x000000, // 'DX' 30
    0x000000 | 0x000000 | 0x000000, // 'Q*' 31
    0x000000 | 0x000000 | 0x000000, // 'S*' 32
    0x000000 | 0x000000 | 0x000000, // 'SH' 33
    0x000000 | 0x000000 | 0x000000, // 'F*' 34
    0x000000 | 0x000000 | 0x000000, // 'TH' 35
    0x000000 | 0x000000 | 0x000000, // '/H' 36
    0x000000 | 0x000000 | 0x000000, // '/X' 37
    0x00000B | 0x000300 | 0x000000, // 'Z*' 38
    0x00000B | 0x000500 | 0x010000, // 'ZH' 39
    0x00000B | 0x000300 | 0x000000, // 'V*' 40
    0x00000B | 0x000400 | 0x000000, // 'DH' 41
    0x000000 | 0x000000 | 0x000000, // 'CH' 42
    0x000000 | 0x000000 | 0x000000, // '**' 43
    0x000001 | 0x000000 | 0x000000, // 'J*' 44
    0x00000B | 0x000500 | 0x010000, // '**' 45
    0x000000 | 0x000A00 | 0x0E0000, // '**' 46
    0x000002 | 0x000200 | 0x010000, // '**' 47
    0x00000E | 0x000E00 | 0x090000, // 'EY' 48
    0x00000F | 0x000D00 | 0x010000, // 'AY' 49
    0x00000F | 0x000C00 | 0x000000, // 'OY' 50
    0x00000F | 0x000D00 | 0x010000, // 'AW' 51
    0x00000F | 0x000C00 | 0x000000, // 'OW' 52
    0x00000D | 0x000800 | 0x000000, // 'UW' 53
    0x000002 | 0x000000 | 0x000000, // 'B*' 54
    0x000004 | 0x000100 | 0x000000, // '**' 55
    0x000000 | 0x000000 | 0x000000, // '**' 56
    0x000002 | 0x000000 | 0x000000, // 'D*' 57
    0x000004 | 0x000100 | 0x000000, // '**' 58
    0x000000 | 0x000000 | 0x000000, // '**' 59
    0x000001 | 0x000000 | 0x000000, // 'G*' 60
    0x000004 | 0x000100 | 0x000000, // '**' 61
    0x000000 | 0x000000 | 0x000000, // '**' 62
    0x000001 | 0x000000 | 0x000000, // 'GX' 63
    0x000004 | 0x000100 | 0x000000, // '**' 64
    0x000000 | 0x000000 | 0x000000, // '**' 65
    0x000000 | 0x000000 | 0x000000, // 'P*' 66
    0x000000 | 0x000000 | 0x000000, // '**' 67
    0x000000 | 0x000000 | 0x000000, // '**' 68
    0x000000 | 0x000000 | 0x000000, // 'T*' 69
    0x000000 | 0x000000 | 0x000000, // '**' 70
    0x000000 | 0x000000 | 0x000000, // '**' 71
    0x000000 | 0x000000 | 0x000000, // 'K*' 72
    0x00000C | 0x000A00 | 0x070000, // '**' 73
    0x000000 | 0x000000 | 0x000000, // '**' 74
    0x000000 | 0x000000 | 0x000000, // 'KX' 75
    0x000000 | 0x000A00 | 0x050000, // '**' 76
    0x000000 | 0x000000 | 0x000000, // '**' 77
    0x00000F | 0x000000 | 0x130000, // 'UL' 78
    0x00000F | 0x000000 | 0x100000  // 'UM' 79
  ];

  function trans(factor, initialFrequency) {
    return (((factor * initialFrequency) >> 8) & 0xFF) << 1;
  }

  /**
   * SAM's voice can be altered by changing the frequencies of the
   * mouth formant (F1) and the throat formant (F2). Only the
   * vowel/diphthong and sonorant phonemes (5-29 and 48-53) are altered.
   *
   * This returns the three base frequency arrays.
   *
   * @param {Number} mouth  valid values: 0-255
   * @param {Number} throat valid values: 0-255
   *
   * @return {Array}
   */
  function SetMouthThroat(mouth, throat) {
    var freqdata = [[],[],[]];
    frequencyData.map(function (v, i) {
      freqdata[0][i] = v & 0xFF;
      freqdata[1][i] = (v >> 8) & 0xFF;
      freqdata[2][i] = (v >> 16) & 0xFF;
    });

    // recalculate formant frequencies 5..29 for the mouth (F1) and throat (F2)
    for(var pos = 5; pos < 30; pos++) {
      // recalculate mouth frequency
      freqdata[0][pos] = trans(mouth, freqdata[0][pos]);

      // recalculate throat frequency
      freqdata[1][pos] = trans(throat, freqdata[1][pos]);
    }

    // recalculate formant frequencies 48..53
    for(var pos$1 = 48; pos$1 < 54; pos$1++) {
      // recalculate F1 (mouth formant)
      freqdata[0][pos$1] = trans(mouth, freqdata[0][pos$1]);
      // recalculate F2 (throat formant)
      freqdata[1][pos$1] = trans(throat, freqdata[1][pos$1]);
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
    // 2=frequency2
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
    var interpolate = function (width, table, frame, change) {
      var sign      = (change < 0);
      var remainder = Math.abs(change) % width;
      var div       = (change / width) | 0;

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

    var outBlendFrames;
    var inBlendFrames;
    var boundary = 0;
    for (var pos=0;pos<tuples.length - 1;pos++) {
      var phoneme      = tuples[pos][0];
      var next_phoneme = tuples[pos+1][0];

      // get the ranking of each phoneme
      var next_rank = blendRank[next_phoneme];
      var rank      = blendRank[phoneme];

      // compare the rank - lower rank value is stronger
      if (rank === next_rank) {
        // same rank, so use out blend lengths from each phoneme
        outBlendFrames = outBlendLength[phoneme];
        inBlendFrames = outBlendLength[next_phoneme];
      } else if (rank < next_rank) {
        // next phoneme is stronger, so use its blend lengths
        outBlendFrames = inBlendLength[next_phoneme];
        inBlendFrames = outBlendLength[next_phoneme];
      } else {
        // current phoneme is stronger, so use its blend lengths
        // note the out/in are swapped
        outBlendFrames = outBlendLength[phoneme];
        inBlendFrames = inBlendLength[phoneme];
      }
      boundary += tuples[pos][1];
      var trans_end    = boundary + inBlendFrames;
      var trans_start  = boundary - outBlendFrames;
      var trans_length = outBlendFrames + inBlendFrames; // total transition

      if (((trans_length - 2) & 128) === 0) {
        // unlike the other values, the pitches[] interpolates from
        // the middle of the current phoneme to the middle of the
        // next phoneme

        // half the width of the current and next phoneme
        var cur_width  = tuples[pos][1] >> 1;
        var next_width = tuples[pos+1][1] >> 1;
        var pitch = pitches[boundary + next_width] - pitches[boundary - cur_width];
        // interpolate the values
        interpolate(cur_width + next_width, 0, trans_start, pitch);

        for (var table = 1; table < 7;table++) {
          // tables:
          // 0  pitches
          // 1  frequency1
          // 2  frequency2
          // 3  frequency3
          // 4  amplitude1
          // 5  amplitude2
          // 6  amplitude3
          var value = Read(table, trans_end) - Read(table, trans_start);
          interpolate(trans_length, table, trans_start, value);
        }
      }
    }

    // add the length of last phoneme
    return (boundary + tuples[tuples.length - 1][1]);
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
   * to expand the phoneme to. At the default speed, each frame represents
   * about 10 milliseconds of time.
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
      var phase1 = stressPitch_tab47492[tuples[i][2]];
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

      var ref = CreateFrames(
        pitch,
        phonemes,
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
        phonemes
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
       * Rescale volume from decibels to the linear scale.
       */
      var amplitudeRescale = [
        0x00, 0x01, 0x02, 0x02, 0x02, 0x03, 0x03, 0x04,
        0x04, 0x05, 0x06, 0x08, 0x09, 0x0B, 0x0D, 0x0F ];
      for(var i$1 = amplitude[0].length - 1; i$1 >= 0; i$1--) {
        amplitude[0][i$1] = amplitudeRescale[amplitude[0][i$1]];
        amplitude[1][i$1] = amplitudeRescale[amplitude[1][i$1]];
        amplitude[2][i$1] = amplitudeRescale[amplitude[2][i$1]];
      }

    var result = [t, frequency, pitches, amplitude, sampledConsonantFlag];

    return result;
  }

  return PrepareFrames;

})));
