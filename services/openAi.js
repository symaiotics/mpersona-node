// //Open AI
// const { Configuration, OpenAIApi } = require("openai");
// const configuration = new Configuration({
//     apiKey: process.env.OPENAI_API_KEY,
// });
// const openai = new OpenAIApi(configuration);

// //Execute an OpenAI prompt
// async function prompt(uuid, session, model, temperature, systemPrompt, userPrompt) {
//     try {
//         var messages = [
//             {
//                 role: "user",
//                 content: userPrompt
//             }
//         ];

//         //Add in the system prompt, if one is provided
//         if (systemPrompt) {
//             messages.push(
//                 {

//                     role: "system",
//                     content: systemPrompt
//                 }
//             )
//         }

//         var fullPrompt = {
//             model: model,
//             messages: messages,
//             temperature: parseFloat(temperature) || 0.5,
//             stream: true,
//         }

//         const responseStream = await openai.createChatCompletion(fullPrompt, { responseType: 'stream' });

//         responseStream.data.on('data', data => {

//             const lines = data.toString().split('\n').filter(line => line.trim() !== '');
//             for (const line of lines) {
//                 const message = line.replace(/^data: /, '');
//                 if (message === '[DONE]') {
//                     //Send EOM back to the client
//                     sendToClient(uuid, session, "EOM", null)
//                 }
//                 else {
//                     try {
//                         const parsed = JSON.parse(message).choices?.[0]?.delta?.content;
//                         if (parsed && parsed !== null && parsed !== 'null' && parsed !== 'undefined' && parsed !== undefined) {
//                             //Send the fragment back to the correct client
//                             console.log(parsed)
//                             sendToClient(uuid, session, "message", parsed)
//                         }

//                     } catch (error) {
//                         //Send error back to the client
//                         sendToClient(uuid, session, "error", error)
//                         console.error('Could not JSON parse stream message', message, error);
//                     }
//                 }
//             }
//         });
//     }
//     catch (error) {
//         console.log("Error", error)
//         res.status(500).send({ message: "Prompt failure", payload: error })
//     }
// }

// module.exports = {
//     prompt
// };