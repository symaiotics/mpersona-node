# mPersona
mPersona is a MIT licensed took to build custom personas to facilitate  interaction with Large Language Model services like Open AI's GPT4.

## About
mPersona is built in 2 parts, a Vue.js web interface and a Node.js server side application (this package).
The Node.js application uses the following key libraries
- bcrypt for JWT cryptography functions
- cors and helmet for web security
- dotenv for configuration
- jsonwebtoken for creating session tokens
- mongoDB and Mongoose ODM to persist models into a MongoDB or Azure CosmosDB (Mongo Driver) database
- openai to faclitate the OpenAI API connection
- ws for realtime websockets to facilitate token streams to the ui


## Configuration
The application also requires environment variables to operate

- MODE=DEV  //The default mode for testing, which is DEV
- PORT=3000 //The default port
- DATASTORE=MongoDB //The default  datastore
- TIMEOUT=  //The timeout by which a Promise will fail (i.e. 30000 is 30 seconds)
- JWT_SECRET= //A secret for signing JWT tokens
- MPERSONA_ATLAS= //A connection string to a valid MongoDB instance. I recommend using an Atlas instance
- OPEN_API_KEY= //Your API key to interact with your own instance of OpenAI's API

## License
Licensed under MIT. ALl private and commercial uses applicable.

