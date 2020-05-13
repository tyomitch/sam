import { assert } from 'chai'
import loadFixture from '../fixture-reader.js';
import Renderer from './c-conv/renderer.es6';

process.env.NODE_ENV = 'karma-test';

describe('c-conv/renderer.es6', () => {
  ['tests-1.json'].forEach((file) => {
    describe(`#c-conv/renderer.es6(${file})`, () => {
      loadFixture('renderer/fixtures/' + file).forEach((value) => {
        describe(`#Renderer()`, () => {
          it(`should render: "${value.input}".`, () => {
            const phonemeindex = new Uint8Array(256);
            const phonemeLength = new Uint8Array(256);
            const stress = new Uint8Array(256);
            for (let i=0;i<value.output.length;i++) {
              phonemeindex[i] = value.output[i];
              phonemeLength[i] = value.length[i];
              stress[i] = value.stress[i];
            }
            phonemeindex[value.output.length] = 255; // END

            const result = Renderer(phonemeindex, phonemeLength, stress);
            assert.notEqual(result, false, 'Renderer did not succeed');

            const output = Renderer.karmaOutput;

            assert.deepEqual([].slice.call(output.freq1data).slice(0, 80), value.freq1data, "freq1data mismatch");
            assert.deepEqual([].slice.call(output.freq2data).slice(0, 80), value.freq2data, "freq2data mismatch");
            assert.deepEqual([].slice.call(output.freq3data).slice(0, 80), value.freq3data, "freq3data mismatch");

            // Seek first empty line in result.
            let p1;
            for (p1 = 0; p1 < output.sampledConsonantFlag.length; p1++) {
              if (!output.pitches[p1]
                && !output.sampledConsonantFlag[p1]
                && !output.frequency1[p1]
                && !output.frequency2[p1]
                && !output.frequency3[p1]
                && !output.amplitude1[p1]
                && !output.amplitude2[p1]
                && !output.amplitude3[p1]
              ) break;
            }

            assert.equal(p1, value.pitches.length, 'Length mismatch');
            assert.deepEqual(
              [].slice.call(output.pitches).slice(0, p1),
              value.pitches,
              "pitches mismatch"
            );
            assert.deepEqual(
              [].slice.call(output.sampledConsonantFlag).slice(0, p1),
              value.sampledConsonantFlag,
              "sampledConsonantFlag mismatch"
            );
            assert.deepEqual(
              [].slice.call(output.frequency1).slice(0, p1),
              value.frequency1,
              "frequency1 mismatch"
            );
            assert.deepEqual(
              [].slice.call(output.frequency2).slice(0, p1),
              value.frequency2,
              "frequency2 mismatch"
            );
            assert.deepEqual(
              [].slice.call(output.frequency3).slice(0, p1),
              value.frequency3,
              "frequency3 mismatch"
            );
            assert.deepEqual(
              [].slice.call(output.amplitude1).slice(0, p1),
              value.amplitude1,
              "amplitude1 mismatch"
            );
            assert.deepEqual(
              [].slice.call(output.amplitude2).slice(0, p1),
              value.amplitude2,
              "amplitude2 mismatch"
            );
            assert.deepEqual(
              [].slice.call(output.amplitude3).slice(0, p1),
              value.amplitude3,
              "amplitude3 mismatch"
            );
          });
        });
      });
    });
  });
});
