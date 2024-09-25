import fs from "fs";
import readline from "readline";

/**
 * Buffer every line of a JSONL file and perform an operation on the buffers.
 * For this project, this is used for reading lines of the sample data in chunks
 * and then processing those chunks with event_analyzer.js.
 *
 * @param {String} filePath The path to the file to parse
 * @param {int} bufferSize The number of lines to buffer before processing
 * @param {String} lineProcessor A call back used to process a line before
 *   adding it o the buffer (currently unused)
 * @param {String} bufferCallback The function to send the buffer to after
 *   it is full
 */
export const processJSONL = (
  filePath,
  bufferSize,
  lineProcessor,
  bufferCallback
) => {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let buffer = [];

  const processBuffer = async () => {
    if (buffer.length > 0) {
      const currentBuffer = [...buffer];
      buffer = [];
      await bufferCallback(currentBuffer);
    }
  };

  rl.on("line", async (line) => {
    if (line.trim()) {
      try {
        const jsonObject = JSON.parse(line);
        // await lineProcessor(jsonObject);
        buffer.push(jsonObject);

        if (buffer.length >= bufferSize) {
          await processBuffer();
        }
      } catch (error) {
        console.error("Error parsing JSON line:", error);
      }
    }
  });

  rl.on("close", async () => {
    await processBuffer(); // Process any remaining items in the buffer
    console.log("Finished processing JSONL file");
  });
};
