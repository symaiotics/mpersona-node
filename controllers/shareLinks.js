const ApiError = require('../error/ApiError');

//Base level Schemas
const Persona = require('../models/Persona');
const Roster = require('../models/Roster');
const WorkStream = require('../models/WorkStream');

//In V1, these Knowledge Mapping schemas are separated. Will be merged in V2
const Artifact = require('../models/knowledgeMapping/Artifact');
const Category = require('../models/knowledgeMapping/Category');
const Document = require('../models/knowledgeMapping/Document');
const KnowledgeSet = require('../models/knowledgeMapping/KnowledgeSet');
const Mapping = require('../models/knowledgeMapping/Mapping');
const Segment = require('../models/knowledgeMapping/Segment');
const Tag = require('../models/knowledgeMapping/Tag');

const schemas = {
    //Base schemas
    personas: Persona,
    rosters: Roster,
    workStreams: WorkStream,

    //Knowledge Mapping schemas
    artifacts: Artifact,
    categories: Category,
    documents: Document,
    knowledgeSets: KnowledgeSet,
    segment: Segment,
    mappings: Mapping,
    tags: Tag
};

exports.addLink = async function (req, res, next) {
    try {
        const username = req.tokenDecoded ? req.tokenDecoded.username : null;
        const schemaName = req.body.schema || req.query.schema || "";
        const uuid = req.body.uuid || req.query.uuid || "";
        const link = req.body.link || req.query.link || "";
        const linkType = req.body.linkType || req.query.linkType || "";

        if (!username || !schemas[schemaName]) {
            throw ApiError.badRequest("Invalid request");
        }

        const isAdmin = req.tokenDecoded.roles.includes('admin');
        const update = {};
        if (linkType === 'editorLink') {
            update.editorLink = link;
        } else if (linkType === 'viewerLink') {
            update.viewerLink = link;
        } else {
            throw ApiError.badRequest("Invalid linkType");
        }

        const query = {
            uuid: uuid,
            $or: [
                { editors: username },
                { owners: username }
            ]
        };

        const updatedDocument = await schemas[schemaName].updateOne(query, update);

        if (updatedDocument.modifiedCount === 0) {
            throw ApiError.badRequest("Unable to update. Ensure you have the right permissions.");
        }

        res.status(200).json({
            message: "Link Added",
            payload: updatedDocument
        });

    } catch (error) {
        next(error);
    }
};

exports.linkDetails = async function (req, res, next) {
    try {
        const schemaName = req.body.schema || req.query.schema || "";
        const link = req.body.link || req.query.link || "";


        if (!schemas[schemaName]) {
            throw ApiError.badRequest("Invalid schema");
        }


        let document = await schemas[schemaName].findOne({ $or: [{ editorLink: link }, { viewerLink: link }] })
            .select('name description url editorLink viewerLink');

        if (document) {
            document = document.toObject();
            document.isEditor = document.editorLink === link;
            document.isViewer = document.viewerLink === link;
            delete document.editorLink;
            delete document.viewerLink;

            res.status(200).json({
                message: "Here are the details",
                payload: document
            });
        } else {
            throw ApiError.badRequest("Document not found");
        }
    } catch (error) {
        next(error);
    }
};

exports.acceptLink = async function (req, res, next) {
    try {
        const schemaName = req.body.schema || req.query.schema || "";
        const link = req.body.link || req.query.link || "";
        const username = req.tokenDecoded ? req.tokenDecoded.username : null;

        if (!username || !schemas[schemaName]) {
            throw ApiError.badRequest("Invalid request");
        }

        const document = await schemas[schemaName].findOne({ $or: [{ editorLink: link }, { viewerLink: link }] })
            .select('editorLink viewerLink');

        if (!document) {
            throw ApiError.badRequest("Document not found");
        }

        const update = {};
        if (document.editorLink === link) {
            update.$addToSet = { editors: username };
        } else if (document.viewerLink === link) {
            update.$addToSet = { viewers: username };
        }

        await schemas[schemaName].updateOne({ _id: document._id }, update);

        res.status(200).json({
            message: "Link accepted"
        });


    } catch (error) {
        next(error);
    }
};

exports.removeLink = async function (req, res, next) {
    try {
        const username = req.tokenDecoded ? req.tokenDecoded.username : null;
        const schemaName = req.body.schema || req.query.schema || "";
        const uuid = req.body.uuid || req.query.uuid || "";
        const linkType = req.body.linkType || req.query.linkType || "";


        if (!username || !schemas[schemaName]) {
            throw ApiError.badRequest("Invalid request");
        }

        let update;
        if (linkType === 'editorLink') {
            update = { $pull: { editors: username } };
        } else if (linkType === 'viewerLink') {
            update = { $pull: { viewers: username } };
        } else {
            throw ApiError.badRequest("Invalid linkType");
        }

        const query = { uuid: uuid };
        const updatedDocument = await schemas[schemaName].updateOne(query, update);

        if (updatedDocument.modifiedCount === 0) {
            throw ApiError.badRequest("Unable to update. User may not be in the specified role.");
        }

        res.status(200).json({
            message: "Link removed",
            payload: updatedDocument
        });

    } catch (error) {
        next(error);
    }
};
