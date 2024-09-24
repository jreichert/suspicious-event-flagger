import fs from "fs";
import readline from "readline";

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

// Usage example
// const processLine = async (jsonObject) => {
//   console.log("Processing:", jsonObject);
//   // Perform any per-line processing here if needed
// };

// const processBuffer = async (bufferArray) => {
//   console.log(`Processing buffer of ${bufferArray.length} items`);
//   // Process the buffer array here
//   // For example:
//   // await someAsyncOperation(bufferArray);
// };

// const filePath = "../misc/events.jsonl";
// const bufferSize = 10; // Adjust this value as needed

// processJSONL(filePath, bufferSize, processLine, processBuffer);
