const multer = require('multer');


//If using memory storage
/*
const storage = multer.memoryStorage() // Use memoryStorage to store the file in memory; it will be passed to Azure SDK for upload.
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // Set a file size limit of 100MB
        files: 1000 // Set a limit of 1000 files
    }
});
*/

//If using disk storage, required by mammoth and pdf-parse
const storage = multer.diskStorage({
    limits: {
        fileSize: 100 * 1024 * 1024, // Set a file size limit of 100MB
        files: 1000 // Set a limit of 1000 files
    },
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

module.exports = upload;