const stream = require('stream');
const ndarray = require('ndarray');
const { GifReader } = require('omggif');
const superagent = require('superagent');
const savePixels = require('save-pixels');
const { Base64Encode } = require('base64-stream');

const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min) + min);

const processGif = async url => {
  try {
    const res = await superagent.get(url);
    const buffer = new Buffer(res.body);

    const reader = new GifReader(buffer);

    const numFrames = reader.numFrames();

    const frameNumber = getRandomNumber(numFrames === 1 ? 0 : 1, Math.min(numFrames, 50));

    const nshape = [frameNumber + 1, reader.height, reader.width, 4];
    const ndata = new Uint8Array(nshape[0] * nshape[1] * nshape[2] * nshape[3]);
    let result = ndarray(ndata, nshape);

    for(var i = 0; i < frameNumber + 1; ++i) {
      reader.decodeAndBlitFrameRGBA(i, ndata.subarray(
        result.index(i, 0, 0, 0),
        result.index(i+1, 0, 0, 0)))
    }

    result = result.transpose(0, 2, 1);
    const streamData = savePixels(result.pick(frameNumber), 'jpg');

    const base64 = await new Promise((resolve, reject) => {
      streamData.pipe(new Base64Encode()).pipe(new Base64Stream(resolve, reject));
    });

    return base64;
  } catch (err) {
    console.log(err);
  }

  return null;
};

class Base64Stream extends stream.Writable {
  constructor(resolve) {
    super();
    this.resolve = resolve;
    this.chunk = '';
  }
  _write(chunk, _, next) {
    this.chunk += chunk;
    next();
  }

  end() {
    this.resolve(this.chunk);
  }
}

module.exports = processGif;