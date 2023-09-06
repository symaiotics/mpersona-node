const fs = require('fs');
const path = require('path');

const { BlobServiceClient } = require('@azure/storage-blob');
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

async function uploadToAzure(file, containerName) {
    // const filePath = path.join(__dirname, file.path); // Adjust the path if necessary
    // const filePath = path.join(__dirname, file.path);
    const filePath = path.join(process.cwd(), file.path);
    
    
    // Read the file to get its buffer

    console.log("fs.fileread", filePath)
    fs.readFile(filePath, async (err, buffer) => {
        if (err) {
            console.log("error", err)
            // return res.status(500).send({ message: 'Failed to read the file', error: err });
        }

        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(file.filename); // Using the filename as blob name
        const blockBlobClient = blobClient.getBlockBlobClient();

        try {
            const uploadResponse = await blockBlobClient.uploadData(buffer);

            // Once the file is uploaded to Azure, you can delete it from local storage
            // fs.unlink(filePath, (err) => {
            //     if (err) {
            //         console.error('Failed to delete the local file', err);
            //     }
            // });
            return uploadResponse;
        } catch (error) {
            console.log("Error", error)
            return error;
        }

    })
}

module.exports = {
    uploadToAzure
};
