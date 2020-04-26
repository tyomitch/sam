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
  (global = global || self, global.Parser = factory());
}(this, (function () { 'use strict';

  var BREAK = 254;
  var END   = 255;

  var StressTable = '*12345678'.split('');

  var PhonemeNameTable = (
    ' *' + // 00
    '.*' + // 01
    '?*' + // 02
    ',*' + // 03
    '-*' + // 04
    'IY' + // 05
    'IH' + // 06
    'EH' + // 07
    'AE' + // 08
    'AA' + // 09
    'AH' + // 10
    'AO' + // 11
    'UH' + // 12
    'AX' + // 13
    'IX' + // 14
    'ER' + // 15
    'UX' + // 16
    'OH' + // 17
    'RX' + // 18
    'LX' + // 19
    'WX' + // 20
    'YX' + // 21
    'WH' + // 22
    'R*' + // 23
    'L*' + // 24
    'W*' + // 25
    'Y*' + // 26
    'M*' + // 27
    'N*' + // 28
    'NX' + // 29
    'DX' + // 30
    'Q*' + // 31
    'S*' + // 32
    'SH' + // 33
    'F*' + // 34
    'TH' + // 35
    '/H' + // 36
    '/X' + // 37
    'Z*' + // 38
    'ZH' + // 39
    'V*' + // 40
    'DH' + // 41
    'CH' + // 42
    '**' + // 43
    'J*' + // 44
    '**' + // 45
    '**' + // 46
    '**' + // 47
    'EY' + // 48
    'AY' + // 49
    'OY' + // 50
    'AW' + // 51
    'OW' + // 52
    'UW' + // 53
    'B*' + // 54
    '**' + // 55
    '**' + // 56
    'D*' + // 57
    '**' + // 58
    '**' + // 59
    'G*' + // 60
    '**' + // 61
    '**' + // 62
    'GX' + // 63
    '**' + // 64
    '**' + // 65
    'P*' + // 66
    '**' + // 67
    '**' + // 68
    'T*' + // 69
    '**' + // 70
    '**' + // 71
    'K*' + // 72
    '**' + // 73
    '**' + // 74
    'KX' + // 75
    '**' + // 76
    '**' + // 77
    'UL' + // 78
    'UM' + // 79
    'UN'   // 80
  ).match(/.{1,2}/g);

  /**
   * Flags for phoneme names.
   *
   * Merged from the original two tables via: oldFlags[i] | (oldFlags2[i] << 8)
   *
   *  0x8000
   *    ' *', '.*', '?*', ',*', '-*'
   *  0x4000
   *    '.*', '?*', ',*', '-*', 'Q*'
   *  0x2000  FLAG_FRICATIVE
   *    'S*', 'SH', 'F*', 'TH', 'Z*', 'ZH', 'V*', 'DH', 'CH', '**', '**'
   *  0x1000  FLAG_LIQUIC
   *    'R*', 'L*', 'W*', 'Y*'
   *  0x0800  FLAG_NASAL
   *    'M*', 'N*', 'NX'
   *  0x0400  FLAG_ALVEOLAR
   *    'N*', 'DX', 'S*', 'TH', 'Z*', 'DH', 'D*', '**', '**', 'T*', '**',
   *    '**'
   *  0x0200
   *    --- not used ---
   *  0x0100  FLAG_PUNCT
   *    '.*', '?*', ',*', '-*'
   *  0x0080  FLAG_VOWEL
   *    'IY', 'IH', 'EH', 'AE', 'AA', 'AH', 'AO', 'UH', 'AX', 'IX', 'ER',
   *    'UX', 'OH', 'RX', 'LX', 'WX', 'YX', 'EY', 'AY', 'OY', 'AW', 'OW',
   *    'UW', 'UL', 'UM', 'UN'
   *  0x0040  FLAG_CONSONANT
   *    'WH', 'R*', 'L*', 'W*', 'Y*', 'M*', 'N*', 'NX', 'DX', 'Q*', 'S*',
   *    'SH', 'F*', 'TH', '/H', '/X', 'Z*', 'ZH', 'V*', 'DH', 'CH', '**',
   *    'J*', '**', 'B*', '**', '**', 'D*', '**', '**', 'G*', '**', '**',
   *    'GX', '**', '**', 'P*', '**', '**', 'T*', '**', '**', 'K*', '**',
   *    '**', 'KX', '**', '**', 'UM', 'UN'
   *  0x0020  FLAG_DIP_YX  but looks like front vowels
   *    'IY', 'IH', 'EH', 'AE', 'AA', 'AH', 'AX', 'IX', 'EY', 'AY', 'OY'
   *  0x0010  FLAG_DIPTHONG
   *    'EY', 'AY', 'OY', 'AW', 'OW', 'UW'
   *  0x0008
   *    'M*', 'N*', 'NX', 'DX', 'Q*', 'CH', 'J*', 'B*', '**', '**', 'D*',
   *    '**', '**', 'G*', '**', '**', 'GX', '**', '**', 'P*', '**', '**',
   *    'T*', '**', '**', 'K*', '**', '**', 'KX', '**', '**'
   *  0x0004  FLAG_VOICED
   *    'IY', 'IH', 'EH', 'AE', 'AA', 'AH', 'AO', 'UH', 'AX', 'IX', 'ER',
   *    'UX', 'OH', 'RX', 'LX', 'WX', 'YX', 'WH', 'R*', 'L*', 'W*', 'Y*',
   *    'M*', 'N*', 'NX', 'Q*', 'Z*', 'ZH', 'V*', 'DH', 'J*', '**', 'EY',
   *    'AY', 'OY', 'AW', 'OW', 'UW', 'B*', '**', '**', 'D*', '**', '**',
   *    'G*', '**', '**', 'GX', '**', '**'
   *  0x0002  FLAG_STOPCONS
   *    'B*', '**', '**', 'D*', '**', '**', 'G*', '**', '**', 'GX', '**',
   *    '**', 'P*', '**', '**', 'T*', '**', '**', 'K*', '**', '**', 'KX',
   *    '**', '**'
   *  0x0001  FLAG_PLOSIVE
   *    'P*', '**', '**', 'T*', '**', '**', 'K*', '**', '**', 'KX', '**',
   *    '**', 'UM', 'UN'
   */
  var phonemeFlags = [
    0 | 0x8000,                                                                                                                                        // ' *' 00
    0 | 0x8000 | 0x4000                                              | 0x0100,                                                                         // '.*' 01
    0 | 0x8000 | 0x4000                                              | 0x0100,                                                                         // '?*' 02
    0 | 0x8000 | 0x4000                                              | 0x0100,                                                                         // ',*' 03
    0 | 0x8000 | 0x4000                                              | 0x0100,                                                                         // '-*' 04
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'IY' 05
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'IH' 06
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'EH' 07
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'AE' 08
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'AA' 09
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'AH' 10
    0                                                                         | 0x0080                                     | 0x0004,                   // 'AO' 11
    0                                                                         | 0x0080                                     | 0x0004,                   // 'UH' 12
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'AX' 13
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'IX' 14
    0                                                                         | 0x0080                                     | 0x0004,                   // 'ER' 15
    0                                                                         | 0x0080                                     | 0x0004,                   // 'UX' 16
    0                                                                         | 0x0080                                     | 0x0004,                   // 'OH' 17
    0                                                                         | 0x0080                                     | 0x0004,                   // 'RX' 18
    0                                                                         | 0x0080                                     | 0x0004,                   // 'LX' 19
    0                                                                         | 0x0080                                     | 0x0004,                   // 'WX' 20
    0                                                                         | 0x0080                                     | 0x0004,                   // 'YX' 21
    0                                                                                  | 0x0040                            | 0x0004,                   // 'WH' 22
    0                            | 0x1000                                              | 0x0040                            | 0x0004,                   // 'R*' 23
    0                            | 0x1000                                              | 0x0040                            | 0x0004,                   // 'L*' 24
    0                            | 0x1000                                              | 0x0040                            | 0x0004,                   // 'W*' 25
    0                            | 0x1000                                              | 0x0040                            | 0x0004,                   // 'Y*' 26
    0                                     | 0x0800                                     | 0x0040                   | 0x0008 | 0x0004,                   // 'M*' 27
    0                                     | 0x0800 | 0x0400                            | 0x0040                   | 0x0008 | 0x0004,                   // 'N*' 28
    0                                     | 0x0800                                     | 0x0040                   | 0x0008 | 0x0004,                   // 'NX' 29
    0                                              | 0x0400                            | 0x0040                   | 0x0008,                            // 'DX' 30
    0          | 0x4000                                                                | 0x0040                   | 0x0008 | 0x0004,                   // 'Q*' 31
    0                   | 0x2000                   | 0x0400                            | 0x0040,                                                       // 'S*' 32
    0                   | 0x2000                                                       | 0x0040,                                                       // 'SH' 33
    0                   | 0x2000                                                       | 0x0040,                                                       // 'F*' 34
    0                   | 0x2000                   | 0x0400                            | 0x0040,                                                       // 'TH' 35
    0                                                                                  | 0x0040,                                                       // '/H' 36
    0                                                                                  | 0x0040,                                                       // '/X' 37
    0                   | 0x2000                   | 0x0400                            | 0x0040                            | 0x0004,                   // 'Z*' 38
    0                   | 0x2000                                                       | 0x0040                            | 0x0004,                   // 'ZH' 39
    0                   | 0x2000                                                       | 0x0040                            | 0x0004,                   // 'V*' 40
    0                   | 0x2000                   | 0x0400                            | 0x0040                            | 0x0004,                   // 'DH' 41
    0                   | 0x2000                                                       | 0x0040                   | 0x0008,                            // 'CH' 42
    0                   | 0x2000                                                       | 0x0040,                                                       // '**' 43
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004,                   // 'J*' 44
    0                   | 0x2000                                                       | 0x0040                            | 0x0004,                   // '**' 45
    0,                                                                                                                                                 // '**' 46
    0,                                                                                                                                                 // '**' 47
    0                                                                         | 0x0080          | 0x0020 | 0x0010          | 0x0004,                   // 'EY' 48
    0                                                                         | 0x0080          | 0x0020 | 0x0010          | 0x0004,                   // 'AY' 49
    0                                                                         | 0x0080          | 0x0020 | 0x0010          | 0x0004,                   // 'OY' 50
    0                                                                         | 0x0080                   | 0x0010          | 0x0004,                   // 'AW' 51
    0                                                                         | 0x0080                   | 0x0010          | 0x0004,                   // 'OW' 52
    0                                                                         | 0x0080                   | 0x0010          | 0x0004,                   // 'UW' 53
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // 'B*' 54
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 55
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 56
    0                                              | 0x0400                            | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // 'D*' 57
    0                                              | 0x0400                            | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 58
    0                                              | 0x0400                            | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 59
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // 'G*' 60
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 61
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 62
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // 'GX' 63
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 64
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 65
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // 'P*' 66
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 67
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 68
    0                                              | 0x0400                            | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // 'T*' 69
    0                                              | 0x0400                            | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 70
    0                                              | 0x0400                            | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 71
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // 'K*' 72
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 73
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 74
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // 'KX' 75
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 76
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 77
    0                                                                         | 0x0080,                                                                // 'UL' 78
    0                                                                         | 0x0080 | 0x0040                                              | 0x0001, // 'UM' 79
    0                                                                         | 0x0080 | 0x0040                                              | 0x0001  // 'UN' 80
  ];

  /**
   * Combined table of phoneme length.
   *
   * Merged from the original two tables via: phonemeLengthTable[i] | (phonemeStressedLengthTable[i] << 8)
   *
   * Use via:
   *  phonemeLengthTable[i] = combinedPhonemeLengthTable[i] & 0xFF
   *  phonemeStressedLengthTable[i] = combinedPhonemeLengthTable[i] >> 8
   */
  var combinedPhonemeLengthTable = [
    0x0000 | 0x0000, // ' *' 00
    0x0012 | 0x1200, // '.*' 01
    0x0012 | 0x1200, // '?*' 02
    0x0012 | 0x1200, // ',*' 03
    0x0008 | 0x0800, // '-*' 04
    0x0008 | 0x0B00, // 'IY' 05
    0x0008 | 0x0900, // 'IH' 06
    0x0008 | 0x0B00, // 'EH' 07
    0x0008 | 0x0E00, // 'AE' 08
    0x000B | 0x0F00, // 'AA' 09
    0x0006 | 0x0B00, // 'AH' 10
    0x000C | 0x1000, // 'AO' 11
    0x000A | 0x0C00, // 'UH' 12
    0x0005 | 0x0600, // 'AX' 13
    0x0005 | 0x0600, // 'IX' 14
    0x000B | 0x0E00, // 'ER' 15
    0x000A | 0x0C00, // 'UX' 16
    0x000A | 0x0E00, // 'OH' 17
    0x000A | 0x0C00, // 'RX' 18
    0x0009 | 0x0B00, // 'LX' 19
    0x0008 | 0x0800, // 'WX' 20
    0x0007 | 0x0800, // 'YX' 21
    0x0009 | 0x0B00, // 'WH' 22
    0x0007 | 0x0A00, // 'R*' 23
    0x0006 | 0x0900, // 'L*' 24
    0x0008 | 0x0800, // 'W*' 25
    0x0006 | 0x0800, // 'Y*' 26
    0x0007 | 0x0800, // 'M*' 27
    0x0007 | 0x0800, // 'N*' 28
    0x0007 | 0x0800, // 'NX' 29
    0x0002 | 0x0300, // 'DX' 30
    0x0005 | 0x0500, // 'Q*' 31
    0x0002 | 0x0200, // 'S*' 32
    0x0002 | 0x0200, // 'SH' 33
    0x0002 | 0x0200, // 'F*' 34
    0x0002 | 0x0200, // 'TH' 35
    0x0002 | 0x0200, // '/H' 36
    0x0002 | 0x0200, // '/X' 37
    0x0006 | 0x0600, // 'Z*' 38
    0x0006 | 0x0600, // 'ZH' 39
    0x0007 | 0x0800, // 'V*' 40
    0x0006 | 0x0600, // 'DH' 41
    0x0006 | 0x0600, // 'CH' 42
    0x0002 | 0x0200, // '**' 43
    0x0008 | 0x0900, // 'J*' 44
    0x0003 | 0x0400, // '**' 45
    0x0001 | 0x0200, // '**' 46
    0x001E | 0x0100, // '**' 47
    0x000D | 0x0E00, // 'EY' 48
    0x000C | 0x0F00, // 'AY' 49
    0x000C | 0x0F00, // 'OY' 50
    0x000C | 0x0F00, // 'AW' 51
    0x000E | 0x0E00, // 'OW' 52
    0x0009 | 0x0E00, // 'UW' 53
    0x0006 | 0x0800, // 'B*' 54
    0x0001 | 0x0200, // '**' 55
    0x0002 | 0x0200, // '**' 56
    0x0005 | 0x0700, // 'D*' 57
    0x0001 | 0x0200, // '**' 58
    0x0001 | 0x0100, // '**' 59
    0x0006 | 0x0700, // 'G*' 60
    0x0001 | 0x0200, // '**' 61
    0x0002 | 0x0200, // '**' 62
    0x0006 | 0x0700, // 'GX' 63
    0x0001 | 0x0200, // '**' 64
    0x0002 | 0x0200, // '**' 65
    0x0008 | 0x0800, // 'P*' 66
    0x0002 | 0x0200, // '**' 67
    0x0002 | 0x0200, // '**' 68
    0x0004 | 0x0600, // 'T*' 69
    0x0002 | 0x0200, // '**' 70
    0x0002 | 0x0200, // '**' 71
    0x0006 | 0x0700, // 'K*' 72
    0x0001 | 0x0200, // '**' 73
    0x0004 | 0x0400, // '**' 74
    0x0006 | 0x0700, // 'KX' 75
    0x0001 | 0x0100, // '**' 76
    0x0004 | 0x0400, // '**' 77
    0x00C7 | 0x0500, // 'UL' 78
    0x00FF | 0x0500  // 'UM' 79
  ];

  /*

  Ind  | phoneme |  flags   |
  -----|---------|----------|
  0    |   *     | 00000000 |
  1    |  .*     | 00000000 |
  2    |  ?*     | 00000000 |
  3    |  ,*     | 00000000 |
  4    |  -*     | 00000000 |

  VOWELS
  5    |  IY     | 10100100 |
  6    |  IH     | 10100100 |
  7    |  EH     | 10100100 |
  8    |  AE     | 10100100 |
  9    |  AA     | 10100100 |
  10   |  AH     | 10100100 |
  11   |  AO     | 10000100 |
  17   |  OH     | 10000100 |
  12   |  UH     | 10000100 |
  16   |  UX     | 10000100 |
  15   |  ER     | 10000100 |
  13   |  AX     | 10100100 |
  14   |  IX     | 10100100 |

  DIPHTONGS
  48   |  EY     | 10110100 |
  49   |  AY     | 10110100 |
  50   |  OY     | 10110100 |
  51   |  AW     | 10010100 |
  52   |  OW     | 10010100 |
  53   |  UW     | 10010100 |


  21   |  YX     | 10000100 |
  20   |  WX     | 10000100 |
  18   |  RX     | 10000100 |
  19   |  LX     | 10000100 |
  37   |  /X     | 01000000 |
  30   |  DX     | 01001000 |


  22   |  WH     | 01000100 |


  VOICED CONSONANTS
  23   |  R*     | 01000100 |
  24   |  L*     | 01000100 |
  25   |  W*     | 01000100 |
  26   |  Y*     | 01000100 |
  27   |  M*     | 01001100 |
  28   |  N*     | 01001100 |
  29   |  NX     | 01001100 |
  54   |  B*     | 01001110 |
  57   |  D*     | 01001110 |
  60   |  G*     | 01001110 |
  44   |  J*     | 01001100 |
  38   |  Z*     | 01000100 |
  39   |  ZH     | 01000100 |
  40   |  V*     | 01000100 |
  41   |  DH     | 01000100 |

  unvoiced CONSONANTS
  32   |  S*     | 01000000 |
  33   |  SH     | 01000000 |
  34   |  F*     | 01000000 |
  35   |  TH     | 01000000 |
  66   |  P*     | 01001011 |
  69   |  T*     | 01001011 |
  72   |  K*     | 01001011 |
  42   |  CH     | 01001000 |
  36   |  /H     | 01000000 |

  43   |  **     | 01000000 |
  45   |  **     | 01000100 |
  46   |  **     | 00000000 |
  47   |  **     | 00000000 |


  55   |  **     | 01001110 |
  56   |  **     | 01001110 |
  58   |  **     | 01001110 |
  59   |  **     | 01001110 |
  61   |  **     | 01001110 |
  62   |  **     | 01001110 |
  63   |  GX     | 01001110 |
  64   |  **     | 01001110 |
  65   |  **     | 01001110 |
  67   |  **     | 01001011 |
  68   |  **     | 01001011 |
  70   |  **     | 01001011 |
  71   |  **     | 01001011 |
  73   |  **     | 01001011 |
  74   |  **     | 01001011 |
  75   |  KX     | 01001011 |
  76   |  **     | 01001011 |
  77   |  **     | 01001011 |


  SPECIAL
  78   |  UL     | 10000000 |
  79   |  UM     | 11000001 |
  80   |  UN     | 11000001 |
  31   |  Q*     | 01001100 |

  */

  /**
   * Match both characters but not with wildcards.
   *
   * @param {string} sign1
   * @param {string} sign2
   * @return {boolean|Number}
   */
  function full_match(sign1, sign2) {
    var index = PhonemeNameTable.findIndex(function (value) {
      return ((value === sign1 + sign2) && (value[1] !== '*'))
    });
    return index !== -1 ? index : false;
  }

  /**
   * Match character with wildcard.
   *
   * @param {string} sign1
   * @return {boolean|Number}
   */
  function wild_match (sign1) {
    var index = PhonemeNameTable.findIndex(function (value) {
      return (value === sign1 + '*')
    });
    return index !== -1 ? index : false;
  }

  /**
   * The input[] buffer contains a string of phonemes and stress markers along
   * the lines of:
   *
   *     DHAX KAET IHZ AH5GLIY.
   *
   * Some phonemes are 2 bytes long, such as "DH" and "AX".
   * Others are 1 byte long, such as "T" and "Z".
   * There are also stress markers, such as "5" and ".".
   *
   * The characters of the phonemes are stored in the table PhonemeNameTable.
   * The stress characters are arranged in low to high stress order in StressTable[].
   *
   * The following process is used to parse the input buffer:
   *
   * Repeat until the end is reached:
   * 1. First, a search is made for a 2 character match for phonemes that do not
   *    end with the '*' (wildcard) character. On a match, the index of the phoneme
   *    is added to the result and the buffer position is advanced 2 bytes.
   *
   * 2. If this fails, a search is made for a 1 character match against all
   *    phoneme names ending with a '*' (wildcard). If this succeeds, the
   *    phoneme is added to result and the buffer position is advanced
   *    1 byte.
   *
   * 3. If this fails, search for a 1 character match in the stressInputTable[].
   *   If this succeeds, the stress value is placed in the last stress[] table
   *   at the same index of the last added phoneme, and the buffer position is
   *   advanced by 1 byte.
   *
   * If this fails, return false.
   *
   * On success:
   *
   *    1. phonemeIndex[] will contain the index of all the phonemes.
   *    2. The last index in phonemeIndex[] will be 255.
   *    3. stress[] will contain the stress value for each phoneme
   *
   * input holds the string of phonemes, each two bytes wide
   * signInputTable1[] holds the first character of each phoneme
   * signInputTable2[] holds the second character of each phoneme
   * phonemeIndex[] holds the indexes of the phonemes after parsing input[]
   *
   * The parser scans through the input[], finding the names of the phonemes
   * by searching signInputTable1[] and signInputTable2[]. On a match, it
   * copies the index of the phoneme into the phonemeIndexTable[].
   *
   * @param {string}   input      Holds the string of phonemes, each two bytes wide.
   * @param {function} addPhoneme The callback to use to store phoneme index values.
   * @param {function} addStress  The callback to use to store stress index values.
   *
   * @return {undefined}
   */
  function Parser1(input, addPhoneme, addStress) {
    for (var srcPos=0;srcPos<input.length;srcPos++) {
      {
        var tmp = input.toLowerCase();
        console.log(
          ("processing \"" + (tmp.substr(0, srcPos)) + "%c" + (tmp.substr(srcPos, 2).toUpperCase()) + "%c" + (tmp.substr(srcPos + 2)) + "\""),
           'color: red;',
           'color:normal;'
        );
      }
      var sign1 = input[srcPos];
      var sign2 = input[srcPos + 1] || '';
      var match = (void 0);
      if ((match = full_match(sign1, sign2)) !== false) {
        // Matched both characters (no wildcards)
        srcPos++; // Skip the second character of the input as we've matched it
        addPhoneme(match);
        continue;
      }
      if ((match = wild_match(sign1)) !== false) {
        // Matched just the first character (with second character matching '*'
        addPhoneme(match);
        continue;
      }

      // Should be a stress character. Search through the stress table backwards.
      match = StressTable.length;
      while ((sign1 !== StressTable[match]) && (match > 0)) {
        --match;
      }

      if (match === 0) {
        {
          throw Error(("Could not parse char " + sign1));
        }
      }
      addStress(match); // Set stress for prior phoneme
    }
  }

  /**
   * Test if a bit is set.
   * @param {Number} bits The bits.
   * @param {Number} mask The mask to test.
   * @return {boolean}
   */
  function matchesBitmask (bits, mask) {
    return (bits & mask) !== 0;
  }

  /**
   * Test if a phoneme has the given flag.
   *
   * @param {Number} phoneme The phoneme to test.
   * @param {Number} flag    The flag to test (see constants.es6)
   *
   * @return {boolean}
   */
  function phonemeHasFlag(phoneme, flag) {
    return matchesBitmask(phonemeFlags[phoneme], flag);
  }

  var pR    = 23;
  var pD    = 57;
  var pT    = 69;


  var FLAG_FRICATIVE= 0x2000;

  /**
   * liquic consonant
   */
  var FLAG_LIQUIC   = 0x1000;

  var FLAG_NASAL    = 0x0800;

  var FLAG_ALVEOLAR = 0x0400;

  var FLAG_PUNCT    = 0x0100;

  var FLAG_VOWEL    = 0x0080;

  var FLAG_CONSONANT= 0x0040;
  /**
   *  dipthong ending with YX
   *
   */
  var FLAG_DIP_YX   = 0x0020;

  var FLAG_DIPTHONG = 0x0010;
  /** unknown:
   *    'M*', 'N*', 'NX', 'DX', 'Q*', 'CH', 'J*', 'B*', '**', '**', 'D*',
   *    '**', '**', 'G*', '**', '**', 'GX', '**', '**', 'P*', '**', '**',
   *    'T*', '**', '**', 'K*', '**', '**', 'KX', '**', '**'
   */
  var FLAG_0008     = 0x0008;

  var FLAG_VOICED   = 0x0004;

  /**
   * stop consonant
   */
  var FLAG_STOPCONS = 0x0002;

  var FLAG_PLOSIVE  = 0x0001;

  /**
   * Rewrites the phonemes using the following rules:
   *
   * <DIPHTHONG ENDING WITH WX> -> <DIPHTHONG ENDING WITH WX> WX
   * <DIPHTHONG NOT ENDING WITH WX> -> <DIPHTHONG NOT ENDING WITH WX> YX
   * UL -> AX L
   * UM -> AX M
   * <STRESSED VOWEL> <SILENCE> <STRESSED VOWEL> -> <STRESSED VOWEL> <SILENCE> Q <VOWEL>
   * T R -> CH R
   * D R -> J R
   * <VOWEL> R -> <VOWEL> RX
   * <VOWEL> L -> <VOWEL> LX
   * G S -> G Z
   * K <VOWEL OR DIPHTHONG NOT ENDING WITH IY> -> KX <VOWEL OR DIPHTHONG NOT ENDING WITH IY>
   * G <VOWEL OR DIPHTHONG NOT ENDING WITH IY> -> GX <VOWEL OR DIPHTHONG NOT ENDING WITH IY>
   * S P -> S B
   * S T -> S D
   * S K -> S G
   * S KX -> S GX
   * <ALVEOLAR> UW -> <ALVEOLAR> UX
   * CH -> CH CH' (CH requires two phonemes to represent it)
   * J -> J J' (J requires two phonemes to represent it)
   * <UNSTRESSED VOWEL> T <PAUSE> -> <UNSTRESSED VOWEL> DX <PAUSE>
   * <UNSTRESSED VOWEL> D <PAUSE>  -> <UNSTRESSED VOWEL> DX <PAUSE>
   *
   * @param {insertPhoneme}    insertPhoneme
   * @param {setPhoneme}       setPhoneme
   * @param {getPhoneme}       getPhoneme
   * @param {getPhonemeStress} getStress
   *
   * @return undefined
   */
  function Parser2(insertPhoneme, setPhoneme, getPhoneme, getStress) {
    /**
     * Rewrites:
     *  'UW' => 'UX' if alveolar flag set on previous phoneme.
     *  'CH' => 'CH' '**'(43)
     *  'J*' => 'J*' '**'(45)
     * @param phoneme
     * @param pos
     */
    var handleUW_CH_J = function (phoneme, pos) {
      switch (phoneme) {
        // 'UW' Example: NEW, DEW, SUE, ZOO, THOO, TOO
        case 53: {
          // ALVEOLAR flag set?
          if (phonemeHasFlag(getPhoneme(pos - 1), FLAG_ALVEOLAR)) {
            { console.log((pos + " RULE: <ALVEOLAR> UW -> <ALVEOLAR> UX")); }
            setPhoneme(pos, 16); // UX
          }
          break;
        }
        // 'CH' Example: CHEW
        case 42: {
          { console.log((pos + " RULE: CH -> CH CH+1")); }
          insertPhoneme(pos + 1, 43, getStress(pos)); // '**'
          break;
        }
        // 'J*' Example: JAY
        case 44: {
          { console.log((pos + " RULE: J -> J J+1")); }
          insertPhoneme(pos + 1, 45, getStress(pos)); // '**'
          break;
        }
      }
    };

    var changeAX = function (position, suffix) {
      {
        console.log((position + " RULE: " + (PhonemeNameTable[getPhoneme(position)]) + " -> AX " + (PhonemeNameTable[suffix])));
      }
      setPhoneme(position, 13); // 'AX'
      insertPhoneme(position + 1, suffix, getStress(position));
    };

    var pos = -1;
    var phoneme;

    while((phoneme = getPhoneme(++pos)) !== END) {
      // Is phoneme pause?
      if (phoneme === 0) {
        continue;
      }

      if (phonemeHasFlag(phoneme, FLAG_DIPTHONG)) {
        // <DIPHTHONG ENDING WITH WX> -> <DIPHTHONG ENDING WITH WX> WX
        // <DIPHTHONG NOT ENDING WITH WX> -> <DIPHTHONG NOT ENDING WITH WX> YX
        // Example: OIL, COW
        {
          console.log(
            !phonemeHasFlag(phoneme, FLAG_DIP_YX)
              ? (pos + " RULE: insert WX following diphthong NOT ending in IY sound")
              : (pos + " RULE: insert YX following diphthong ending in IY sound")
          );
        }
        // If ends with IY, use YX, else use WX
        // Insert at WX or YX following, copying the stress
        // 'WX' = 20 'YX' = 21
        insertPhoneme(pos + 1, phonemeHasFlag(phoneme, FLAG_DIP_YX) ? 21 : 20, getStress(pos));
        handleUW_CH_J(phoneme, pos);
        continue;
      }
      if (phoneme === 78) {
        // 'UL' => 'AX' 'L*'
        // Example: MEDDLE
        changeAX(pos, 24);
        continue;
      }
      if (phoneme === 79) {
        // 'UM' => 'AX' 'M*'
        // Example: ASTRONOMY
        changeAX(pos, 27);
        continue;
      }
      if (phoneme === 80) {
        // 'UN' => 'AX' 'N*'
        changeAX(pos, 28);
        continue;
      }
      if (phonemeHasFlag(phoneme, FLAG_VOWEL) && getStress(pos)) {
        // Example: FUNCTION
        // RULE:
        //       <STRESSED VOWEL> <SILENCE> <STRESSED VOWEL> -> <STRESSED VOWEL> <SILENCE> Q <VOWEL>
        // EXAMPLE: AWAY EIGHT
        if (!getPhoneme(pos+1)) { // If following phoneme is a pause, get next
          phoneme = getPhoneme(pos+2);
          if (phoneme !== END && phonemeHasFlag(phoneme, FLAG_VOWEL) && getStress(pos+2)) {
            {
              console.log(((pos+2) + " RULE: Insert glottal stop between two stressed vowels with space between them"));
            }
            insertPhoneme(pos+2, 31, 0); // 31 = 'Q'
          }
        }
        continue;
      }

      var priorPhoneme = (pos === 0) ? END : getPhoneme(pos - 1);

      if (phoneme === pR) {
        // RULES FOR PHONEMES BEFORE R
        switch (priorPhoneme) {
          case pT: {
            // Example: TRACK
            { console.log((pos + " RULE: T* R* -> CH R*")); }
            setPhoneme(pos - 1, 42); // 'T*' 'R*' -> 'CH' 'R*'
            break;
          }
          case pD: {
            // Example: DRY
            { console.log((pos + " RULE: D* R* -> J* R*")); }
            setPhoneme(pos - 1, 44); // 'J*'
            break;
          }
          default: {
            if (phonemeHasFlag(priorPhoneme, FLAG_VOWEL)) {
              // Example: ART
              { console.log((pos + " <VOWEL> R* -> <VOWEL> RX")); }
              setPhoneme(pos, 18); // 'RX'
            }
          }
        }
        continue;
      }

      // 'L*'
      if ((phoneme === 24) && phonemeHasFlag(priorPhoneme, FLAG_VOWEL)) {
        // Example: ALL
        { console.log((pos + " <VOWEL> L* -> <VOWEL> LX")); }
        setPhoneme(pos, 19); // 'LX'
        continue;
      }
      // 'G*' 'S*'
      if (priorPhoneme === 60 && phoneme === 32) {
        // Can't get to fire -
        //       1. The G -> GX rule intervenes
        //       2. Reciter already replaces GS -> GZ
        { console.log((pos + " G S -> G Z")); }
        setPhoneme(pos, 38);
        continue;
      }

      // 'G*'
      if (phoneme === 60) {
        // G <VOWEL OR DIPHTHONG NOT ENDING WITH IY> -> GX <VOWEL OR DIPHTHONG NOT ENDING WITH IY>
        // Example: GO
        var phoneme$1 = getPhoneme(pos + 1);
        // If diphthong ending with YX, move continue processing next phoneme
        if (!phonemeHasFlag(phoneme$1, FLAG_DIP_YX) && (phoneme$1 !== END)) {
          // replace G with GX and continue processing next phoneme
          {
            console.log(
              (pos + " RULE: G <VOWEL OR DIPTHONG NOT ENDING WITH IY> -> GX <VOWEL OR DIPTHONG NOT ENDING WITH IY>")
            );
          }
          setPhoneme(pos, 63); // 'GX'
        }
        continue;
      }

      // 'K*'
      if (phoneme === 72) {
        // K <VOWEL OR DIPHTHONG NOT ENDING WITH IY> -> KX <VOWEL OR DIPHTHONG NOT ENDING WITH IY>
        // Example: COW
        var Y = getPhoneme(pos + 1);
        // If at end, replace current phoneme with KX
        if (!phonemeHasFlag(Y, FLAG_DIP_YX) || Y === END) {
          // VOWELS AND DIPHTHONGS ENDING WITH IY SOUND flag set?
          {
            console.log((pos + " K <VOWEL OR DIPTHONG NOT ENDING WITH IY> -> KX <VOWEL OR DIPTHONG NOT ENDING WITH IY>"));
          }
          setPhoneme(pos, 75);
          phoneme  = 75;
        }
      }

      // Replace with softer version?
      if (phonemeHasFlag(phoneme, FLAG_PLOSIVE) && (priorPhoneme === 32)) { // 'S*'
        // RULE:
        //   'S*' 'P*' -> 'S*' 'B*'
        //   'S*' 'T*' -> 'S*' 'D*'
        //   'S*' 'K*' -> 'S*' 'G*'
        //   'S*' 'KX' -> 'S*' 'GX'
        //   'S*' 'UM' -> 'S*' '**'
        //   'S*' 'UN' -> 'S*' '**'
        // Examples: SPY, STY, SKY, SCOWL
        {
          console.log((pos + " RULE: S* " + (PhonemeNameTable[phoneme]) + " -> S* " + (PhonemeNameTable[phoneme-12])));
        }
        setPhoneme(pos, phoneme - 12);
      } else if (!phonemeHasFlag(phoneme, FLAG_PLOSIVE)) {
        handleUW_CH_J(phoneme, pos);
      }

      // 'T*', 'D*'
      if (phoneme === 69 || phoneme === 57) {
        // RULE: Soften T following vowel
        // NOTE: This rule fails for cases such as "ODD"
        //       <UNSTRESSED VOWEL> T <PAUSE> -> <UNSTRESSED VOWEL> DX <PAUSE>
        //       <UNSTRESSED VOWEL> D <PAUSE>  -> <UNSTRESSED VOWEL> DX <PAUSE>
        // Example: PARTY, TARDY
        if ((pos > 0) && phonemeHasFlag(getPhoneme(pos-1), FLAG_VOWEL)) {
          phoneme = getPhoneme(pos + 1);
          if (!phoneme) {
            phoneme = getPhoneme(pos + 2);
          }
          if (phonemeHasFlag(phoneme, FLAG_VOWEL) && !getStress(pos+1)) {
            {
              console.log((pos + " Soften T or D following vowel or ER and preceding a pause -> DX"));
            }
            setPhoneme(pos, 30);
          }
        }
        continue;
      }

      {
        console.log((pos + ": " + (PhonemeNameTable[phoneme])));
      }
    } // while
  }

  /**
   * Applies various rules that adjust the lengths of phonemes
   *
   * Lengthen <FRICATIVE> or <VOICED> between <VOWEL> and <PUNCTUATION> by 1.5
   * <VOWEL> <RX | LX> <CONSONANT> - decrease <VOWEL> length by 1
   * <VOWEL> <UNVOICED PLOSIVE> - decrease vowel by 1/8th
   * <VOWEL> <UNVOICED CONSONANT> - increase vowel by 1/2 + 1
   * <NASAL> <STOP CONSONANT> - set nasal = 5, consonant = 6
   * <VOICED STOP CONSONANT> {optional silence} <STOP CONSONANT> - shorten both to 1/2 + 1
   * <LIQUID CONSONANT> <DIPTHONG> - decrease by 2
   *
   * @param {getPhoneme}    getPhoneme Callback for retrieving phonemes.
   * @param {setPhonemeLength} setLength  Callback for setting phoneme length.
   * @param {getPhonemeLength} getLength  Callback for retrieving phoneme length.
   *
   * @return undefined
   */
  function AdjustLengths(getPhoneme, setLength, getLength) {
    {
      console.log("AdjustLengths()");
    }

    // LENGTHEN VOWELS PRECEDING PUNCTUATION
    //
    // Search for punctuation. If found, back up to the first vowel, then
    // process all phonemes between there and up to (but not including) the punctuation.
    // If any phoneme is found that is a either a fricative or voiced, the duration is
    // increased by (length * 1.5) + 1

    // loop index
    for (var position = 0;getPhoneme(position) !== END;position++) {
      // not punctuation?
      if(!phonemeHasFlag(getPhoneme(position), FLAG_PUNCT)) {
        continue;
      }
      var loopIndex$1 = position;
      while ((--position > 1) && !phonemeHasFlag(getPhoneme(position), FLAG_VOWEL)) { /* back up while not a vowel */ }
      // If beginning of phonemes, exit loop.
      if (position === 0) {
        break;
      }

      // Now handle everything between position and loopIndex
      for (var vowel=position;position<loopIndex$1;position++) {
        // test for not fricative/unvoiced or not voiced
        if(!phonemeHasFlag(getPhoneme(position), FLAG_FRICATIVE) || phonemeHasFlag(getPhoneme(position), FLAG_VOICED)) {
          //nochmal überprüfen
          var A = getLength(position);
          // change phoneme length to (length * 1.5) + 1
          {
            console.log(
              position + ' RULE: Lengthen <!FRICATIVE> or <VOICED> ' +
              PhonemeNameTable[getPhoneme(position)] +
              ' between VOWEL:' + PhonemeNameTable[getPhoneme(vowel)] +
              ' and PUNCTUATION:'+PhonemeNameTable[getPhoneme(position)] +
              ' by 1.5'
            );
          }
          setLength(position, (A >> 1) + A + 1);
        }
      }
    }

    // Similar to the above routine, but shorten vowels under some circumstances
    // Loop through all phonemes
    var loopIndex = -1;
    var phoneme;

    while((phoneme = getPhoneme(++loopIndex)) !== END) {
      var position$1 = loopIndex;
      // vowel?
      if (phonemeHasFlag(phoneme, FLAG_VOWEL)) {
        // get next phoneme
        phoneme = getPhoneme(++position$1);
        // not a consonant
        if (!phonemeHasFlag(phoneme, FLAG_CONSONANT)) {
          // 'RX' or 'LX'?
          if (((phoneme === 18) || (phoneme === 19)) && phonemeHasFlag(getPhoneme(++position$1), FLAG_CONSONANT)) {
            // followed by consonant?
            {
              console.log(
                loopIndex +
                ' RULE: <VOWEL ' +
                PhonemeNameTable[getPhoneme(loopIndex)] +
                '>' + PhonemeNameTable[phoneme] +
                ' <CONSONANT: ' + PhonemeNameTable[getPhoneme(position$1)] +
                '> - decrease length of vowel by 1'
              );
            }
            // decrease length of vowel by 1 frame
            setLength(loopIndex, getLength(loopIndex) - 1);
          }
          continue;
        }
        // Got here if not <VOWEL>
        // FIXME: above comment is in fact incorrect - we end up here for consonants!
        // 0x41 = 65 if end marker === FLAG_CONSONANT | FLAG_PLOSIVE
        // FIXME: shouldn't this be FLAG_VOICED | FLAG_PLOSIVE here? We skip through the checks this way.
        var flags = (phoneme === END) ? (FLAG_CONSONANT | FLAG_PLOSIVE) : phonemeFlags[phoneme];
        // Unvoiced
        if (!matchesBitmask(flags, FLAG_VOICED)) {
          // *, .*, ?*, ,*, -*, DX, S*, SH, F*, TH, /H, /X, CH, P*, T*, K*, KX

          // unvoiced plosive
          if(matchesBitmask(flags, FLAG_PLOSIVE)) {
            // RULE: <VOWEL> <UNVOICED PLOSIVE>
            // <VOWEL> <P*, T*, K*, KX>
            {
              console.log((loopIndex + " <VOWEL> <UNVOICED PLOSIVE> - decrease vowel by 1/8th"));
            }
            var A$1 = getLength(loopIndex);
            setLength(loopIndex, A$1 - (A$1 >> 3));
          }
          continue;
        }

        // RULE: <VOWEL> <VOICED CONSONANT>
        // <VOWEL> <WH, R*, L*, W*, Y*, M*, N*, NX, DX, Q*, Z*, ZH, V*, DH, J*, B*, D*, G*, GX>
        {
          console.log((loopIndex + " RULE: <VOWEL> <VOICED CONSONANT> - increase vowel by 1/2 + 1"));
        }
        // decrease length
        var A$2 = getLength(loopIndex);
        setLength(loopIndex, (A$2 >> 2) + A$2 + 1); // 5/4*A + 1
        continue;
      }

      // WH, R*, L*, W*, Y*, M*, N*, NX, Q*, Z*, ZH, V*, DH, J*, B*, D*, G*, GX

      // nasal?
      if(phonemeHasFlag(phoneme, FLAG_NASAL)) {
        // RULE: <NASAL> <STOP CONSONANT>
        //       Set punctuation length to 6
        //       Set stop consonant length to 5

        // M*, N*, NX,
        phoneme = getPhoneme(++position$1);
        // is next phoneme a stop consonant?
        if (phoneme !== END && phonemeHasFlag(phoneme, FLAG_STOPCONS)) {
          // B*, D*, G*, GX, P*, T*, K*, KX
          {
            console.log((position$1 + " RULE: <NASAL> <STOP CONSONANT> - set nasal = 5, consonant = 6"));
          }
          setLength(position$1, 6); // set stop consonant length to 6
          setLength(position$1 - 1, 5); // set nasal length to 5
        }
        continue;
      }

      // WH, R*, L*, W*, Y*, Q*, Z*, ZH, V*, DH, J*, B*, D*, G*, GX

      // (voiced) stop consonant?
      if(phonemeHasFlag(phoneme, FLAG_STOPCONS)) {
        // B*, D*, G*, GX

        // RULE: <VOICED STOP CONSONANT> {optional silence} <STOP CONSONANT>
        //       Shorten both to (length/2 + 1)

        while ((phoneme = getPhoneme(++position$1)) === 0) { /* move past silence */ }
        // if another stop consonant, process.
        if (phoneme !== END && phonemeHasFlag(phoneme, FLAG_STOPCONS)) {
          // RULE: <UNVOICED STOP CONSONANT> {optional silence} <STOP CONSONANT>
          {
            console.log(
              (position$1 + " RULE: <UNVOICED STOP CONSONANT> {optional silence} <STOP CONSONANT> - shorten both to 1/2 + 1")
            );
          }
          setLength(position$1, (getLength(position$1) >> 1) + 1);
          setLength(loopIndex, (getLength(loopIndex) >> 1) + 1);
        }
        continue;
      }

      // WH, R*, L*, W*, Y*, Q*, Z*, ZH, V*, DH, J*, **,

      // liquic consonant?
      if ((position$1>0)
        && phonemeHasFlag(phoneme, FLAG_LIQUIC)
        && phonemeHasFlag(getPhoneme(position$1-1), FLAG_STOPCONS)) {
        // R*, L*, W*, Y*
        // RULE: <VOICED NON-VOWEL> <DIPTHONG>
        //       Decrease <DIPTHONG> by 2
        // prior phoneme is a stop consonant
        {
          console.log((position$1 + " RULE: <LIQUID CONSONANT> <DIPTHONG> - decrease by 2"));
        }
        // decrease the phoneme length by 2 frames (20 ms)
        setLength(position$1, getLength(position$1) - 2);
      }
    }
  }

  /**
   * Iterates through the phoneme buffer, copying the stress value from
   * the following phoneme under the following circumstance:
   *     1. The current phoneme is voiced, excluding plosives and fricatives
   *     2. The following phoneme is voiced, excluding plosives and fricatives, and
   *     3. The following phoneme is stressed
   *
   *  In those cases, the stress value+1 from the following phoneme is copied.
   *
   * For example, the word LOITER is represented as LOY5TER, with as stress
   * of 5 on the diphthong OY. This routine will copy the stress value of 6 (5+1)
   * to the L that precedes it.
   *
   * @param {getPhoneme}       getPhoneme Callback for retrieving phonemes.
   * @param {getPhonemeStress} getStress  Callback for retrieving phoneme stress.
   * @param {setPhonemeStress} setStress  Callback for setting phoneme stress.
   *
   * @return undefined
   */
  function CopyStress(getPhoneme, getStress, setStress) {
    // loop through all the phonemes to be output
    var position = 0;
    var phoneme;
    while((phoneme = getPhoneme(position)) !== END) {
      // if CONSONANT_FLAG set, skip - only vowels get stress
      if (phonemeHasFlag(phoneme, FLAG_CONSONANT)) {
        phoneme = getPhoneme(position + 1);
        // if the following phoneme is the end, or a vowel, skip
        if ((phoneme !== END) && phonemeHasFlag(phoneme, FLAG_VOWEL)) {
          // get the stress value at the next position
          var stress = getStress(position + 1);
          if ((stress !== 0) && (stress < 0x80)) {
            // if next phoneme is stressed, and a VOWEL OR ER
            // copy stress from next phoneme to this one
            setStress(position, stress + 1);
          }
        }
      }
      ++position;
    }
  }

  /**
   * change phoneme length dependent on stress
   *
   * @param {getPhoneme}    getPhoneme Callback for retrieving phonemes.
   * @param {getPhonemeStress} getStress  Callback for retrieving phoneme length.
   * @param {setPhonemeLength} setLength  Callback for setting phoneme length.
   *
   * @return undefined
   */
  function SetPhonemeLength(getPhoneme, getStress, setLength) {
    var position = 0;
    var phoneme;
    while((phoneme = getPhoneme(position)) !== END) {
      var stress = getStress(position);
      if ((stress === 0) || (stress > 0x7F)) {
        setLength(position, combinedPhonemeLengthTable[phoneme] & 0xFF);
      } else {
        setLength(position, (combinedPhonemeLengthTable[phoneme] >> 8));
      }
      position++;
    }
  }

  /**
   *
   * @param {getPhoneme}       getPhoneme    Callback for retrieving phonemes.
   * @param {setPhoneme}       setPhoneme    Callback for setting phonemes.
   * @param {insertPhoneme}    insertPhoneme Callback for inserting phonemes.
   * @param {setPhonemeStress} setStress     Callback for setting phoneme stress.
   * @param {getPhonemeLength} getLength     Callback for getting phoneme length.
   * @param {setPhonemeLength} setLength     Callback for setting phoneme length.
   *
   * @return undefined
   */
  function InsertBreath(getPhoneme, setPhoneme, insertPhoneme, setStress, getLength, setLength) {
    var mem54 = 255;
    var len = 0; // mem55
    var index; //variable Y
    var pos = -1;
    while((index = getPhoneme(++pos)) !== END) {
      len += getLength(pos);
      if (len < 232) {
        if (phonemeHasFlag(index, FLAG_PUNCT)) {
          len = 0;
          insertPhoneme(pos + 1, BREAK, 0, 0);
          continue;
        }
        if (index === 0) {
          mem54 = pos;
        }
        continue;
      }
      pos = mem54;
      setPhoneme(pos, 31); // 'Q*' glottal stop
      setLength(pos, 4);
      setStress(pos, 0);
      len = 0;
      insertPhoneme(pos + 1, BREAK, 0, 0);
    }
  }

  /**
   * Makes plosive stop consonants longer by inserting the next two following
   * phonemes from the table right behind the consonant.
   *
   * @param {getPhoneme}       getPhoneme Callback for retrieving phonemes.
   * @param {insertPhoneme}    insertPhoneme Callback for inserting phonemes.
   * @param {getPhonemeStress} getStress Callback for retrieving stress.
   *
   * @return undefined
   */
  function ProlongPlosiveStopConsonantsCode41240(getPhoneme, insertPhoneme, getStress) {
    var pos=-1;
    var index;
    while ((index = getPhoneme(++pos)) !== END) {
      // Not a stop consonant, move to next one.
      if (!phonemeHasFlag(index, FLAG_STOPCONS)) {
        continue;
      }
      //If plosive, move to next non empty phoneme and validate the flags.
      if (phonemeHasFlag(index, FLAG_PLOSIVE)) {
        var nextNonEmpty = (void 0);
        var X = pos;
        do { nextNonEmpty = getPhoneme(++X); } while (nextNonEmpty === 0);
        // If not END and either flag 0x0008 or '/H' or '/X'
        if ((nextNonEmpty !== END)
          && (
            phonemeHasFlag(nextNonEmpty, FLAG_0008)
            || (nextNonEmpty === 36)
            || (nextNonEmpty === 37))
        ) {
          continue;
        }
      }
      insertPhoneme(pos + 1, index + 1, getStress(pos), combinedPhonemeLengthTable[index + 1] & 0xFF);
      insertPhoneme(pos + 2, index + 2, getStress(pos), combinedPhonemeLengthTable[index + 2] & 0xFF);
      pos += 2;
    }
  }

  /**
   * Parses speech data.
   *
   * Returns array of [phoneme, length, stress]
   *
   * @param {string} input
   *
   * @return {Array|Boolean} The parsed data.
   */
  function Parser (input) {
    if (!input) {
      return false;
    }
    var getPhoneme = function (pos) {
      {
        if (pos < 0 || pos > phonemeindex.length) {
          throw new Error('Out of bounds: ' + pos)
        }
      }
      return (pos === phonemeindex.length - 1) ? END : phonemeindex[pos]
    };
    var setPhoneme = function (pos, value) {
      {
        console.log((pos + " CHANGE: " + (PhonemeNameTable[phonemeindex[pos]]) + " -> " + (PhonemeNameTable[value])));
      }
      phonemeindex[pos]  = value;
    };

    /**
     * @param {Number} pos         The position in the phoneme array to insert at.
     * @param {Number} value       The phoneme to insert.
     * @param {Number} stressValue The stress.
     * @param {Number} [length]    The (optional) phoneme length, if not given, length will be 0.
     *
     * @return {undefined}
     */
    var insertPhoneme = function (pos, value, stressValue, length) {
      {
        console.log((pos + " INSERT: " + (PhonemeNameTable[value])));
      }
      for(var i = phonemeindex.length - 1; i >= pos; i--) {
        phonemeindex[i+1]  = phonemeindex[i];
        phonemeLength[i+1] = getLength(i);
        stress[i+1]        = getStress(i);
      }
      phonemeindex[pos]  = value;
      phonemeLength[pos] = length | 0;
      stress[pos]        = stressValue;
    };
    var getStress = function (pos) { return stress[pos] | 0; };
    var setStress = function (pos, stressValue) {
      {
        console.log(
          (pos + " \"" + (PhonemeNameTable[phonemeindex[pos]]) + "\" SET STRESS: " + (stress[pos]) + " -> " + stressValue)
        );
      }
      stress[pos] = stressValue;
    };
    var getLength = function (pos) { return phonemeLength[pos] | 0; };
    var setLength = function (pos, length) {
      {
        console.log(
          (pos + " \"" + (PhonemeNameTable[phonemeindex[pos]]) + "\" SET LENGTH: " + (phonemeLength[pos]) + " -> " + length)
        );
        if ((length & 128) !== 0) {
          throw new Error('Got the flag 0x80, see CopyStress() and SetPhonemeLength() comments!');
        }
        if (pos<0 || pos>phonemeindex.length) {
          throw new Error('Out of bounds: ' + pos)
        }
      }
      phonemeLength[pos] = length;
    };

    var stress = []; //numbers from 0 to 8
    var phonemeLength = [];
    var phonemeindex = [];

    var pos = 0;
    Parser1(
      input,
      function (value) {
        stress[pos] = 0;
        phonemeLength[pos] = 0;
        phonemeindex[pos++] = value;
      },
      function (value) {
        {
          if ((value & 128) !== 0) {
            throw new Error('Got the flag 0x80, see CopyStress() and SetPhonemeLength() comments!');
          }
        }
        stress[pos - 1] = value; /* Set stress for prior phoneme */
      }
    );
    phonemeindex[pos] = END;

    {
      PrintPhonemes(phonemeindex, phonemeLength, stress);
    }
    Parser2(insertPhoneme, setPhoneme, getPhoneme, getStress);
    CopyStress(getPhoneme, getStress, setStress);
    SetPhonemeLength(getPhoneme, getStress, setLength);
    AdjustLengths(getPhoneme, setLength, getLength);
    ProlongPlosiveStopConsonantsCode41240(getPhoneme, insertPhoneme, getStress);

    for (var i = 0;i<phonemeindex.length;i++) {
      if (phonemeindex[i] > 80) {
        phonemeindex[i] = END;
        // FIXME: When will this ever be anything else than END?
        break; // error: delete all behind it
      }
    }

    InsertBreath(getPhoneme, setPhoneme, insertPhoneme, getStress, getLength, setLength);

    {
      PrintPhonemes(phonemeindex, phonemeLength, stress);
    }

    return phonemeindex.map(function (v, i) { return [v, phonemeLength[i] | 0, stress[i] | 0]; });
  }

  /**
   * Debug printing.
   *
   * @param {Array} phonemeindex
   * @param {Array} phonemeLength
   * @param {Array} stress
   *
   * @return undefined
   */
  function PrintPhonemes (phonemeindex, phonemeLength, stress) {
    function pad(num) {
      var s = '000' + num;
      return s.substr(s.length - 3);
    }

    console.log('==================================');
    console.log('Internal Phoneme presentation:');
    console.log(' pos  idx  phoneme  length  stress');
    console.log('----------------------------------');
    var loop = function ( i ) {
      var name = function (phoneme) {
        if (phonemeindex[i] < 81) {
          return PhonemeNameTable[phonemeindex[i]];
        }
        if (phoneme === BREAK) {
          return '  ';
        }
        return '??'
      };
      console.log(
        ' %s  %s  %s       %s     %s',
        pad(i),
        pad(phonemeindex[i]),
        name(phonemeindex[i]),
        pad(phonemeLength[i]),
        pad(stress[i])
      );
    };

    for (var i=0;i<phonemeindex.length;i++) loop( i );
    console.log('==================================');
  }

  return Parser;

})));
