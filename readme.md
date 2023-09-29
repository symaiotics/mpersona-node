# mPersona
mPersona is a tool to build custom personas to facilitate interaction with Large Language Model services like Open AI's GPT4.

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
- AZURE_STORAGE_CONNECTION_STRING = //Your Azure Storage connection string (not key)

The storage account requires a container named /images to be created and publicly accessible as read only.


## mPersona License Agreement

This software is provided "as is," without warranty of any kind, express or implied. In no event shall the author be held liable for any damages arising from the use of the software.

1. Definitions:
   "Organization" refers to a legal entity, excluding individuals.

2. Grant of License:
   Subject to the terms and conditions of this License, Symaiotics Corporation grants to you a non-exclusive, non-transferable license to use the software.

3. Restrictions:
   - You may not use this software for commercial purposes if you are part of an Organization with more than 100 people.
   - You may not distribute, sublicense, lease, rent, sell, or otherwise transfer the software or any of its components to any third party.
   - You may not modify, decompile, disassemble, or reverse engineer the software.

4. Termination:
   This License is effective until terminated. Your rights under this License will terminate automatically without notice from Symaiotics Corporation if you fail to comply with any term(s) of this License.

5. Governing Law:
   This License will be governed by and construed in accordance with the laws of Ontario, Canada, excluding its conflict of law principles.

6. Miscellaneous:
   If any provision of this License is held to be unenforceable, that provision will be removed, and the remaining provisions will remain in full force.

END OF LICENSE
