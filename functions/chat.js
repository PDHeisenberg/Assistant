const { OpenAI } = require('openai');
const { ElevenLabs } = require("elevenlabs-node");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const ASSISTANT_ID = process.env.ASSISTANT_ID;

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { message } = JSON.parse(event.body);
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });
    let runStatus;
    do {
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } while (runStatus.status !== "completed");
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastAssistantMessage = messages.data
      .filter(message => message.role === "assistant")
      .pop();

    // Generate text-to-speech audio
    const voice = new ElevenLabs({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
    const audioStream = await voice.textToSpeech("eleven_monolingual_v1", {
      text: lastAssistantMessage.content[0].text.value,
      voice_id: "21m00Tcm4TlvDq8ikWAM", // You can change this to your preferred voice ID
      model_id: "eleven_monolingual_v1",
    });
    const audioBuffer = await streamToBuffer(audioStream);
    const base64Audio = audioBuffer.toString('base64');

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        reply: lastAssistantMessage.content[0].text.value,
        audio: base64Audio
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An error occurred while processing your request.' })
    };
  }
};

// Helper function to convert stream to buffer
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
